/**
 * AMT Pay — Fase 6: Saques automáticos & Conciliação.
 *
 * Este módulo é server-only. Ele é o único ponto de contato entre a carteira
 * interna do dojo (`dojo_wallet_transactions` / `dojo_withdrawals`) e a API
 * de transferências PIX do Asaas.
 *
 * Fluxo:
 *   1. `dispatchWithdrawal` — envia a solicitação ao Asaas usando a API key
 *      da subconta do dono. Persiste `asaas_transfer_id` e move o status
 *      `requested` → `processing`. Erros de API não bloqueiam a solicitação:
 *      o saque permanece `requested` e pode ser retentado.
 *   2. `applyTransferEvent` — chamado pelo webhook do Asaas em TRANSFER_*.
 *      Confirma, falha ou cancela; reverte a carteira em caso de falha.
 *   3. `reconcileWithdrawals` — chamado pelo cron. Faz polling GET /transfers
 *      dos saques que ainda estão em trânsito e converge o status.
 *   4. `releasePendingReceipts` — chamado pelo cron. Move recebimentos
 *      `pending` cujo `available_at <= now()` para `available`.
 */

import {
  asaasCreateTransfer,
  asaasGetTransfer,
  type AsaasTransfer,
} from "@/lib/asaas/client.server";

type Admin = any;

const TERMINAL = new Set(["paid", "cancelled", "rejected"]);

/**
 * Mapeia o status devolvido pelo Asaas para o enum interno.
 * Referência: https://docs.asaas.com/reference/transferir-para-conta-bancaria
 */
function mapAsaasTransferStatus(status: string | undefined | null):
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled" {
  const s = String(status ?? "").toUpperCase();
  if (s === "DONE" || s === "PAID") return "paid";
  if (s === "FAILED" || s === "DENIED") return "rejected";
  if (s === "CANCELLED" || s === "CANCELED") return "cancelled";
  return "processing";
}

async function loadOwnerKey(admin: Admin, ownerId: string): Promise<string | null> {
  // Fase 3 — Carteira nativa: se o dojo tem subconta Asaas aprovada, o saque
  // sai da subconta do próprio dono. Caso contrário, cai no fluxo central AMT.
  try {
    const { data: profile } = await admin
      .from("dojo_academy_profile")
      .select(
        "asaas_subaccount_id, asaas_subaccount_api_key, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status",
      )
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (profile) {
      const { resolveDojoAsaasCredentials } = await import("@/lib/asaas/enrollment.server");
      const { apiKey } = resolveDojoAsaasCredentials(profile as any);
      if (apiKey) return apiKey;
    }
  } catch (err) {
    console.warn("[withdrawals] falha ao resolver chave da subconta", err);
  }
  return process.env.ASAAS_PRODUCTION_API_KEY?.trim() || null;
}

async function insertReversal(admin: Admin, wd: any, reason: string) {
  // Idempotência: evita creditar duas vezes o mesmo cancelamento.
  const { data: exists } = await admin
    .from("dojo_wallet_transactions")
    .select("id")
    .eq("owner_id", wd.owner_id)
    .eq("reference_type", "withdrawal")
    .eq("reference_id", wd.id)
    .eq("kind", "withdrawal_reversal")
    .maybeSingle();
  if (exists?.id) return;
  await admin.from("dojo_wallet_transactions").insert({
    owner_id: wd.owner_id,
    kind: "withdrawal_reversal",
    method: "internal",
    status: "available",
    amount: Number(wd.amount),
    direction: 1,
    fee_amount: 0,
    net_amount: Number(wd.amount),
    description: `${reason} #${String(wd.id).slice(0, 8)}`,
    reference_type: "withdrawal",
    reference_id: wd.id,
    provider: "asaas",
    occurred_at: new Date().toISOString(),
    available_at: new Date().toISOString(),
  } as never);
}

/**
 * Envia a transferência para o Asaas. Chame com um saque em status
 * `requested`. Se a API do Asaas responder OK, o saque vai para `processing`
 * e recebe `asaas_transfer_id`.
 */
