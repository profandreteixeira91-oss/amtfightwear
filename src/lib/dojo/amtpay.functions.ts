// ============================================================
// AMT Pay v2 — módulo financeiro centralizado no Mercado Pago da AMT.
// Saldo, extrato e saques são mantidos internamente na tabela
// dojo_wallet_transactions, alimentados pelo webhook de split.
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------
// Tipos expostos à UI
// ------------------------------------------------------------
export type WalletBalance = {
  available: number;
  pending: number;
  blocked: number;
  total: number;
  currency: string;
  fetchedAt: string;
};

export type GatewayCapabilities = {
  connected: boolean;
  provider: "amt_pay";
  providerName: string;
  withdrawals: boolean;
  dashboardUrl: string | null;
};

export type WalletDashboard = {
  balance: WalletBalance;
  receiptsToday: number;
  receiptsMonth: number;
  activeSubscriptions: number;
  openInvoices: number;
  overdueAmount: number;
  lastSyncAt: string | null;
  nextPayoutAt: string | null;
  lastWithdrawal: {
    id: string;
    amount: number;
    status: string;
    requested_at: string;
  } | null;
  gateway: GatewayCapabilities;
};

const CAPS: GatewayCapabilities = {
  connected: true,
  provider: "amt_pay",
  providerName: "AMT Pay",
  withdrawals: true,
  dashboardUrl: null,
};

// ------------------------------------------------------------
// Capacidades (compat com UI antiga)
// ------------------------------------------------------------
export const getGatewayCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<GatewayCapabilities> => CAPS);

