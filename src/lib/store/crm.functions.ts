import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStoreOwner } from "@/lib/auth/owner-middleware";
import { CUSTOMER_TAGS, DEAL_STAGE_IDS } from "@/lib/store/crm";

/**
 * CRM da loja: cadastro único de clientes (public.customers) e oportunidades
 * (public.crm_deals). Pedidos, orçamentos e chats são ligados ao cliente pelos
 * gatilhos do banco (migration 20261104120000); aqui só lemos e editamos.
 */

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

const CUSTOMER_COLUMNS =
  "id, full_name, company, email, phone, phone_normalized, email_normalized, document, city, state, origin, segment, tags, potential, notes, needs_review, orders_count, total_spent, quotes_count, first_order_at, last_order_at, last_contact_at, created_at, updated_at";

export type CrmCustomer = {
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  email_normalized: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  origin: string | null;
  segment: string;
  tags: string[];
  potential: string | null;
  notes: string | null;
  needs_review: boolean;
  orders_count: number;
  total_spent: number;
  quotes_count: number;
  first_order_at: string | null;
  last_order_at: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmDeal = {
  id: string;
  title: string;
  customer_id: string | null;
  stage: string;
  value: number;
  quantity: number | null;
  product_interest: string | null;
  origin: string | null;
  next_action: string | null;
  next_action_at: string | null;
  lost_reason: string | null;
  quote_id: string | null;
  order_id: string | null;
  notes: string | null;
  stage_changed_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

const DEAL_COLUMNS =
  "id, title, customer_id, stage, value, quantity, product_interest, origin, next_action, next_action_at, lost_reason, quote_id, order_id, notes, stage_changed_at, closed_at, created_at, updated_at";

/** Erro de telefone já usado por outro cliente (índice único do telefone normalizado). */
function friendly(error: { message: string; code?: string }): Error {
  if (error.code === "23505" || /customers_phone_normalized_key/.test(error.message)) {
    return new Error("Este telefone já pertence a outro cliente. Use \"Juntar clientes\" na ficha dele.");
  }
  return new Error(error.message);
}

/* ------------------------------- Clientes ------------------------------- */

export const adminCrmListCustomers = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async () => {
    const sb = await db();
    const [{ data, error }, { data: deals, error: dErr }] = await Promise.all([
      sb.from("customers").select(CUSTOMER_COLUMNS).order("last_contact_at", { ascending: false, nullsFirst: false }).limit(5000),
      sb.from("crm_deals").select("customer_id, stage"),
    ]);
    if (error) throw new Error(error.message);
    if (dErr) throw new Error(dErr.message);
    const openDeals = new Map<string, number>();
    for (const d of deals ?? []) {
      if (!d.customer_id || d.stage === "ganho" || d.stage === "perdido") continue;
      openDeals.set(d.customer_id, (openDeals.get(d.customer_id) ?? 0) + 1);
    }
    return (data ?? []).map((c) => ({ ...(c as CrmCustomer), open_deals: openDeals.get(c.id) ?? 0 }));
  });

export const adminCrmCustomerProfile = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: customer, error } = await sb.from("customers").select(CUSTOMER_COLUMNS).eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!customer) throw new Error("Cliente não encontrado.");
    const [orders, quotes, chats, deals] = await Promise.all([
      sb
        .from("store_orders")
        .select("id, order_number, status, payment_status, total, created_at, shipping_tracking")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      sb
        .from("store_quotes")
        .select("id, quote_number, status, total, items, created_at, updated_at, valid_until")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      sb
        .from("sales_conversations")
        .select("id, channel, status, last_message_at, created_at")
        .eq("customer_id", data.id)
        .order("last_message_at", { ascending: false }),
      sb.from("crm_deals").select(DEAL_COLUMNS).eq("customer_id", data.id).order("created_at", { ascending: false }),
    ]);
    for (const r of [orders, quotes, chats, deals]) if (r.error) throw new Error(r.error.message);

    // Produtos de interesse: o que comprou (pedidos pagos) e o que orçou.
    const interest = new Map<string, { name: string; bought: number; quoted: number }>();
    const add = (name: string, qty: number, kind: "bought" | "quoted") => {
      const key = name.replace(/\s+[—-]\s+(LINHA\s+\w+|Tam\..*)$/i, "").trim();
      const cur = interest.get(key) ?? { name: key, bought: 0, quoted: 0 };
      cur[kind] += qty;
      interest.set(key, cur);
    };
    const paidIds = (orders.data ?? []).filter((o) => o.payment_status === "paid").map((o) => o.id);
    if (paidIds.length) {
      const { data: items, error: iErr } = await sb.from("store_order_items").select("product_name, quantity").in("order_id", paidIds);
      if (iErr) throw new Error(iErr.message);
      for (const it of items ?? []) add(it.product_name ?? "Item", Number(it.quantity ?? 1), "bought");
    }
    for (const q of quotes.data ?? []) {
      if (q.status === "draft") continue;
      for (const it of (Array.isArray(q.items) ? q.items : []) as Array<{ name?: string; quantity?: number }>) {
        if (it?.name) add(String(it.name), Number(it.quantity ?? 1), "quoted");
      }
    }

    return {
      customer: customer as CrmCustomer,
      orders: orders.data ?? [],
      quotes: (quotes.data ?? []).map(({ items: _items, ...q }) => q),
      chats: chats.data ?? [],
      deals: (deals.data ?? []) as CrmDeal[],
      interests: [...interest.values()].sort((a, b) => b.bought + b.quoted - (a.bought + a.quoted)).slice(0, 12),
    };
  });

