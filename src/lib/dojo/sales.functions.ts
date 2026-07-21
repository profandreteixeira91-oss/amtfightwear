// Módulo Vendas — catálogo de produtos/serviços e registro de vendas.
// Cobranças integradas ao AMT Pay via `syncInvoiceWithAsaas` (mesma infra
// das mensalidades). Vendas para alunos com método de gateway geram uma
// fatura em `dojo_invoices`; vendas em dinheiro/pix manual são marcadas
// como pagas na hora.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// ============ CATÁLOGO ============

export const listSalesProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_sales_products")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveSalesProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        kind: z.enum(["product", "service"]).default("product"),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).nullable().optional(),
        sku: z.string().max(80).nullable().optional(),
        price: z.number().min(0),
        cost: z.number().min(0).nullable().optional(),
        stock: z.number().int().nullable().optional(),
        track_stock: z.boolean().optional(),
        active: z.boolean().optional(),
        image_url: z.string().url().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase
        .from("dojo_sales_products")
        .update(rest as never)
        .eq("id", id)
        .eq("owner_id", context.userId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const payload = { ...rest, owner_id: context.userId };
    const { data: row, error } = await context.supabase
      .from("dojo_sales_products")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const deleteSalesProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_sales_products")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ VENDAS ============

const GATEWAY_METHODS = new Set(["pix", "boleto", "credit_card", "debit_card", "payment_link"]);
const DIRECT_METHODS = new Set(["cash", "manual", "pix_direct", "debit_direct", "credit_direct"]);

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_sales")
      .select("*, student:dojo_students(id, full_name), items:dojo_sale_items(*)")
      .eq("owner_id", context.userId)
      .order("sold_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_sales")
      .select("*, student:dojo_students(id, full_name, email), items:dojo_sale_items(*)")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const saleItemInput = z.object({
  product_id: uuid.nullable().optional(),
  name: z.string().min(1).max(200),
  kind: z.enum(["product", "service"]).default("product"),
  quantity: z.number().min(0.001),
  unit_price: z.number().min(0),
});

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: uuid.nullable().optional(),
        customer_name: z.string().max(200).nullable().optional(),
        customer_document: z.string().max(40).nullable().optional(),
        discount: z.number().min(0).default(0),
        payment_method: z
          .enum([
            "cash",
            "pix",
            "boleto",
            "credit_card",
            "debit_card",
            "payment_link",
            "manual",
            "pix_direct",
            "debit_direct",
            "credit_direct",
          ])
          .default("cash"),
        due_date: z.string().optional(), // yyyy-mm-dd para gateway
        notes: z.string().max(1000).nullable().optional(),
        items: z.array(saleItemInput).min(1, "Adicione ao menos um item"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const subtotal = data.items.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
    const total = Math.max(0, subtotal - (data.discount ?? 0));
    if (total <= 0 && GATEWAY_METHODS.has(data.payment_method)) {
      throw new Error("Total inválido para cobrança pelo gateway.");
    }

    // Se for método gateway, exige aluno + gera fatura AMT Pay
    let invoice_id: string | null = null;
    let payment_link: string | null = null;
    let status: "paid" | "pending" = DIRECT_METHODS.has(data.payment_method) ? "paid" : "pending";

    if (GATEWAY_METHODS.has(data.payment_method)) {
      if (!data.student_id) throw new Error("Selecione o aluno para cobrar pelo AMT Pay.");
      const due = data.due_date ?? new Date().toISOString().slice(0, 10);
      const description = `Venda — ${data.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`.slice(0, 400);
      const invPayload: any = {
        id: crypto.randomUUID(),
        student_id: data.student_id,
        description,
        amount: total,
        due_date: due,
        status: "pending",
        owner_id: context.userId,
      };
      const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
      try {
        const asaasData = await syncInvoiceWithAsaas(context.supabase as any, invPayload);
        Object.assign(invPayload, asaasData);
      } catch (e: any) {
        throw new Error(`Falha ao criar cobrança no AMT Pay: ${e.message}`);
      }
      const { data: inv, error: invErr } = await context.supabase
        .from("dojo_invoices")
        .insert(invPayload as never)
        .select("id, payment_link")
        .single();
      if (invErr) throw new Error(invErr.message);
      invoice_id = (inv as any).id;
      payment_link = (inv as any).payment_link ?? invPayload.payment_link ?? null;
      status = "pending";
    }

    const { data: sale, error: saleErr } = await context.supabase
      .from("dojo_sales")
      .insert({
        owner_id: context.userId,
        student_id: data.student_id ?? null,
        customer_name: data.customer_name ?? null,
        customer_document: data.customer_document ?? null,
        subtotal,
        discount: data.discount ?? 0,
        total,
        payment_method: data.payment_method,
        status,
        invoice_id,
        payment_link,
        notes: data.notes ?? null,
      } as never)
      .select("id")
      .single();
    if (saleErr) throw new Error(saleErr.message);
    const saleId = (sale as { id: string }).id;

    const itemsPayload = data.items.map((it) => ({
      sale_id: saleId,
      product_id: it.product_id ?? null,
      name: it.name,
      kind: it.kind,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.quantity * it.unit_price,
    }));
    const { error: itemsErr } = await context.supabase
      .from("dojo_sale_items")
      .insert(itemsPayload as never);
    if (itemsErr) throw new Error(itemsErr.message);

    // Baixa de estoque (best-effort) para produtos com track_stock
    for (const it of data.items) {
      if (!it.product_id) continue;
      const { data: p } = await context.supabase
        .from("dojo_sales_products")
        .select("id, track_stock, stock")
        .eq("id", it.product_id)
        .maybeSingle();
      if (p && (p as any).track_stock && (p as any).stock != null) {
        const newStock = Number((p as any).stock) - Number(it.quantity);
        await context.supabase
          .from("dojo_sales_products")
          .update({ stock: newStock } as never)
          .eq("id", it.product_id);
      }
    }

    return { id: saleId, invoice_id, payment_link, status };
  });

export const updateSaleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["draft", "pending", "paid", "canceled"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_sales")
      .update({ status: data.status } as never)
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_sales")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStudentsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_students")
      .select("id, full_name, email")
      .eq("owner_id", context.userId)
      .order("full_name", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