export async function dispatchWithdrawal(
  admin: Admin,
  withdrawalId: string,
): Promise<{ dispatched: boolean; reason?: string; asaasStatus?: string }> {
  const { data: wd } = await admin
    .from("dojo_withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .maybeSingle();
  if (!wd) return { dispatched: false, reason: "not-found" };
  if ((wd as any).asaas_transfer_id) {
    return { dispatched: true, reason: "already-dispatched" };
  }
  if ((wd as any).status !== "requested") {
    return { dispatched: false, reason: `status:${(wd as any).status}` };
  }
  const pixKey = (wd as any).pix_key;
  const pixKeyType = (wd as any).pix_key_type;
  if (!pixKey || !pixKeyType) {
    return { dispatched: false, reason: "missing-pix" };
  }

  const apiKey = await loadOwnerKey(admin, (wd as any).owner_id);
  if (!apiKey) {
    return { dispatched: false, reason: "no-asaas-key" };
  }

  let transfer: AsaasTransfer;
  try {
    transfer = await asaasCreateTransfer(
      {
        value: Number((wd as any).amount),
        pixAddressKey: pixKey,
        pixAddressKeyType: String(pixKeyType).toUpperCase() as any,
        description: `Saque AMT Pay #${String((wd as any).id).slice(0, 8)}`,
        externalReference: `dojo_withdrawal:${(wd as any).id}`,
      },
      apiKey,
    );
  } catch (err: any) {
    await admin
      .from("dojo_withdrawals")
      .update({
        metadata: {
          ...((wd as any).metadata ?? {}),
          last_dispatch_error: String(err?.message ?? err),
          last_dispatch_at: new Date().toISOString(),
        },
      } as never)
      .eq("id", withdrawalId);
    return { dispatched: false, reason: err?.message ?? "asaas-error" };
  }

  const asaasStatus = mapAsaasTransferStatus(transfer.status);
  const patch: Record<string, unknown> = {
    asaas_transfer_id: transfer.id,
    asaas_transfer_status: transfer.status ?? null,
    provider: "asaas",
    provider_tx_id: transfer.id,
    processed_at: new Date().toISOString(),
    status: asaasStatus === "paid" ? "paid" : "processing",
  };
  if (asaasStatus === "paid") {
    patch.paid_at = new Date().toISOString();
  }
  await admin.from("dojo_withdrawals").update(patch as never).eq("id", withdrawalId);
  return { dispatched: true, asaasStatus };
}

/**
 * Aplica um evento de TRANSFER_ recebido pelo webhook Asaas.
 * Espera receber o objeto `transfer` do payload.
 */
export async function applyTransferEvent(
  admin: Admin,
  event: string,
  transfer: any,
): Promise<{ handled: boolean; reason?: string }> {
  const asaasId: string | undefined = transfer?.id;
  const externalRef: string | undefined = transfer?.externalReference;
  if (!asaasId && !externalRef) return { handled: false, reason: "no-id" };

  let wd: any = null;
  if (asaasId) {
    const { data } = await admin
      .from("dojo_withdrawals")
      .select("*")
      .eq("asaas_transfer_id", asaasId)
      .maybeSingle();
    wd = data;
  }
  if (!wd && typeof externalRef === "string") {
    const m = /^dojo_withdrawal:([0-9a-fA-F-]{36})$/.exec(externalRef);
    if (m) {
      const { data } = await admin
        .from("dojo_withdrawals")
        .select("*")
        .eq("id", m[1])
        .maybeSingle();
      wd = data;
    }
  }
  if (!wd) return { handled: false, reason: "not-found" };
  if (TERMINAL.has(wd.status)) return { handled: true, reason: "already-terminal" };

  const nextInternal = (() => {
    switch (event) {
      case "TRANSFER_DONE":
        return "paid";
      case "TRANSFER_FAILED":
        return "rejected";
      case "TRANSFER_CANCELLED":
        return "cancelled";
      default:
        return "processing";
    }
  })();

  const patch: Record<string, unknown> = {
    status: nextInternal,
    asaas_transfer_id: asaasId ?? wd.asaas_transfer_id,
    asaas_transfer_status: transfer?.status ?? null,
  };
  if (nextInternal === "paid") {
    patch.paid_at = transfer?.effectiveDate ?? new Date().toISOString();
  }
  if (nextInternal === "rejected") {
    patch.rejected_at = new Date().toISOString();
    patch.rejection_reason = transfer?.failReason ?? transfer?.description ?? null;
  }
  if (nextInternal === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
  }

  await admin.from("dojo_withdrawals").update(patch as never).eq("id", wd.id);

  if (nextInternal === "rejected") {
    await insertReversal(admin, wd, "Falha no saque");
  } else if (nextInternal === "cancelled") {
    await insertReversal(admin, wd, "Saque cancelado");
  }

  return { handled: true };
}

/**
 * Faz polling dos saques que estão em `processing` há mais de 5min sem
 * receber webhook. Retorna quantos foram atualizados.
 */
export async function reconcileWithdrawals(admin: Admin): Promise<{ checked: number; updated: number }> {
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: rows } = await admin
    .from("dojo_withdrawals")
    .select("id, owner_id, asaas_transfer_id, status, requested_at")
    .in("status", ["processing", "in_review"])
    .not("asaas_transfer_id", "is", null)
    .lte("requested_at", cutoff)
    .limit(50);
  let updated = 0;
  const list = (rows ?? []) as any[];
  for (const wd of list) {
    const apiKey = await loadOwnerKey(admin, wd.owner_id);
    if (!apiKey) continue;
    try {
      const transfer = await asaasGetTransfer(wd.asaas_transfer_id, apiKey);
      const before = wd.status;
      await applyTransferEvent(
        admin,
        transfer.status === "DONE" ? "TRANSFER_DONE"
          : transfer.status === "FAILED" || transfer.status === "DENIED" ? "TRANSFER_FAILED"
          : transfer.status === "CANCELLED" ? "TRANSFER_CANCELLED"
          : "TRANSFER_PENDING",
        transfer,
      );
      if (before !== wd.status) updated++;
    } catch {
      // ignora — segue para próxima; será tentado no próximo ciclo
    }
  }
  return { checked: list.length, updated };
}

/**
 * Move recebimentos `pending` cujo `available_at <= now()` para `available`.
 * Isto implementa a política de liberação (D+N) configurada em
 * `dojo_wallet_settings.auto_release_days`.
 */
export async function releasePendingReceipts(
  admin: Admin,
): Promise<{ released: number }> {
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("dojo_wallet_transactions")
    .update({ status: "available" } as never)
    .eq("status", "pending")
    .lte("available_at", nowIso)
    .select("id");
  if (error) return { released: 0 };
  return { released: (data ?? []).length };
}
