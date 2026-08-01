import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient<any, any, any>;

export type QuoteRow = {
  id: string;
  quote_number?: string | null;
  status: string;
  customer_name?: string | null;
  customer_company?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_document?: string | null;
  customer_address?: Record<string, unknown> | null;
  items?: unknown;
  subtotal?: number | string | null;
  discount?: number | string | null;
  shipping_cost?: number | string | null;
  total?: number | string | null;
  created_at?: string | null;
};

/** Status que mantêm o orçamento vivo na operação (fila de produção). */
const ACTIVE_STATUSES = ["draft", "sent", "approved", "paid_50", "paid_100"];
export const PAID_RATIO: Record<string, number> = { paid_50: 0.5, paid_100: 1 };

function quoteItems(quote: QuoteRow) {
  return Array.isArray(quote.items) ? (quote.items as Record<string, unknown>[]) : [];
}

/**
 * Um novo orçamento entra automaticamente na fila de produção como "Recebido".
 * Orçamentos recusados/expirados são removidos da fila.
 */
export async function syncQuoteProductionJobs(supabase: AnyClient, quote: QuoteRow) {
  const active = ACTIVE_STATUSES.includes(quote.status);

  if (!active) {
    await supabase.from("store_production_jobs").delete().eq("source", "quote").eq("source_id", quote.id);
    return { inserted: 0, removed: true };
  }

  const items = quoteItems(quote);
  const { data: existing } = await supabase
    .from("store_production_jobs")
    .select("id, source_item_key")
    .eq("source", "quote")
    .eq("source_id", quote.id);

  const seen = new Set((existing ?? []).map((r: { source_item_key: string | null }) => String(r.source_item_key ?? "")));
  const validKeys = new Set(items.map((_, idx) => String(idx)));

  // remove jobs de itens que não existem mais no orçamento (só quando há itens)
  if (items.length) {
    const stale = (existing ?? []).filter(
      (r: { source_item_key: string | null }) => !validKeys.has(String(r.source_item_key ?? "")),
    );
    if (stale.length) {
      await supabase
        .from("store_production_jobs")
        .delete()
        .in("id", stale.map((r: { id: string }) => r.id));
    }
  }

  const queuedAt = quote.created_at ?? new Date().toISOString();
  const deadline = new Date(new Date(queuedAt).getTime() + 15 * 86400000).toISOString().slice(0, 10);
  const paymentStatus =
    quote.status === "paid_100" ? "paid" : quote.status === "paid_50" ? "partial" : quote.status;

  const rows = items
    .map((it, idx) => ({ it, key: String(idx) }))
    .filter(({ key }) => !seen.has(key))
    .map(({ it, key }) => ({
      source: "quote",
      source_id: quote.id,
      source_item_key: key,
      reference: quote.quote_number ?? null,
      customer_name: quote.customer_company || quote.customer_name || null,
      product_name: String(it["name"] ?? "Item do orçamento"),
      variant_label: (it["description"] as string) ?? null,
      sku: (it["sku"] as string) ?? null,
      image_url: (it["image_url"] as string) ?? null,
      quantity: Number(it["quantity"] ?? 1),
      unit_price: it["unit_price"] != null ? Number(it["unit_price"]) : null,
      total_value:
        it["unit_price"] != null ? Number(it["unit_price"]) * Number(it["quantity"] ?? 1) : null,
      status: "queued",
      stage: "recebido",
      order_type: "quote",
      payment_status: paymentStatus,
      queued_at: queuedAt,
      deadline,
      custom_config: null,
    }));

  // mantém o status de pagamento dos jobs já existentes coerente com o orçamento
  if ((existing ?? []).length) {
    await supabase
      .from("store_production_jobs")
      .update({ payment_status: paymentStatus } as never)
      .eq("source", "quote")
      .eq("source_id", quote.id);
  }

  if (rows.length === 0) return { inserted: 0, removed: false };

  // insere item por item: uma colisão de chave única não pode abortar os demais
  let inserted = 0;
  for (const row of rows) {
    const { error } = await supabase.from("store_production_jobs").insert(row as never);
    if (error) {
      if (!/duplicate key|unique/i.test(error.message)) throw new Error(error.message);
      continue;
    }
    inserted += 1;
  }
  return { inserted, removed: false };
}