// ------------------------------------------------------------
// Wallet settings
// ------------------------------------------------------------
async function ensureWalletSettings(supabase: any, ownerId: string) {
  const { data } = await supabase
    .from("dojo_wallet_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("dojo_wallet_settings")
    .insert({ owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export const getWalletSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ensureWalletSettings(context.supabase, context.userId));

export const updateWalletSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        min_withdrawal_amount: z.number().min(0).optional(),
        payout_mode: z.enum(["manual", "daily", "weekly", "monthly"]).optional(),
        auto_release_days: z.number().int().min(0).max(90).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureWalletSettings(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("dojo_wallet_settings")
      .update(data)
      .eq("owner_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ------------------------------------------------------------
// Conta bancária local (destino dos saques via AMT)
// ------------------------------------------------------------
const bankAccountSchema = z.object({
  bank_code: z.string().max(20).optional().nullable(),
  bank_name: z.string().max(80).optional().nullable(),
  account_type: z.enum(["checking", "savings", "payment"]).default("checking"),
  branch: z.string().max(20).optional().nullable(),
  branch_digit: z.string().max(5).optional().nullable(),
  account_number: z.string().max(30).optional().nullable(),
  account_digit: z.string().max(5).optional().nullable(),
  holder_name: z.string().min(2).max(120),
  holder_document: z.string().min(11).max(20),
  pix_key: z.string().max(120).optional().nullable(),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).optional().nullable(),
});

export const getPrimaryBankAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_bank_accounts")
      .select("*")
      .eq("owner_id", context.userId)
      .eq("active", true)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const listBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_bank_accounts")
      .select("*")
      .eq("owner_id", context.userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid().optional(), account: bankAccountSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("dojo_bank_accounts")
        .update({ ...data.account })
        .eq("id", data.id)
        .eq("owner_id", context.userId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    await context.supabase
      .from("dojo_bank_accounts")
      .update({ is_primary: false })
      .eq("owner_id", context.userId);
    const { data: row, error } = await context.supabase
      .from("dojo_bank_accounts")
      .insert({
        ...data.account,
        owner_id: context.userId,
        is_primary: true,
        active: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ------------------------------------------------------------
// Saldo interno — soma de dojo_wallet_transactions
// ------------------------------------------------------------
async function computeBalance(supabase: any, ownerId: string): Promise<WalletBalance> {
  const { data } = await supabase
    .from("dojo_wallet_transactions")
    .select("direction, status, net_amount")
    .eq("owner_id", ownerId);
  const rows = (data ?? []) as Array<{ direction: number; status: string; net_amount: number | string }>;
  let available = 0;
  let pending = 0;
  let blocked = 0;
  for (const r of rows) {
    const v = Number(r.net_amount) * (Number(r.direction) === -1 ? -1 : 1);
    if (r.status === "available") available += v;
    else if (r.status === "pending") pending += v;
    else if (r.status === "blocked") blocked += v;
  }
  return {
    available: Math.max(0, Number(available.toFixed(2))),
    pending: Math.max(0, Number(pending.toFixed(2))),
    blocked: Math.max(0, Number(blocked.toFixed(2))),
    total: Math.max(0, Number((available + pending + blocked).toFixed(2))),
    currency: "BRL",
    fetchedAt: new Date().toISOString(),
  };
}

export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletBalance> =>
    computeBalance(context.supabase, context.userId),
  );

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
export const getWalletDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletDashboard> => {
    const supabase = context.supabase;
    const ownerId = context.userId;

    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [balance, receiptsDay, receiptsMonth, openQ, overdueQ, activeSubsQ, lastWdQ] =
      await Promise.all([
        computeBalance(supabase, ownerId),
        supabase
          .from("dojo_split_transactions")
          .select("dojo_net_amount")
          .eq("owner_id", ownerId)
          .eq("status", "approved")
          .gte("paid_at", startDay),
        supabase
          .from("dojo_split_transactions")
          .select("dojo_net_amount")
          .eq("owner_id", ownerId)
          .eq("status", "approved")
          .gte("paid_at", startMonth),
        supabase
          .from("dojo_invoices")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", ownerId)
          .eq("status", "open"),
        supabase
          .from("dojo_invoices")
          .select("amount")
          .eq("owner_id", ownerId)
          .eq("status", "overdue"),
        supabase
          .from("dojo_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", ownerId)
          .eq("status", "active"),
        supabase
          .from("dojo_withdrawals")
          .select("id, amount, status, requested_at")
          .eq("owner_id", ownerId)
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const sumNet = (rows: any) =>
      (rows?.data ?? []).reduce((s: number, r: any) => s + Number(r.dojo_net_amount ?? 0), 0);
    const overdueAmount = (overdueQ.data ?? []).reduce(
      (s: number, r: any) => s + Number(r.amount ?? 0),
      0,
    );

    return {
      balance,
      receiptsToday: sumNet(receiptsDay),
      receiptsMonth: sumNet(receiptsMonth),
      activeSubscriptions: activeSubsQ.count ?? 0,
      openInvoices: openQ.count ?? 0,
      overdueAmount,
      lastSyncAt: balance.fetchedAt,
      nextPayoutAt: null,
      lastWithdrawal: lastWdQ.data
        ? {
            id: lastWdQ.data.id,
            amount: Number(lastWdQ.data.amount),
            status: lastWdQ.data.status,
            requested_at: lastWdQ.data.requested_at,
          }
        : null,
      gateway: CAPS,
    };
  });

// ------------------------------------------------------------
// Extrato
// ------------------------------------------------------------
export const listWalletTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        kind: z
          .enum([
            "receipt",
            "fee",
            "refund",
            "withdrawal",
            "withdrawal_reversal",
            "adjustment",
            "transfer_in",
            "transfer_out",
          ])
          .optional(),
        method: z
          .enum(["pix", "card", "boleto", "link", "cash", "transfer", "internal", "other"])
          .optional(),
        status: z.enum(["pending", "available", "blocked", "reversed"]).optional(),
        studentId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).default(100).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_wallet_transactions")
      .select("*")
      .eq("owner_id", context.userId)
      .order("occurred_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.from) q = q.gte("occurred_at", data.from);
    if (data.to) q = q.lte("occurred_at", data.to);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.method) q = q.eq("method", data.method);
    if (data.status) q = q.eq("status", data.status);
    if (data.studentId) q = q.eq("student_id", data.studentId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Série 30 dias */
export const getWalletChart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    const { data } = await context.supabase
      .from("dojo_wallet_transactions")
      .select("occurred_at, direction, net_amount")
      .eq("owner_id", context.userId)
      .gte("occurred_at", since.toISOString())
      .limit(500);
    const rows = (data ?? []) as Array<{ occurred_at: string; direction: number; net_amount: number | string }>;
    const byDay: Record<string, { in: number; out: number }> = {};
    for (const row of rows) {
      const d = new Date(row.occurred_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay[key] ??= { in: 0, out: 0 };
      const v = Number(row.net_amount ?? 0);
      if (Number(row.direction) === 1) byDay[key].in += v;
      else byDay[key].out += v;
    }
    const series: { date: string; in: number; out: number; balance: number }[] = [];
    let running = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = byDay[key] ?? { in: 0, out: 0 };
      running += day.in - day.out;
      series.push({ date: key, in: day.in, out: day.out, balance: running });
    }
    return series;
  });

// ------------------------------------------------------------
// Saques — solicitados via AMT Pay, quitados pela AMT (PIX manual)
// ------------------------------------------------------------
export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_withdrawals")
      .select("*")
      .eq("owner_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((w: any) => ({
      id: w.id,
      provider_tx_id: w.provider_tx_id,
      amount: Number(w.amount),
      status: w.status,
      requested_at: w.requested_at,
      pix_key: w.pix_key,
      pix_key_type: w.pix_key_type,
      bank_account: w.destination,
    }));
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        amount: z.number().positive(),
        pix_key: z.string().max(140).optional().nullable(),
        pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).optional().nullable(),
        bank_account_id: z.string().uuid().optional(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const ownerId = context.userId;

    const settings = await ensureWalletSettings(supabase, ownerId);
    const min = Number(settings.min_withdrawal_amount ?? 0);
    if (data.amount < min) {
      throw new Error(`Valor mínimo para saque é R$ ${min.toFixed(2)}.`);
    }

    const balance = await computeBalance(supabase, ownerId);
    if (data.amount > balance.available) {
      throw new Error("Saldo insuficiente na sua carteira AMT Pay para este saque.");
    }

    let bankAccount: any = null;
    let pixKey = data.pix_key ?? null;
    let pixKeyType = data.pix_key_type ?? null;
    if (!pixKey) {
      const { data: acc } = await supabase
        .from("dojo_bank_accounts")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("is_primary", true)
        .eq("active", true)
        .maybeSingle();
      bankAccount = acc;
      if (!bankAccount) {
        throw new Error("Cadastre uma conta bancária ou informe uma chave PIX para o saque.");
      }
      pixKey = bankAccount.pix_key ?? null;
      pixKeyType = bankAccount.pix_key_type ?? null;
    }

    const { data: wd, error } = await supabase
      .from("dojo_withdrawals")
      .insert({
        owner_id: ownerId,
        bank_account_id: bankAccount?.id ?? null,
        amount: data.amount,
        fee_amount: 0,
        net_amount: data.amount,
        destination: bankAccount ?? null,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        provider: "asaas",
        provider_tx_id: null,
        status: "requested",
        notes: data.notes ?? null,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Debita saldo imediatamente (kind=withdrawal, direction=-1, status=available)
    await supabase.from("dojo_wallet_transactions").insert({
      owner_id: ownerId,
      kind: "withdrawal",
      method: "pix",
      status: "available",
      amount: data.amount,
      direction: -1,
      fee_amount: 0,
      net_amount: data.amount,
      description: `Solicitação de saque #${(wd as any).id.slice(0, 8)}`,
      reference_type: "withdrawal",
      reference_id: (wd as any).id,
      provider: "asaas",
    } as never);

    // Dispara a transferência via Asaas (subconta do dono).
    // Erros aqui não bloqueiam a solicitação; ela pode ser retentada.
    let dispatchResult: any = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { dispatchWithdrawal } = await import("@/lib/dojo/payments/withdrawals.server");
      dispatchResult = await dispatchWithdrawal(supabaseAdmin, (wd as any).id);
    } catch (err) {
      console.error("[amtpay] dispatchWithdrawal error", err);
    }

    // Recarrega o saque para retornar o estado atual (pode ter virado processing).
    const { data: fresh } = await supabase
      .from("dojo_withdrawals")
      .select("*")
      .eq("id", (wd as any).id)
      .maybeSingle();
    const final = (fresh ?? wd) as any;

    return {
      id: final.id,
      provider_tx_id: final.provider_tx_id ?? final.asaas_transfer_id ?? null,
      amount: Number(final.amount),
      status: final.status,
      requested_at: final.requested_at,
      pix_key: final.pix_key,
      pix_key_type: final.pix_key_type,
      bank_account: final.destination,
      dispatch: dispatchResult,
    };
  });

/**
 * Retenta o envio ao Asaas de um saque que ficou em `requested`
 * (por exemplo por falta de chave Asaas configurada na hora da solicitação).
 */
export const retryWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: wd } = await context.supabase
      .from("dojo_withdrawals")
      .select("id, owner_id, status")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!wd) throw new Error("Saque não encontrado");
    if ((wd as any).status !== "requested") {
      throw new Error("Este saque já está em processamento ou foi finalizado.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { dispatchWithdrawal } = await import("@/lib/dojo/payments/withdrawals.server");
    const r = await dispatchWithdrawal(supabaseAdmin, data.id);
    if (!r.dispatched) {
      throw new Error(
        r.reason === "no-asaas-key"
          ? "Ative o AMT Pay (subconta Asaas) antes de reenviar."
          : `Não foi possível enviar ao Asaas: ${r.reason ?? "erro desconhecido"}`,
      );
    }
    return { ok: true, status: r.asaasStatus };
  });

export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: wd } = await context.supabase
      .from("dojo_withdrawals")
      .select("*")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!wd) throw new Error("Solicitação não encontrada");
    if ((wd as any).status !== "requested" && (wd as any).status !== "pending") {
      throw new Error("Este saque já foi processado e não pode ser cancelado.");
    }
    await context.supabase
      .from("dojo_withdrawals")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    // Reverte o débito
    await context.supabase.from("dojo_wallet_transactions").insert({
      owner_id: context.userId,
      kind: "withdrawal_reversal",
      method: "internal",
      status: "available",
      amount: Number((wd as any).amount),
      direction: 1,
      fee_amount: 0,
      net_amount: Number((wd as any).amount),
      description: `Cancelamento de saque #${data.id.slice(0, 8)}`,
      reference_type: "withdrawal",
      reference_id: data.id,
      provider: "amt_pay",
    } as never);
    return { ok: true };
  });
