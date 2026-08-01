import type { SupabaseClient } from "@supabase/supabase-js";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "approved",
  "paid_50",
  "paid_100",
  "rejected",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

const PAID_RATIO: Record<string, number> = { paid_50: 0.5, paid_100: 1 };

/**
 * Mantém o financeiro da loja em sincronia com o status do orçamento.
 * Sempre sobrescreve (nunca acumula) o lançamento do orçamento.
 */
export async function syncQuoteFinanceEntry(
  supabase: SupabaseClient<any, any, any>,
  quote: { id: string; status: string; total: number | string; quote_number?: string | null; customer_name?: string | null },
) {
  // remove qualquer lançamento anterior deste orçamento
  await supabase.from("store_finance_entries").delete().eq("source", "quote").eq("source_id", quote.id);

  const ratio = PAID_RATIO[quote.status];
  if (!ratio) return { amount: 0 };

  const amount = Math.round(Number(quote.total || 0) * ratio * 100) / 100;
  if (amount <= 0) return { amount: 0 };

  const label = ratio === 1 ? "pagamento integral" : "pagamento 50%";
  const { error } = await supabase.from("store_finance_entries").insert({
    source: "quote",
    source_id: quote.id,
    reference: quote.quote_number ?? null,
    description: `Orçamento ${quote.quote_number ?? ""} — ${label}`.trim(),
    customer_name: quote.customer_name ?? null,
    quantity: 1,
    unit_price: amount,
    amount,
    occurred_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { amount };
}