/**
 * Orçamento pago (50% ou 100%) é registrado como pedido da loja com o valor pago.
 * Ao mudar de 50% para 100% o pedido é sobrescrito (nunca acumulado).
 */
export async function syncQuoteOrder(supabase: AnyClient, quote: QuoteRow) {
  const ratio = PAID_RATIO[quote.status] ?? 0;

  const { data: found } = await supabase
    .from("store_orders")
    .select("id")
    .eq("metadata->>quote_id", quote.id)
    .limit(1);
  const existingId = (found ?? [])[0]?.id as string | undefined;

  if (!ratio) {
    if (existingId) await supabase.from("store_orders").delete().eq("id", existingId);
    return { orderId: null, amount: 0 };
  }

  const quoteTotal = Number(quote.total || 0);
  const amount = Math.round(quoteTotal * ratio * 100) / 100;
  const address = (quote.customer_address ?? {}) as Record<string, unknown>;
  const label = ratio === 1 ? "pagamento integral" : "pagamento 50%";

  const payload = {
    customer_email: quote.customer_email || "orcamentos@amtfightwear.com.br",
    customer_name: quote.customer_company || quote.customer_name || "Cliente",
    customer_phone: quote.customer_phone || null,
    customer_document: quote.customer_document || null,
    shipping_address: address,
    subtotal: amount,
    shipping_cost: 0,
    discount: 0,
    total: amount,
    status: ratio === 1 ? "paid" : "processing",
    payment_status: ratio === 1 ? "paid" : "partial",
    payment_method: "quote",
    payment_provider: "manual",
    payment_reference: quote.quote_number ?? null,
    notes: `Gerado do orçamento ${quote.quote_number ?? ""} — ${label}`.trim(),
    metadata: {
      quote_id: quote.id,
      quote_number: quote.quote_number ?? null,
      quote_total: quoteTotal,
      paid_ratio: ratio,
      channel: "quote",
    },
  };

  let orderId = existingId;
  if (orderId) {
    const { error } = await supabase.from("store_orders").update(payload as never).eq("id", orderId);
    if (error) throw new Error(error.message);
    await supabase.from("store_order_items").delete().eq("order_id", orderId);
  } else {
    const { data: row, error } = await supabase
      .from("store_orders")
      .insert(payload as never)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    orderId = (row as { id: string } | null)?.id;
  }
  if (!orderId) return { orderId: null, amount };

  const items = quoteItems(quote).map((it) => ({
    order_id: orderId,
    product_id: (it["product_id"] as string) ?? null,
    product_name: String(it["name"] ?? "Item do orçamento"),
    variant_label: (it["description"] as string) ?? null,
    sku: (it["sku"] as string) ?? null,
    image_url: (it["image_url"] as string) ?? null,
    quantity: Math.max(1, Math.round(Number(it["quantity"] ?? 1))),
    unit_price: Number(it["unit_price"] ?? 0),
    total_price: Number(it["unit_price"] ?? 0) * Number(it["quantity"] ?? 1),
  }));
  if (items.length) {
    const { error } = await supabase.from("store_order_items").insert(items as never);
    if (error) throw new Error(error.message);
  }

  // A fila de produção já acompanha o orçamento — evita item duplicado via pedido.
  await supabase.from("store_production_jobs").delete().eq("source", "order").eq("source_id", orderId);

  return { orderId, amount };
}

/** Sincroniza fila de produção + pedido + financeiro a partir do orçamento. */
export async function syncQuoteEverywhere(supabase: AnyClient, quote: QuoteRow) {
  // recarrega a linha canônica: payloads parciais (ex.: só status) não podem
  // fazer a fila de produção perder itens do orçamento
  let full = quote;
  const { data: fresh } = await supabase
    .from("store_quotes")
    .select("*")
    .eq("id", quote.id)
    .maybeSingle();
  if (fresh && Array.isArray((fresh as QuoteRow).items)) full = fresh as QuoteRow;

  await syncQuoteProductionJobs(supabase, full);
  await syncQuoteOrder(supabase, full);
  const { syncQuoteFinanceEntry } = await import("./quote-finance.server");
  await syncQuoteFinanceEntry(supabase, full as never);
}

