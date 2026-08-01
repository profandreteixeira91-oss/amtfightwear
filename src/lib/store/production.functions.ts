import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProductionJob = {
  id: string;
  source: "order" | "quote" | "manual";
  source_id: string | null;
  source_item_key: string | null;
  reference: string | null;
  customer_name: string | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  quantity: number;
  status: "queued" | "in_production" | "paused" | "done" | "cancelled";
  priority: number;
  deadline: string | null;
  assignee: string | null;
  notes: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const CANCELLED_ORDER_STATUS = ["cancelled", "canceled", "refunded"];

/** Lista a fila de produção na ordem de inclusão (com prioridade manual). */
export const adminListProductionJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductionJob[]> => {
    const { data, error } = await context.supabase
      .from("store_production_jobs")
      .select("*")
      .order("priority", { ascending: false })
      .order("queued_at", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ ...r, quantity: Number(r.quantity ?? 0) })) as ProductionJob[];
  });

/** Importa itens de pedidos da loja e de orçamentos aprovados que ainda não estão na fila. */
export const adminSyncProductionQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: existing, error: exErr } = await supabase
      .from("store_production_jobs")
      .select("source, source_id, source_item_key")
      .limit(5000);
    if (exErr) throw new Error(exErr.message);
    const seen = new Set(
      (existing ?? []).map((r) => `${r.source}:${r.source_id}:${r.source_item_key}`),
    );

    type Insert = {
      source: "order" | "quote";
      source_id: string;
      source_item_key: string;
      reference: string | null;
      customer_name: string | null;
      product_name: string;
      variant_label: string | null;
      sku: string | null;
      image_url: string | null;
      quantity: number;
      queued_at: string;
      custom_config: unknown | null;
    };
    const rows: Insert[] = [];

    // ---- Pedidos da loja ----
    const { data: orders, error: oErr } = await supabase
      .from("store_orders")
      .select("id, order_number, customer_name, status, created_at")
      .order("created_at", { ascending: true })
      .limit(500);
    if (oErr) throw new Error(oErr.message);
    const validOrders = (orders ?? []).filter(
      (o) => !CANCELLED_ORDER_STATUS.includes(String(o.status ?? "").toLowerCase()),
    );
    if (validOrders.length > 0) {
      const { data: items, error: iErr } = await supabase
        .from("store_order_items")
        .select("id, order_id, product_name, variant_label, sku, image_url, quantity, custom_config")
        .in(
          "order_id",
          validOrders.map((o) => o.id),
        )
        .limit(5000);
      if (iErr) throw new Error(iErr.message);
      const byId = new Map(validOrders.map((o) => [o.id, o]));
      for (const it of items ?? []) {
        const order = byId.get(it.order_id);
        if (!order) continue;
        if (seen.has(`order:${it.order_id}:${it.id}`)) continue;
        rows.push({
          source: "order",
          source_id: it.order_id,
          source_item_key: it.id,
          reference: order.order_number ?? null,
          customer_name: order.customer_name ?? null,
          product_name: it.product_name ?? "Item do pedido",
          variant_label: it.variant_label ?? null,
          sku: it.sku ?? null,
          image_url: it.image_url ?? null,
          quantity: Number(it.quantity ?? 1),
          queued_at: order.created_at ?? new Date().toISOString(),
          custom_config: it.custom_config ?? null,
        });
      }
    }

    // ---- Orçamentos aprovados ----
    const { data: quotes, error: qErr } = await supabase
      .from("store_quotes")
      .select("id, quote_number, customer_name, customer_company, items, status, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(500);
    if (qErr) throw new Error(qErr.message);
    for (const q of quotes ?? []) {
      const items = Array.isArray(q.items) ? (q.items as Record<string, unknown>[]) : [];
      items.forEach((it, idx) => {
        const key = `${idx}`;
        if (seen.has(`quote:${q.id}:${key}`)) return;
        rows.push({
          source: "quote",
          source_id: q.id,
          source_item_key: key,
          reference: q.quote_number ?? null,
          customer_name: (q.customer_company as string) || q.customer_name || null,
          product_name: String(it["name"] ?? "Item do orçamento"),
          variant_label: (it["description"] as string) ?? null,
          sku: (it["sku"] as string) ?? null,
          image_url: (it["image_url"] as string) ?? null,
          quantity: Number(it["quantity"] ?? 1),
          queued_at: q.created_at ?? new Date().toISOString(),
          custom_config: null,
        });
      });
    }

    if (rows.length === 0) return { ok: true, inserted: 0 };

    const { error } = await supabase.from("store_production_jobs").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "in_production", "paused", "done", "cancelled"]).optional(),
  deadline: z.string().trim().max(20).nullable().optional(),
  assignee: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  priority: z.number().int().min(-100).max(100).optional(),
  quantity: z.number().min(0).max(1000000).optional(),
});

export const adminUpdateProductionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => patchSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };
    if (patch.deadline === "") update["deadline"] = null;
    if (patch.status === "in_production") update["started_at"] = new Date().toISOString();
    if (patch.status === "done") update["completed_at"] = new Date().toISOString();
    if (patch.status === "queued") {
      update["started_at"] = null;
      update["completed_at"] = null;
    }
    const { error } = await context.supabase.from("store_production_jobs").update(update).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkUpdateProductionJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(2000),
        status: z.enum(["queued", "in_production", "paused", "done", "cancelled"]).optional(),
        deadline: z.string().trim().max(20).nullable().optional(),
        assignee: z.string().trim().max(160).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const update: Record<string, unknown> = {};
    if (data.status) update["status"] = data.status;
    if (data.deadline !== undefined) update["deadline"] = data.deadline || null;
    if (data.assignee !== undefined) update["assignee"] = data.assignee || null;
    if (Object.keys(update).length === 0) return { ok: true, updated: 0 };
    const { error } = await context.supabase
      .from("store_production_jobs")
      .update(update)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.ids.length };
  });

export const adminDeleteProductionJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_production_jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
