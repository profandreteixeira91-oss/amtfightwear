/**
 * Ledger central do AMT Pay.
 *
 * Toda confirmação/estorno de pagamento passa por aqui:
 *   1. Busca as taxas do dono (`dojo_payment_settings`) e a política de
 *      liberação (`dojo_wallet_settings.auto_release_days`).
 *   2. Calcula a decomposição bruto → taxa gateway → taxa AMT (2%) → líquido.
 *   3. Persiste o breakdown na fatura.
 *   4. Cria um lançamento em `dojo_wallet_transactions` (idempotente por
 *      fatura via índices únicos parciais).
 *
 * Este módulo é server-only e só pode ser importado por handlers (server fns,
 * server routes ou webhooks) — nunca a partir de código do cliente.
 */

import { calcFees, type FeeBreakdown } from "@/lib/dojo/payment-settings.functions";

type Method = "pix" | "boleto" | "card" | "link";

export interface RecordPaymentInput {
  ownerId: string;
  invoiceId: string;
  studentId: string | null;
  gross: number;
  method: Method;
  installments?: number;
  provider: string; // 'asaas' | 'mercadopago' | ...
  providerTxId: string;
  description?: string | null;
  paidAt: Date;
}

async function loadSettings(admin: any, ownerId: string) {
  const [{ data: pay }, { data: wallet }] = await Promise.all([
    admin.from("dojo_payment_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
    admin.from("dojo_wallet_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
  ]);
  return { pay, wallet };
}

/**
 * Registra o crédito na carteira do dono e persiste o breakdown na fatura.
 * Idempotente: se já existe recibo para (owner, invoice), apenas retorna.
 */
export async function recordInvoicePaymentToLedger(
  admin: any,
  input: RecordPaymentInput,
): Promise<{ ledgerId: string | null; breakdown: FeeBreakdown; alreadyExisted: boolean }> {
  const { pay, wallet } = await loadSettings(admin, input.ownerId);

  // calcFees espera 'pix' | 'boleto' | 'card'; para 'link' usa o pior caso (card à vista)
  const feeMethod: "pix" | "boleto" | "card" =
    input.method === "link" ? "card" : input.method;
  const breakdown = calcFees(input.gross, feeMethod, pay, input.installments ?? 1);

  // Persiste no invoice — sempre atualiza, mesmo se ledger já existir (idempotente)
  await admin
    .from("dojo_invoices")
    .update({
      gross_amount: breakdown.gross,
      gateway_fee_amount: breakdown.gatewayFee,
      platform_fee_amount: breakdown.platformFee,
      net_amount: breakdown.net,
      fees_breakdown: {
        method: input.method,
        installments: input.installments ?? 1,
        provider: input.provider,
        computed_at: new Date().toISOString(),
        ...breakdown,
      },
    })
    .eq("id", input.invoiceId);

  // Já existe recibo para esta fatura?
  const { data: existing } = await admin
    .from("dojo_wallet_transactions")
    .select("id")
    .eq("owner_id", input.ownerId)
    .eq("reference_type", "invoice")
    .eq("reference_id", input.invoiceId)
    .eq("kind", "receipt")
    .eq("direction", 1)
    .maybeSingle();

  if (existing?.id) {
    return { ledgerId: existing.id, breakdown, alreadyExisted: true };
  }

  const autoReleaseDays = Number((wallet as any)?.auto_release_days ?? 1);
  const availableAt = new Date(input.paidAt);
  availableAt.setDate(availableAt.getDate() + autoReleaseDays);
  const status = autoReleaseDays <= 0 ? "available" : "pending";

  const { data: created } = await admin
    .from("dojo_wallet_transactions")
    .insert({
      owner_id: input.ownerId,
      student_id: input.studentId,
      kind: "receipt",
      method: input.method,
      status,
      amount: breakdown.gross,
      direction: 1,
      fee_amount: Number((breakdown.gatewayFee + breakdown.platformFee).toFixed(2)),
      net_amount: breakdown.net,
      currency: "BRL",
      description: input.description ?? "Recebimento — mensalidade",
      reference_type: "invoice",
      reference_id: input.invoiceId,
      provider: input.provider,
      provider_tx_id: input.providerTxId,
      occurred_at: input.paidAt.toISOString(),
      available_at: availableAt.toISOString(),
      metadata: { breakdown, method: input.method, installments: input.installments ?? 1 },
    } as never)
    .select("id")
    .single();

  return { ledgerId: (created as any)?.id ?? null, breakdown, alreadyExisted: false };
}

/**
 * Registra o estorno na carteira: gera lançamento negativo (direction=-1),
 * status='available' para reduzir o saldo imediatamente. Idempotente por fatura.
 */
export async function recordInvoiceRefundToLedger(
  admin: any,
  input: Omit<RecordPaymentInput, "installments"> & { installments?: number },
): Promise<{ ledgerId: string | null; alreadyExisted: boolean }> {
  const { data: existing } = await admin
    .from("dojo_wallet_transactions")
    .select("id")
    .eq("owner_id", input.ownerId)
    .eq("reference_type", "invoice")
    .eq("reference_id", input.invoiceId)
    .eq("kind", "refund")
    .eq("direction", -1)
    .maybeSingle();

  if (existing?.id) {
    return { ledgerId: existing.id, alreadyExisted: true };
  }

  // Busca o recibo original para calcular o líquido estornado
  const { data: receipt } = await admin
    .from("dojo_wallet_transactions")
    .select("amount, net_amount, fee_amount, method")
    .eq("owner_id", input.ownerId)
    .eq("reference_type", "invoice")
    .eq("reference_id", input.invoiceId)
    .eq("kind", "receipt")
    .eq("direction", 1)
    .maybeSingle();

  const grossRefund = Number((receipt as any)?.amount ?? input.gross);
  const netRefund = Number((receipt as any)?.net_amount ?? input.gross);
  const feeRefund = Number((receipt as any)?.fee_amount ?? 0);

  const { data: created } = await admin
    .from("dojo_wallet_transactions")
    .insert({
      owner_id: input.ownerId,
      student_id: input.studentId,
      kind: "refund",
      method: input.method,
      status: "available",
      amount: grossRefund,
      direction: -1,
      fee_amount: feeRefund,
      net_amount: netRefund,
      currency: "BRL",
      description: input.description ?? "Estorno — mensalidade",
      reference_type: "invoice",
      reference_id: input.invoiceId,
      provider: input.provider,
      provider_tx_id: input.providerTxId,
      occurred_at: input.paidAt.toISOString(),
      available_at: input.paidAt.toISOString(),
      metadata: { refund: true },
    } as never)
    .select("id")
    .single();

  return { ledgerId: (created as any)?.id ?? null, alreadyExisted: false };
}
