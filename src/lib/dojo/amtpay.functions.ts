// ============================================================
// AMT Pay Service — Camada de abstração financeira.
// Todo módulo do sistema (Financeiro, Planos, Alunos, Mensalidades,
// Cobranças) deve consumir apenas estas server functions.
// A camada é preparada para trabalhar com múltiplos gateways e,
// futuramente, com uma carteira própria AMT Pay.
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------
export type WalletBalance = {
  available: number;
  pending: number;
  blocked: number;
  total: number;
  currency: string;
  lastMovementAt: string | null;
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
};

// ------------------------------------------------------------
// Configurações da carteira
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
  .handler(async ({ context }) => {
    return ensureWalletSettings(context.supabase, context.userId);
  });

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
// Conta bancária
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
    z
      .object({ id: z.string().uuid().optional(), account: bankAccountSchema })
      .parse(i),
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
    // Garante que exista apenas uma principal ativa.
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
// Carteira: saldo consolidado
// ------------------------------------------------------------
export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletBalance> => {
    const { data } = await context.supabase
      .from("dojo_wallet_balance")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    return {
      available: Number(data?.available_balance ?? 0),
      pending: Number(data?.pending_balance ?? 0),
      blocked: Number(data?.blocked_balance ?? 0),
      total: Number(data?.total_balance ?? 0),
      currency: "BRL",
      lastMovementAt: data?.last_movement_at ?? null,
    };
  });

