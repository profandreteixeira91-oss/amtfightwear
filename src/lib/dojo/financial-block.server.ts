// Regras financeiras dos planos que restringem o aluno:
//  - suspend_checkin + suspend_checkin_days  → impede novos check-ins
//  - block_after_days                        → impede o acesso ao app do aluno
//
// A referência é sempre a mensalidade VENCIDA mais antiga (status pending/overdue
// com vencimento anterior a hoje no fuso America/Sao_Paulo).

import { diffDaysISO, todayISO } from "@/lib/dates";
import type { PlanRules } from "@/lib/dojo/payment-methods";

export const CHECKIN_BLOCK_MESSAGE =
  "Você possui pendências financeiras, regularize para continuar a fazer check-ins normalmente";

export const LOGIN_BLOCK_MESSAGE =
  "Seu acesso está bloqueado por pendências financeiras. Regularize com a sua academia para voltar a usar o app.";

export type FinancialBlock = {
  /** Dias corridos desde o vencimento da mensalidade vencida mais antiga (0 se não houver). */
  daysLate: number;
  checkinBlocked: boolean;
  loginBlocked: boolean;
};

type QueryClient = { from: (table: string) => any };

const NO_BLOCK: FinancialBlock = { daysLate: 0, checkinBlocked: false, loginBlocked: false };

function normDays(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Avalia as restrições financeiras de um aluno específico. */
export async function evaluateFinancialBlock(
  client: QueryClient,
  studentId: string,
): Promise<FinancialBlock> {
  const today = todayISO();

  const { data: invoices } = await client
    .from("dojo_invoices")
    .select("due_date")
    .eq("student_id", studentId)
    .in("status", ["pending", "overdue"])
    .lt("due_date", today)
    .order("due_date", { ascending: true })
    .limit(1);

  const oldest = (invoices ?? [])[0]?.due_date as string | undefined;
  if (!oldest) return NO_BLOCK;

  const daysLate = Math.max(0, diffDaysISO(String(oldest).slice(0, 10), today));

  const { data: enrollments } = await client
    .from("dojo_enrollments")
    .select("status, cancelled_at, plan:dojo_plans(rules)")
    .eq("student_id", studentId);

  let checkinBlocked = false;
  let loginBlocked = false;

  for (const e of (enrollments ?? []) as any[]) {
    if (e?.cancelled_at) continue;
    if (e?.status && !["active", "overdue", "trial", "pending"].includes(String(e.status))) continue;
    const rules = (e?.plan?.rules ?? {}) as PlanRules;

    if (rules.suspend_checkin) {
      const threshold = normDays(rules.suspend_checkin_days) ?? 0;
      if (daysLate >= threshold) checkinBlocked = true;
    }

    const blockAfter = normDays(rules.block_after_days);
    if (blockAfter != null && daysLate >= blockAfter) loginBlocked = true;
  }

  return { daysLate, checkinBlocked, loginBlocked };
}

/** Lança erro amigável quando o aluno está impedido de fazer check-in. */
export async function assertCheckinAllowed(client: QueryClient, studentId: string): Promise<void> {
  const status = await evaluateFinancialBlock(client, studentId);
  if (status.checkinBlocked) throw new Error(CHECKIN_BLOCK_MESSAGE);
}

/** Avalia o bloqueio de login para uma lista de fichas do mesmo e-mail. */
export async function anyLoginBlocked(
  client: QueryClient,
  studentIds: string[],
): Promise<boolean> {
  for (const id of studentIds) {
    const status = await evaluateFinancialBlock(client, id);
    if (status.loginBlocked) return true;
  }
  return false;
}