const CustomerPatch = z.object({
  full_name: z.string().trim().min(1).max(160).optional(),
  company: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  document: z.string().trim().max(30).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(2).nullable().optional(),
  tags: z.array(z.enum(CUSTOMER_TAGS.map((t) => t.id) as [string, ...string[]])).optional(),
  potential: z.enum(["baixo", "medio", "alto"]).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  needs_review: z.boolean().optional(),
});
const blankToNull = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" ? null : v])) as T;

export const adminCrmUpdateCustomer = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid(), patch: CustomerPatch }).parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const { error } = await sb.from("customers").update(blankToNull(data.patch)).eq("id", data.id);
    if (error) throw friendly(error);
    return { ok: true };
  });

export const adminCrmCreateCustomer = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    CustomerPatch.extend({ full_name: z.string().trim().min(1).max(160), origin: z.string().max(40).optional() }).parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { origin, ...rest } = blankToNull(data);
    const { data: row, error } = await sb
      .from("customers")
      .insert({ ...rest, origin: origin ?? "manual", segment: "lead" })
      .select("id")
      .single();
    if (error) throw friendly(error);
    return { id: row.id };
  });

/**
 * Junta dois clientes: pedidos, orçamentos, chats e oportunidades do `merge_id`
 * passam para o `keep_id`, que herda os dados que não tinha. O outro é apagado.
 */
export const adminCrmMergeCustomers = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({ keep_id: z.string().uuid(), merge_id: z.string().uuid() })
      .refine((v) => v.keep_id !== v.merge_id, "Escolha dois clientes diferentes.")
      .parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: rows, error } = await sb.from("customers").select(CUSTOMER_COLUMNS).in("id", [data.keep_id, data.merge_id]);
    if (error) throw new Error(error.message);
    const keep = rows?.find((r) => r.id === data.keep_id) as CrmCustomer | undefined;
    const merge = rows?.find((r) => r.id === data.merge_id) as CrmCustomer | undefined;
    if (!keep || !merge) throw new Error("Cliente não encontrado.");

    for (const table of ["store_orders", "store_quotes", "sales_conversations", "crm_deals", "whatsapp_chats"] as const) {
      const { error: mErr } = await sb.from(table).update({ customer_id: keep.id }).eq("customer_id", merge.id);
      if (mErr) throw new Error(mErr.message);
    }
    // Apaga antes de copiar o telefone (o telefone normalizado é único).
    const { error: dErr } = await sb.from("customers").delete().eq("id", merge.id);
    if (dErr) throw new Error(dErr.message);
    const fill = <K extends keyof CrmCustomer>(k: K) => (keep[k] == null || keep[k] === "" ? merge[k] : keep[k]);
    const { error: uErr } = await sb
      .from("customers")
      .update({
        phone: fill("phone"),
        email: fill("email"),
        document: fill("document"),
        company: fill("company"),
        city: fill("city"),
        state: fill("state"),
        potential: fill("potential"),
        tags: [...new Set([...(keep.tags ?? []), ...(merge.tags ?? [])])],
        notes: [keep.notes, merge.notes].filter(Boolean).join("\n\n") || null,
        needs_review: false,
      })
      .eq("id", keep.id);
    if (uErr) throw friendly(uErr);
    await (sb.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)("store_refresh_customer", { p_id: keep.id });
    return { ok: true };
  });