// ------------------------------------------------------------
// Dashboard financeiro consolidado
// ------------------------------------------------------------
export const getWalletDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletDashboard> => {
    const supabase = context.supabase;
    const ownerId = context.userId;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Saldo
    const { data: bal } = await supabase
      .from("dojo_wallet_balance")
      .select("*")
      .eq("owner_id", ownerId)
      .maybeSingle();

    // Recebimentos hoje / mês
    const [txToday, txMonth] = await Promise.all([
      supabase
        .from("dojo_wallet_transactions")
        .select("net_amount")
        .eq("owner_id", ownerId)
        .eq("kind", "receipt")
        .eq("direction", 1)
        .gte("occurred_at", startOfDay),
      supabase
        .from("dojo_wallet_transactions")
        .select("net_amount")
        .eq("owner_id", ownerId)
        .eq("kind", "receipt")
        .eq("direction", 1)
        .gte("occurred_at", startOfMonth),
    ]);
    const receiptsToday = (txToday.data ?? []).reduce((s: number, r: any) => s + Number(r.net_amount ?? 0), 0);
    const receiptsMonth = (txMonth.data ?? []).reduce((s: number, r: any) => s + Number(r.net_amount ?? 0), 0);

    // Cobranças em aberto / inadimplência
    const [openQ, overdueQ, activeSubsQ] = await Promise.all([
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
    const overdueAmount = (overdueQ.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

    // Último saque
    const { data: lastW } = await supabase
      .from("dojo_withdrawals")
      .select("id, amount, status, requested_at")
      .eq("owner_id", ownerId)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      balance: {
        available: Number(bal?.available_balance ?? 0),
        pending: Number(bal?.pending_balance ?? 0),
        blocked: Number(bal?.blocked_balance ?? 0),
        total: Number(bal?.total_balance ?? 0),
        currency: "BRL",
        lastMovementAt: bal?.last_movement_at ?? null,
      },
      receiptsToday,
      receiptsMonth,
      activeSubscriptions: activeSubsQ.count ?? 0,
      openInvoices: openQ.count ?? 0,
      overdueAmount,
      lastSyncAt: bal?.last_movement_at ?? null,
      nextPayoutAt: null,
      lastWithdrawal: lastW ?? null,
    };
  });

// ------------------------------------------------------------
// Extrato / transações
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

/** Série de 30 dias de entradas / saídas / saldo cumulativo. */
export const getWalletChart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await context.supabase
      .from("dojo_wallet_transactions")
      .select("occurred_at, direction, net_amount, status")
      .eq("owner_id", context.userId)
      .gte("occurred_at", since.toISOString())
      .neq("status", "reversed");
    if (error) throw new Error(error.message);

    const byDay: Record<string, { in: number; out: number }> = {};
    for (const row of data ?? []) {
      const d = new Date(row.occurred_at as string);
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
// Saques
// ------------------------------------------------------------
export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_withdrawals")
      .select("*, bank_account:dojo_bank_accounts(bank_name, account_number, branch, pix_key, pix_key_type, holder_name)")
      .eq("owner_id", context.userId)
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        amount: z.number().positive(),
        bank_account_id: z.string().uuid().optional(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const ownerId = context.userId;

    // Regras
    const settings = await ensureWalletSettings(supabase, ownerId);
    const min = Number(settings.min_withdrawal_amount ?? 0);
    if (data.amount < min) {
      throw new Error(`Valor mínimo para saque é R$ ${min.toFixed(2)}.`);
    }

    // Conta bancária: usa a informada ou a principal ativa
    let bankAccount: any = null;
    if (data.bank_account_id) {
      const { data: acc } = await supabase
        .from("dojo_bank_accounts")
        .select("*")
        .eq("id", data.bank_account_id)
        .eq("owner_id", ownerId)
        .maybeSingle();
      bankAccount = acc;
    } else {
      const { data: acc } = await supabase
        .from("dojo_bank_accounts")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("is_primary", true)
        .eq("active", true)
        .maybeSingle();
      bankAccount = acc;
    }
    if (!bankAccount) {
      throw new Error("Cadastre uma conta bancária antes de solicitar um saque.");
    }

    // Saldo disponível
    const { data: balRow } = await supabase
      .from("dojo_wallet_balance")
      .select("available_balance")
      .eq("owner_id", ownerId)
      .maybeSingle();
    const available = Number(balRow?.available_balance ?? 0);
    if (data.amount > available) {
      throw new Error("Saldo insuficiente para o saque solicitado.");
    }

    const fee = Number(settings.withdrawal_fee_amount ?? 0);
    const net = Math.max(0, data.amount - fee);

    const destination = {
      bank_code: bankAccount.bank_code,
      bank_name: bankAccount.bank_name,
      branch: bankAccount.branch,
      account_number: bankAccount.account_number,
      account_digit: bankAccount.account_digit,
      holder_name: bankAccount.holder_name,
      holder_document: bankAccount.holder_document,
      pix_key: bankAccount.pix_key,
      pix_key_type: bankAccount.pix_key_type,
    };

    // Cria a solicitação
    const { data: wd, error } = await supabase
      .from("dojo_withdrawals")
      .insert({
        owner_id: ownerId,
        bank_account_id: bankAccount.id,
        amount: data.amount,
        fee_amount: fee,
        net_amount: net,
        destination,
        pix_key: bankAccount.pix_key,
        pix_key_type: bankAccount.pix_key_type,
        status: "requested",
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Reserva o saldo criando um lançamento em "blocked" (débito).
    await supabase.from("dojo_wallet_transactions").insert({
      owner_id: ownerId,
      kind: "withdrawal",
      method: "transfer",
      status: "blocked",
      amount: data.amount,
      direction: -1,
      net_amount: data.amount,
      description: `Reserva de saque #${wd.id.slice(0, 8)}`,
      reference_type: "withdrawal",
      reference_id: wd.id,
    });

    return wd;
  });

export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: wd, error: findErr } = await supabase
      .from("dojo_withdrawals")
      .select("*")
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!wd) throw new Error("Saque não encontrado.");
    if (!["requested", "in_review"].includes(wd.status)) {
      throw new Error("Este saque não pode mais ser cancelado.");
    }
    const { error } = await supabase
      .from("dojo_withdrawals")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Devolve o valor reservado.
    await supabase.from("dojo_wallet_transactions").insert({
      owner_id: context.userId,
      kind: "withdrawal_reversal",
      method: "internal",
      status: "available",
      amount: Number(wd.amount),
      direction: 1,
      net_amount: Number(wd.amount),
      description: `Estorno de saque cancelado #${String(wd.id).slice(0, 8)}`,
      reference_type: "withdrawal",
      reference_id: wd.id,
    });
    return { ok: true };
  });
