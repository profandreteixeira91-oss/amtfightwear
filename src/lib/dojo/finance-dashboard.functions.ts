import { calendarISO, dayISO, isoToDate, todayISO } from "@/lib/dates";
/**
 * Fase 4 — Dashboard financeiro do AMT Pay.
 *
 * Consolida em uma única server fn os indicadores executivos do dono do dojo:
 *   • Saldo em carteira (ledger `dojo_wallet_transactions`)
 *   • Receita bruta, taxas gateway/AMT e receita líquida do mês
 *   • Despesas do mês
 *   • Faturas em atraso / a receber
 *   • MRR estimado por recorrências ativas
 *   • Evolução de 12 meses (bruto × líquido × despesas × saldo)
 *   • Projeção de fluxo de caixa (D+7 / D+15 / D+30 / D+60)
 *   • Distribuição por método de pagamento
 *   • Top 5 alunos por receita no mês
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MonthPoint = {
  key: string;
  label: string;
  gross: number;
  net: number;
  fees: number;
  expenses: number;
  balance: number;
};

type ProjectionPoint = { label: string; days: number; amount: number };

const num = (v: unknown) => Number(v ?? 0);

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const dojoFinanceDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ monthsBack: z.number().int().min(1).max(24).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const monthsBack = data.monthsBack ?? 11;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const in60 = new Date(now.getTime() + 60 * 86_400_000);

    // -----------------------------------------------------------------
    // 1) Ledger — saldo real
    // -----------------------------------------------------------------
    const walletP = supabase
      .from("dojo_wallet_transactions")
      .select("direction, status, net_amount, available_at, occurred_at, kind, method")
      .eq("owner_id", context.userId);

    // -----------------------------------------------------------------
    // 2) Faturas dos últimos monthsBack meses (para evolução) + em aberto
    // -----------------------------------------------------------------
    const invoicesP = supabase
      .from("dojo_invoices")
      .select(
        "id, amount, gross_amount, net_amount, gateway_fee_amount, platform_fee_amount, status, due_date, paid_at, method, student_id",
      )
      .or(
        `due_date.gte.${calendarISO(rangeStart)},paid_at.gte.${rangeStart.toISOString()}`,
      );

    // -----------------------------------------------------------------
    // 3) Despesas dos últimos monthsBack meses
    // -----------------------------------------------------------------
    const expensesP = supabase
      .from("dojo_expenses")
      .select("amount, status, due_date, paid_at, category")
      .gte("due_date", calendarISO(rangeStart));

    // -----------------------------------------------------------------
    // 4) Recorrências ativas para MRR e projeção
    // -----------------------------------------------------------------
    const recurringP = supabase
      .from("dojo_enrollments")
      .select("custom_amount, frequency, next_run_at, status, plan:dojo_plans(amount)")
      .eq("status", "active");

    // -----------------------------------------------------------------
    // 5) Alunos (nome para o top 5)
    // -----------------------------------------------------------------
    const studentsP = supabase.from("dojo_students").select("id, name");

    const [wallet, inv, exp, rec, stu] = await Promise.all([
      walletP,
      invoicesP,
      expensesP,
      recurringP,
      studentsP,
    ]);

    if (wallet.error) throw new Error(wallet.error.message);
    if (inv.error) throw new Error(inv.error.message);
    if (exp.error) throw new Error(exp.error.message);

    const walletRows = wallet.data ?? [];
    const invoices = (inv.data ?? []) as any[];
    const expenses = (exp.data ?? []) as any[];
    const recurring = (rec.data ?? []) as any[];
    const students = new Map<string, string>();
    (stu.data ?? []).forEach((s: any) => students.set(s.id, s.name ?? ""));

    // -----------------------------------------------------------------
    // Saldo em carteira
    // -----------------------------------------------------------------
    let available = 0;
    let pending = 0;
    let blocked = 0;
    const nowMs = Date.now();
    for (const w of walletRows) {
      const dir = num(w.direction) || 1;
      const amt = num(w.net_amount) * dir;
      const st = (w.status ?? "").toString();
      if (st === "settled" || st === "released" || st === "paid") {
        const av = w.available_at ? new Date(w.available_at).getTime() : nowMs;
        if (av <= nowMs) available += amt;
        else pending += amt;
      } else if (st === "pending" || st === "processing") {
        pending += amt;
      } else if (st === "blocked" || st === "reserved" || st === "hold") {
        blocked += amt;
      } else {
        available += amt;
      }
    }
    const totalBalance = available + pending + blocked;

    // -----------------------------------------------------------------
    // KPIs do mês corrente
    // -----------------------------------------------------------------
    const inMonth = (d?: string | null) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= monthStart.getTime() && t <= monthEnd.getTime();
    };

    const paidInvoicesMonth = invoices.filter(
      (i) => i.status === "paid" && (inMonth(i.paid_at) || inMonth(i.due_date)),
    );
    const grossMonth = paidInvoicesMonth.reduce(
      (s, i) => s + num(i.gross_amount ?? i.amount),
      0,
    );
    const netMonth = paidInvoicesMonth.reduce(
      (s, i) => s + num(i.net_amount ?? i.amount),
      0,
    );
    const gatewayFeesMonth = paidInvoicesMonth.reduce(
      (s, i) => s + num(i.gateway_fee_amount),
      0,
    );
    const platformFeesMonth = paidInvoicesMonth.reduce(
      (s, i) => s + num(i.platform_fee_amount),
      0,
    );
    const totalFeesMonth = gatewayFeesMonth + platformFeesMonth;
    const feeRateMonth = grossMonth > 0 ? (totalFeesMonth / grossMonth) * 100 : 0;

    const expensesMonth = expenses
      .filter((e) => e.status === "paid" && (inMonth(e.paid_at) || inMonth(e.due_date)))
      .reduce((s, e) => s + num(e.amount), 0);

    const netProfitMonth = netMonth - expensesMonth;

    // Em atraso e a receber
    const openInvoices = invoices.filter(
      (i) => i.status !== "paid" && i.status !== "cancelled",
    );
    const overdue = openInvoices.filter((i) => new Date(i.due_date) < now);
    const overdueAmount = overdue.reduce((s, i) => s + num(i.amount), 0);
    const pendingReceivables = openInvoices.reduce((s, i) => s + num(i.amount), 0);
    const totalDueMonth = invoices
      .filter((i) => inMonth(i.due_date) && i.status !== "cancelled")
      .reduce((s, i) => s + num(i.amount), 0);
    const overdueRate = totalDueMonth > 0 ? (overdueAmount / totalDueMonth) * 100 : 0;

    // Ticket médio
    const uniqueStudentsPaid = new Set(
      paidInvoicesMonth.map((i) => i.student_id).filter(Boolean),
    );
    const avgTicket =
      uniqueStudentsPaid.size > 0 ? netMonth / uniqueStudentsPaid.size : 0;

    // -----------------------------------------------------------------
    // MRR — normaliza recorrências ativas para mensal
    // -----------------------------------------------------------------
    const freqFactor: Record<string, number> = {
      monthly: 1,
      bimonthly: 1 / 2,
      quarterly: 1 / 3,
      quadrimestral: 1 / 4,
      semiannual: 1 / 6,
      annual: 1 / 12,
    };
    let mrr = 0;
    for (const r of recurring) {
      const amt = r.custom_amount != null ? num(r.custom_amount) : num(r.plan?.amount);
      if (!amt) continue;
      const factor = freqFactor[r.frequency as string] ?? 1;
      mrr += amt * factor;
    }

    // -----------------------------------------------------------------
    // Evolução 12 meses
    // -----------------------------------------------------------------
    const months: MonthPoint[] = [];
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const matches = (dt?: string | null) => (dt ?? "").startsWith(key);
      const paid = invoices.filter(
        (iv) => iv.status === "paid" && (matches(iv.paid_at) || matches(iv.due_date)),
      );
      const gross = paid.reduce((s, iv) => s + num(iv.gross_amount ?? iv.amount), 0);
      const net = paid.reduce((s, iv) => s + num(iv.net_amount ?? iv.amount), 0);
      const fees = paid.reduce(
        (s, iv) => s + num(iv.gateway_fee_amount) + num(iv.platform_fee_amount),
        0,
      );
      const desp = expenses
        .filter(
          (ex) => ex.status === "paid" && (matches(ex.paid_at) || matches(ex.due_date)),
        )
        .reduce((s, ex) => s + num(ex.amount), 0);
      months.push({ key, label, gross, net, fees, expenses: desp, balance: net - desp });
    }

    // -----------------------------------------------------------------
    // Projeção de fluxo de caixa (D+7, D+15, D+30, D+60)
    // Baseada em faturas pendentes com due_date e recorrências
    // -----------------------------------------------------------------
    const upcomingByDay = new Map<string, number>();
    for (const iv of openInvoices) {
      const k = dayISO(iv.due_date);
      const d = isoToDate(k);
      if (k < todayISO() || d > in60) continue;
      upcomingByDay.set(k, (upcomingByDay.get(k) ?? 0) + num(iv.amount));
    }
    for (const r of recurring) {
      if (!r.next_run_at) continue;
      const k = dayISO(r.next_run_at);
      const d = isoToDate(k);
      if (k < todayISO() || d > in60) continue;
      const amt = r.custom_amount != null ? num(r.custom_amount) : num(r.plan?.amount);
      if (!amt) continue;
      upcomingByDay.set(k, (upcomingByDay.get(k) ?? 0) + amt);
    }
    const sumWithin = (days: number) => {
      const limit = new Date(now.getTime() + days * 86_400_000);
      let s = 0;
      for (const [dk, v] of upcomingByDay) {
        if (new Date(dk) <= limit) s += v;
      }
      return s;
    };
    const projection: ProjectionPoint[] = [
      { label: "D+7", days: 7, amount: sumWithin(7) },
      { label: "D+15", days: 15, amount: sumWithin(15) },
      { label: "D+30", days: 30, amount: sumWithin(30) },
      { label: "D+60", days: 60, amount: sumWithin(60) },
    ];

    // -----------------------------------------------------------------
    // Métodos de pagamento
    // -----------------------------------------------------------------
    const methodMap = new Map<string, number>();
    for (const i of paidInvoicesMonth) {
      const k = (i.method ?? "outros").toString();
      methodMap.set(k, (methodMap.get(k) ?? 0) + num(i.net_amount ?? i.amount));
    }
    const paymentMethods = Array.from(methodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // -----------------------------------------------------------------
    // Top 5 alunos por receita no mês
    // -----------------------------------------------------------------
    const perStudent = new Map<string, number>();
    for (const i of paidInvoicesMonth) {
      if (!i.student_id) continue;
      perStudent.set(
        i.student_id,
        (perStudent.get(i.student_id) ?? 0) + num(i.net_amount ?? i.amount),
      );
    }
    const topStudents = Array.from(perStudent.entries())
      .map(([id, amount]) => ({
        id,
        name: students.get(id) ?? "Aluno",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      wallet: {
        available,
        pending,
        blocked,
        total: totalBalance,
      },
      month: {
        gross: grossMonth,
        net: netMonth,
        gatewayFees: gatewayFeesMonth,
        platformFees: platformFeesMonth,
        totalFees: totalFeesMonth,
        feeRate: feeRateMonth,
        expenses: expensesMonth,
        profit: netProfitMonth,
        avgTicket,
        payersCount: uniqueStudentsPaid.size,
      },
      pipeline: {
        pendingReceivables,
        overdueAmount,
        overdueCount: overdue.length,
        overdueRate,
        openCount: openInvoices.length,
      },
      mrr,
      months,
      projection,
      paymentMethods,
      topStudents,
      generatedAt: new Date().toISOString(),
    };
  });
