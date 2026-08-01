// Fase 2 do AMT Pay — Cobrança Recorrente unificada.
// A matrícula (`dojo_enrollments`) é a regra recorrente. Cada regra pode ter
// frequência mensal/bimestral/trimestral/semestral/anual ou personalizada,
// limite de parcelas, pausa temporária, cancelamento e agendamento por
// `next_run_at`. As faturas são geradas pelo cron
// `/api/public/hooks/generate-dojo-invoices`.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { todayISO, utcCalendarISO } from "@/lib/dates";

export type RecurringFrequency =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "custom";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  monthly: "Mensal",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

/** Avança uma data conforme a frequência. */
export function advanceDate(from: Date, freq: RecurringFrequency, customDays?: number | null): Date {
  // Métodos UTC: manter o dia escolhido pelo dono do dojo sem deslocar por fuso.
  const d = new Date(from);
  switch (freq) {
    case "monthly": d.setUTCMonth(d.getUTCMonth() + 1); break;
    case "bimonthly": d.setUTCMonth(d.getUTCMonth() + 2); break;
    case "quarterly": d.setUTCMonth(d.getUTCMonth() + 3); break;
    case "semiannual": d.setUTCMonth(d.getUTCMonth() + 6); break;
    case "annual": d.setUTCFullYear(d.getUTCFullYear() + 1); break;
    case "custom": d.setUTCDate(d.getUTCDate() + Math.max(1, customDays ?? 30)); break;
  }
  return d;
}


/** Lista todas as regras de cobrança recorrente do dono. */
export const listRecurringCharges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_enrollments")
      .select(
        "id, student_id, plan_id, custom_amount, due_day, start_date, end_date, status, frequency, custom_days, next_run_at, last_run_at, paused_from, paused_until, installments_total, installments_generated, cancelled_at, notes, payment_method_code, billing_type, asaas_subscription_id, student:dojo_students(id, name, email), plan:dojo_plans(id, name, amount, frequency)"
      )
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Atualiza campos da regra de cobrança recorrente. */
export const updateRecurringCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        frequency: z.enum(["monthly", "bimonthly", "quarterly", "semiannual", "annual", "custom"]).optional(),
        custom_days: z.number().int().min(1).max(365).nullable().optional(),
        custom_amount: z.number().nonnegative().nullable().optional(),
        due_day: z.number().int().min(1).max(31).optional(),
        installments_total: z.number().int().min(1).max(240).nullable().optional(),
        next_run_at: z.string().nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
        payment_method_code: z.string().nullable().optional(),
      })
      .parse(i)
  )
  .handler(async ({ context, data }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("dojo_enrollments")
      .update(rest as never)
      .eq("id", id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Pausa a cobrança (não gera novas faturas no período informado). */
export const pauseRecurringCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), until: z.string().nullable().optional() }).parse(i)
  )
  .handler(async ({ context, data }) => {
    const today = todayISO();
    const { error } = await context.supabase
      .from("dojo_enrollments")
      .update({ status: "paused", paused_from: today, paused_until: data.until ?? null } as never)
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Retoma a cobrança. */
export const resumeRecurringCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("dojo_enrollments")
      .update({ status: "active", paused_from: null, paused_until: null } as never)
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cancela a cobrança recorrente definitivamente. */
export const cancelRecurringCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("dojo_enrollments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera imediatamente a próxima fatura pendente. Idempotente por mês. */
export const generateNextInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { data: enr, error } = await context.supabase
      .from("dojo_enrollments")
      .select(
        "id, owner_id, student_id, due_day, custom_amount, frequency, custom_days, next_run_at, installments_total, installments_generated, plan:dojo_plans(amount, name), student:dojo_students(unit_id)"
      )
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error || !enr) throw new Error(error?.message ?? "Cobrança não encontrada");
    const e = enr as any;

    if (e.installments_total && e.installments_generated >= e.installments_total) {
      throw new Error("Limite de parcelas atingido");
    }

    const target = e.next_run_at
      ? new Date(`${e.next_run_at}T00:00:00Z`)
      : new Date();
    const ty = target.getUTCFullYear();
    const tm = target.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    const day = Math.min(e.due_day ?? 5, daysInMonth);
    const dueDate = `${ty}-${String(tm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const monthStart = `${ty}-${String(tm + 1).padStart(2, "0")}-01`;
    const nextMonth = utcCalendarISO(new Date(Date.UTC(ty, tm + 1, 1)));

    const { data: existing } = await context.supabase
      .from("dojo_invoices")
      .select("id")
      .eq("enrollment_id", e.id)
      .gte("due_date", monthStart)
      .lt("due_date", nextMonth)
      .maybeSingle();
    if (existing) return { ok: true, invoice_id: (existing as any).id, skipped: true };

    const amount = e.custom_amount ?? e.plan?.amount ?? 0;
    const invPayload: any = {
      student_id: e.student_id,
      enrollment_id: e.id,
      unit_id: e.student?.unit_id ?? null,
      owner_id: context.userId,
      description: `${e.plan?.name ?? "Mensalidade"} ${monthStart.slice(0, 7)}`,
      amount,
      due_date: dueDate,
      status: "pending",
    };
    const { data: inv, error: insErr } = await context.supabase
      .from("dojo_invoices")
      .insert(invPayload)
      .select("id")
      .maybeSingle();
    if (insErr) throw new Error(insErr.message);

    // Avança next_run_at conforme frequência.
    const next = advanceDate(new Date(dueDate + "T00:00:00Z"), e.frequency, e.custom_days);
    await context.supabase
      .from("dojo_enrollments")
      .update({
        installments_generated: (e.installments_generated ?? 0) + 1,
        last_run_at: dueDate,
        next_run_at: next.toISOString().slice(0, 10),
      } as never)
      .eq("id", e.id);

    return { ok: true, invoice_id: (inv as any)?.id };
  });
