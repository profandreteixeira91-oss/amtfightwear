// ============================================================
// AMT Pay Service — v1: camada de leitura/comando sobre o gateway.
// Nenhum saldo é persistido localmente. Toda consulta financeira
// é feita ao vivo no gateway conectado, via GatewayAdapter.
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  GatewayBalance,
  GatewayCapabilities,
  NormalizedTx,
  NormalizedWithdrawal,
} from "./gateway-adapters/types";

// ------------------------------------------------------------
// Tipos expostos à UI (compatíveis com componentes atuais)
// ------------------------------------------------------------
export type WalletBalance = {
  available: number;
  pending: number;
  blocked: number;
  total: number;
  currency: string;
  fetchedAt: string;
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

// ------------------------------------------------------------
// Capacidades do gateway (usado pela UI para ocultar/exibir ações)
// ------------------------------------------------------------
export const getGatewayCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GatewayCapabilities> => {
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(context.userId);
    return adapter.capabilities;
  });

// ------------------------------------------------------------
// Configurações de saque (mínimo, taxa, modo). Mantém local.
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
// Conta bancária local (usada como destino padrão dos saques)
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
// Saldo (live no gateway)
// ------------------------------------------------------------
export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletBalance> => {
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(context.userId);
    const b: GatewayBalance = await adapter.getBalance();
    return { ...b };
  });

// ------------------------------------------------------------
// Dashboard (saldo + resumo gateway + dados DM)
// ------------------------------------------------------------
export const getWalletDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletDashboard> => {
    const supabase = context.supabase;
    const ownerId = context.userId;
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(ownerId);

    const [balance, receipts, withdrawals, openQ, overdueQ, activeSubsQ] = await Promise.all([
      adapter.getBalance().catch(() => ({
        available: 0, pending: 0, blocked: 0, total: 0, currency: "BRL",
        fetchedAt: new Date().toISOString(),
      } satisfies GatewayBalance)),
      adapter.getReceiptsSummary().catch(() => ({ today: 0, month: 0, currency: "BRL" })),
      adapter.listWithdrawals().catch(() => [] as NormalizedWithdrawal[]),
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
    ]);

    const overdueAmount = (overdueQ.data ?? []).reduce(
      (s: number, r: any) => s + Number(r.amount ?? 0), 0,
    );
    const last = withdrawals[0];

    return {
      balance,
      receiptsToday: receipts.today,
      receiptsMonth: receipts.month,
      activeSubscriptions: activeSubsQ.count ?? 0,
      openInvoices: openQ.count ?? 0,
      overdueAmount,
      lastSyncAt: balance.fetchedAt,
      nextPayoutAt: null,
      lastWithdrawal: last
        ? { id: last.id, amount: last.amount, status: last.status, requested_at: last.requested_at }
        : null,
      gateway: adapter.capabilities,
    };
  });

// ------------------------------------------------------------
// Extrato — live no gateway
// ------------------------------------------------------------
export const listWalletTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        kind: z
          .enum(["receipt", "fee", "refund", "withdrawal", "withdrawal_reversal", "adjustment", "transfer_in", "transfer_out"])
          .optional(),
        method: z.enum(["pix", "card", "boleto", "link", "cash", "transfer", "internal", "other"]).optional(),
        status: z.enum(["pending", "available", "blocked", "reversed"]).optional(),
        studentId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).default(100).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<NormalizedTx[]> => {
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(context.userId);
    const rows = await adapter.getStatement({ from: data.from, to: data.to, limit: data.limit }).catch(() => []);
    return rows
      .filter((r) => !data.kind || r.kind === data.kind)
      .filter((r) => !data.method || r.method === data.method)
      .filter((r) => !data.status || r.status === data.status);
  });

