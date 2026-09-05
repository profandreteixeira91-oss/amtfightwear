import { calendarISO, todayISO } from "@/lib/dates";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listDojoInvoices,
  listDojoExpenses,
  dojoFinanceOverview,
} from "@/lib/dojo/dojo.functions";

// ============ Money helpers ============
export const brl = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (n: number) =>
  `${(Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const isoDate = (d?: Date) => (d ? calendarISO(d) : todayISO());

/** Formata datas (ISO "YYYY-MM-DD" ou timestamp) no padrão brasileiro DD/MM/AAAA */
export { brDate } from "@/lib/dates";

export const monthLabel = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
};

export const daysBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
};

// ============ Local settings (prepared architecture) ============
export type FinanceSettings = {
  currency: string;
  decimals: number;
  defaultDueDay: number;
  latePenaltyPct: number;
  monthlyInterestPct: number;
  earlyDiscountPct: number;
  reminderBeforeDays: number;
  reminderAfterDays: number;
  blockCertsWhenOverdue: boolean;
  chargeMessage: string;
  categories: string[];
  costCenters: string[];
  bankAccounts: { id: string; name: string; type: string; pix?: string }[];
};

const SETTINGS_KEY = "amt.finance.settings.v1";
const DEFAULT_SETTINGS: FinanceSettings = {
  currency: "BRL",
  decimals: 2,
  defaultDueDay: 5,
  latePenaltyPct: 2,
  monthlyInterestPct: 1,
  earlyDiscountPct: 0,
  reminderBeforeDays: 3,
  reminderAfterDays: 3,
  blockCertsWhenOverdue: true,
  chargeMessage:
    "Olá {{aluno}}! Sua mensalidade de {{valor}} vence em {{vencimento}}. Boa treino!",
  categories: [
    "Mensalidades",
    "Matrículas",
    "Graduações",
    "Eventos",
    "Competições",
    "Uniformes",
    "Equipamentos",
    "Marketing",
    "Salários",
    "Aluguel",
    "Energia",
    "Internet",
    "Limpeza",
    "Outros",
  ],
  costCenters: [
    "Academia Matriz",
    "Filial Centro",
    "Loja",
    "Eventos",
    "Competições",
    "Administrativo",
    "Marketing",
  ],
  bankAccounts: [
    { id: "caixa", name: "Caixa geral", type: "cash" },
  ],
};

export function useFinanceSettings() {
  const [settings, setSettings] = useState<FinanceSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);
  const save = (next: FinanceSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };
  return { settings, save };
}

// ============ Shared data hooks ============
export function useInvoices(status = "all") {
  const fn = useServerFn(listDojoInvoices);
  return useQuery({
    queryKey: ["dojo-invoices", status],
    queryFn: () => fn({ data: { status } }),
  });
}

export function useExpenses() {
  const fn = useServerFn(listDojoExpenses);
  return useQuery({ queryKey: ["dojo-expenses"], queryFn: () => fn() });
}

export function useOverview() {
  const fn = useServerFn(dojoFinanceOverview);
  return useQuery({
    queryKey: ["dojo-finance"],
    queryFn: () => fn({ data: {} }),
  });
}

// ============ Derived KPIs ============
export type InvoiceRow = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string;
  paid_at?: string | null;
  method?: string | null;
  description?: string | null;
  student_id?: string | null;
  payment_link?: string | null;
  asaas_invoice_url?: string | null;
  student?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    guardian_phone?: string | null;
  } | null;
};
export type ExpenseRow = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  due_date: string;
  paid_at?: string | null;
  description: string;
  category?: string | null;
};

export function useFinanceKpis() {
  const inv = useInvoices("all");
  const exp = useExpenses();
  const invoices = (inv.data ?? []) as InvoiceRow[];
  const expenses = (exp.data ?? []) as ExpenseRow[];

  return useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const inMonth = (d: string) => {
      const t = new Date(d).getTime();
      return t >= monthStart.getTime() && t <= monthEnd.getTime() + 86_400_000;
    };

    const paidThisMonth = invoices
      .filter((i) => i.status === "paid" && (i.paid_at ? inMonth(i.paid_at) : inMonth(i.due_date)))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const expensesThisMonth = expenses
      .filter((e) => e.status === "paid" && (e.paid_at ? inMonth(e.paid_at) : inMonth(e.due_date)))
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const netProfit = paidThisMonth - expensesThisMonth;

    const pendingReceivables = invoices
      .filter((i) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const overdue = invoices.filter(
      (i) => i.status !== "paid" && i.status !== "cancelled" && new Date(i.due_date) < now,
    );
    const overdueAmount = overdue.reduce((s, i) => s + Number(i.amount || 0), 0);

    const totalMonthDue = invoices
      .filter((i) => inMonth(i.due_date) && i.status !== "cancelled")
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const overdueRate = totalMonthDue > 0 ? (overdueAmount / totalMonthDue) * 100 : 0;

    const uniqueStudentsPaid = new Set(
      invoices.filter((i) => i.status === "paid" && i.paid_at && inMonth(i.paid_at)).map((i) => i.student_id),
    ).size;
    const avgTicket = uniqueStudentsPaid > 0 ? paidThisMonth / uniqueStudentsPaid : 0;

    // MRR = active recurring invoices sum, approximated by paid last 30d.
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const mrr = invoices
      .filter((i) => i.status === "paid" && i.paid_at && new Date(i.paid_at).getTime() >= thirtyDaysAgo)
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const pendingPayables = expenses
      .filter((e) => e.status !== "paid")
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    // 12 months evolution
    const months: { key: string; label: string; receitas: number; despesas: number; saldo: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = monthStartISO(addMonthsISO(today, -i));
      const key = start.slice(0, 7);
      const year = parseInt(key.slice(0, 4));
      const mo = parseInt(key.slice(5, 7));
      const label = new Date(Date.UTC(year, mo - 1, 12)).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
      const inThisMonth = (dt?: string | null) => (dt ?? "").startsWith(key);
      const receitas = invoices
        .filter((iv) => iv.status === "paid" && (inThisMonth(iv.paid_at) || inThisMonth(iv.due_date)))
        .reduce((s, iv) => s + Number(iv.amount || 0), 0);
      const despesas = expenses
        .filter((ex) => ex.status === "paid" && (inThisMonth(ex.paid_at) || inThisMonth(ex.due_date)))
        .reduce((s, ex) => s + Number(ex.amount || 0), 0);
      months.push({ key, label, receitas, despesas, saldo: receitas - despesas });
    }

    // Payment methods breakdown (paid invoices)
    const methodMap = new Map<string, number>();
    invoices
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        const k = i.method || "outros";
        methodMap.set(k, (methodMap.get(k) || 0) + Number(i.amount || 0));
      });
    const paymentMethods = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }));

    return {
      loading: inv.isLoading || exp.isLoading,
      invoices,
      expenses,
      paidThisMonth,
      expensesThisMonth,
      netProfit,
      pendingReceivables,
      overdueAmount,
      overdueCount: overdue.length,
      overdueRate,
      avgTicket,
      mrr,
      pendingPayables,
      months,
      paymentMethods,
      projectedCashflow: paidThisMonth + pendingReceivables - pendingPayables,
    };
  }, [inv.data, exp.data, inv.isLoading, exp.isLoading]);
}