/* ----------------------------- Oportunidades ----------------------------- */

export const adminCrmListDeals = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async () => {
    const sb = await db();
    const { data, error } = await sb.from("crm_deals").select(DEAL_COLUMNS).order("updated_at", { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    const deals = (data ?? []) as CrmDeal[];
    const ids = [...new Set(deals.map((d) => d.customer_id).filter((v): v is string => !!v))];
    const quoteIds = [...new Set(deals.map((d) => d.quote_id).filter((v): v is string => !!v))];
    const orderIds = [...new Set(deals.map((d) => d.order_id).filter((v): v is string => !!v))];
    const [customers, quotes, orders] = await Promise.all([
      ids.length ? sb.from("customers").select("id, full_name, company, phone").in("id", ids) : Promise.resolve({ data: [], error: null }),
      quoteIds.length ? sb.from("store_quotes").select("id, quote_number, status").in("id", quoteIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? sb.from("store_orders").select("id, order_number, status").in("id", orderIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const cMap = new Map((customers.data ?? []).map((c) => [c.id, c]));
    const qMap = new Map((quotes.data ?? []).map((q) => [q.id, q]));
    const oMap = new Map((orders.data ?? []).map((o) => [o.id, o]));
    return deals.map((d) => ({
      ...d,
      customer: d.customer_id ? (cMap.get(d.customer_id) ?? null) : null,
      quote: d.quote_id ? (qMap.get(d.quote_id) ?? null) : null,
      order: d.order_id ? (oMap.get(d.order_id) ?? null) : null,
    }));
  });

const DealInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  customer_id: z.string().uuid().nullable().optional(),
  stage: z.enum(DEAL_STAGE_IDS).optional(),
  value: z.number().min(0).max(100000000).optional(),
  quantity: z.number().int().min(0).max(1000000).nullable().optional(),
  product_interest: z.string().trim().max(300).nullable().optional(),
  origin: z.string().trim().max(40).nullable().optional(),
  next_action: z.string().trim().max(300).nullable().optional(),
  next_action_at: z.string().trim().max(10).nullable().optional(),
  lost_reason: z.string().trim().max(300).nullable().optional(),
  quote_id: z.string().uuid().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

/** Cria ou atualiza. Perder exige motivo; fechar a venda exige pedido ou orçamento vinculado. */
export const adminCrmSaveDeal = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => DealInput.parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const { id, ...raw } = blankToNull(data);
    const patch = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) as Omit<
      z.infer<typeof DealInput>,
      "id"
    >;

    let current: { stage: string; lost_reason: string | null; quote_id: string | null; order_id: string | null } | null = null;
    if (id) {
      const { data: row, error } = await sb.from("crm_deals").select("stage, lost_reason, quote_id, order_id").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Oportunidade não encontrada.");
      current = row;
    }
    const stage = patch.stage ?? current?.stage ?? "novo_contato";
    const lost = patch.lost_reason ?? current?.lost_reason;
    if (stage === "perdido" && !lost) throw new Error("Informe o motivo da perda.");
    const quoteId = patch.quote_id !== undefined ? patch.quote_id : current?.quote_id;
    const orderId = patch.order_id !== undefined ? patch.order_id : current?.order_id;
    if (stage === "ganho" && !quoteId && !orderId) {
      throw new Error("Para fechar a venda, vincule o pedido ou o orçamento pago.");
    }
    if (stage !== "perdido" && patch.stage) patch.lost_reason = null;

    if (id) {
      const { error } = await sb.from("crm_deals").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    if (!patch.title) throw new Error("Dê um título para a oportunidade.");
    const { data: row, error } = await sb
      .from("crm_deals")
      .insert({ ...patch, title: patch.title, stage })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminCrmDeleteDeal = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = await db();
    const { error } = await sb.from("crm_deals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