/** Série dos últimos 30 dias — agrega o extrato do gateway em memória. */
export const getWalletChart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(context.userId);
    const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    const rows = await adapter
      .getStatement({ from: since.toISOString(), to: new Date().toISOString(), limit: 500 })
      .catch(() => []);

    const byDay: Record<string, { in: number; out: number }> = {};
    for (const row of rows) {
      const d = new Date(row.occurred_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay[key] ??= { in: 0, out: 0 };
      const v = Number(row.net_amount ?? 0);
      if (row.direction === 1) byDay[key].in += v;
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
// Saques — sempre do gateway (fonte da verdade).
// Mantemos um registro em `dojo_withdrawals` apenas como auditoria
// das solicitações feitas via AMT Pay.
// ------------------------------------------------------------
export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(context.userId);
    const list = await adapter.listWithdrawals().catch(() => []);
    return list.map((w) => ({
      id: w.id,
      provider_tx_id: w.provider_tx_id,
      amount: w.amount,
      status: w.status,
      requested_at: w.requested_at,
      pix_key: w.pix_key,
      pix_key_type: w.pix_key_type,
      bank_account: w.bank_account,
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
  .handler(async ({ data, context }): Promise<NormalizedWithdrawal> => {
    const supabase = context.supabase;
    const ownerId = context.userId;
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(ownerId);

    if (!adapter.capabilities.connected) {
      throw new Error("Conecte um gateway de pagamento antes de solicitar um saque.");
    }
    if (!adapter.capabilities.withdrawals) {
      throw new Error(
        `Saques via API não são suportados pelo ${adapter.capabilities.providerName}. Acesse o painel do gateway para transferir seu saldo.`,
      );
    }

    // Regras mínimas locais
    const settings = await ensureWalletSettings(supabase, ownerId);
    const min = Number(settings.min_withdrawal_amount ?? 0);
    if (data.amount < min) {
      throw new Error(`Valor mínimo para saque é R$ ${min.toFixed(2)}.`);
    }

    // Verifica saldo real no gateway
    const balance = await adapter.getBalance();
    if (data.amount > balance.available) {
      throw new Error("Saldo insuficiente no gateway para este saque.");
    }

    // Resolve destino: chave PIX escolhida OU conta bancária primária local
    let bankAccount: any = null;
    let pixKey: string | null = data.pix_key ?? null;
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

    // Chama o gateway
    const result = await adapter.requestWithdrawal({
      amount: data.amount,
      pixKey,
      pixKeyType: pixKeyType as any,
      bank: pixKey
        ? null
        : bankAccount
          ? {
              bank_code: bankAccount.bank_code,
              branch: bankAccount.branch,
              account_number: bankAccount.account_number,
              account_digit: bankAccount.account_digit,
              holder_name: bankAccount.holder_name,
              holder_document: bankAccount.holder_document,
              account_type: bankAccount.account_type,
            }
          : null,
      notes: data.notes ?? null,
    });

    // Auditoria (não é fonte da verdade — o gateway é)
    try {
      await supabase.from("dojo_withdrawals").insert({
        owner_id: ownerId,
        bank_account_id: bankAccount?.id ?? null,
        amount: result.amount,
        fee_amount: 0,
        net_amount: result.amount,
        destination: bankAccount ?? null,
        pix_key: result.pix_key,
        pix_key_type: (result.pix_key_type as any) ?? null,
        provider: adapter.capabilities.provider,
        provider_tx_id: result.provider_tx_id,
        status: result.status,
        notes: data.notes ?? null,
      });
    } catch {
      /* auditoria é best-effort */
    }

    return result;
  });

export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { resolveAdapter } = await import("./gateway-adapters/index.server");
    const adapter = await resolveAdapter(context.userId);
    if (!adapter.capabilities.withdrawals) {
      throw new Error(
        `Cancelamento não suportado pelo ${adapter.capabilities.providerName}. Use o painel do gateway.`,
      );
    }
    await adapter.cancelWithdrawal(data.id);
    // Reflete no log de auditoria (best-effort).
    try {
      await context.supabase
        .from("dojo_withdrawals")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("owner_id", context.userId)
        .eq("provider_tx_id", data.id);
    } catch {
      /* best-effort */
    }
    return { ok: true };
  });
