import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addMonthsISO, monthStartISO, todayISO, ymd } from "@/lib/dates";
import type { PlanRules } from "@/lib/dojo/payment-methods";

const UUID = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "UUID inválido",
  );

const MONTHS_AHEAD = 12;

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function dueDateFor(month: string, dueDay: number): string {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
  return ymd(y, m, Math.min(Math.max(dueDay || 1, 1), lastDay));
}

/**
 * Contexto de antecipação de mensalidades de um aluno:
 * plano vigente, valor, dia de vencimento e situação de cada mês à frente.
 */
export const getStudentPrepayContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ studentId: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: enrollments, error } = await context.supabase
      .from("dojo_enrollments")
      .select("id, custom_amount, due_day, status, cancelled_at, plan:dojo_plans(id, name, amount, rules)")
      .eq("student_id", data.studentId)
      .is("cancelled_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const active = (enrollments ?? []).find((e: any) =>
      !e.status || ["active", "overdue", "trial", "pending"].includes(String(e.status)),
    ) as any;

    if (!active) {
      return {
        allowPrepay: false as const,
        reason: "Este aluno não possui matrícula ativa em nenhum plano.",
        planName: null,
        amount: 0,
        dueDay: 5,
        enrollmentId: null,
        months: [],
      };
    }

    const rules = ((active.plan?.rules ?? {}) as PlanRules) || {};
    const amount = Number(active.custom_amount ?? active.plan?.amount ?? 0);
    const dueDay = Number(active.due_day ?? 5);

    const start = monthStartISO(todayISO());
    const monthsIso = Array.from({ length: MONTHS_AHEAD }, (_, i) => addMonthsISO(start, i));
    const from = dueDateFor(monthKey(monthsIso[0]), 1);
    const to = dueDateFor(monthKey(monthsIso[MONTHS_AHEAD - 1]), 31);

    const { data: invoices, error: invErr } = await context.supabase
      .from("dojo_invoices")
      .select("id, due_date, status, amount, description")
      .eq("student_id", data.studentId)
      .gte("due_date", from)
      .lte("due_date", to);
    if (invErr) throw new Error(invErr.message);

    const byMonth = new Map<string, any>();
    for (const inv of invoices ?? []) {
      const key = monthKey(String((inv as any).due_date));
      const current = byMonth.get(key);
      // Prioriza a cobrança em aberto do mês (é a que será antecipada)
      if (!current || (current.status === "paid" && (inv as any).status !== "paid")) {
        byMonth.set(key, inv);
      }
    }

    const months = monthsIso.map((iso) => {
      const key = monthKey(iso);
      const inv = byMonth.get(key);
      return {
        month: key,
        dueDate: inv ? String(inv.due_date).slice(0, 10) : dueDateFor(key, dueDay),
        invoiceId: inv?.id ?? null,
        status: (inv?.status as string | undefined) ?? null,
        amount: Number(inv?.amount ?? amount),
      };
    });

    return {
      allowPrepay: rules.allow_prepay !== false,
      reason: rules.allow_prepay === false ? "O plano deste aluno não permite pagamento antecipado." : null,
      planName: (active.plan?.name as string | undefined) ?? null,
      amount,
      dueDay,
      enrollmentId: active.id as string,
      months,
    };
  });

/**
 * Antecipa a mensalidade de um mês que ainda não teve cobrança gerada:
 * cria a mensalidade já marcada como PAGA (sem gateway, pois já foi recebida).
 */
export const createPrepaidInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        studentId: UUID,
        enrollmentId: UUID.nullish(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
        amount: z.number().positive(),
        description: z.string().min(1).max(300),
        method: z.string().max(30).default("cash"),
        paidAt: z.string().datetime().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    // Garante que o aluno pertence ao dono autenticado (RLS + checagem explícita)
    const { data: student, error: sErr } = await context.supabase
      .from("dojo_students")
      .select("id, unit_id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("Aluno não encontrado");

    const { data: row, error } = await context.supabase
      .from("dojo_invoices")
      .insert({
        id: crypto.randomUUID(),
        student_id: data.studentId,
        enrollment_id: data.enrollmentId ?? null,
        unit_id: (student as any).unit_id ?? null,
        description: data.description,
        amount: data.amount,
        due_date: data.dueDate,
        status: "paid",
        paid_at: data.paidAt ?? new Date().toISOString(),
        method: data.method,
        owner_id: context.userId,
        source: "prepay",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });
