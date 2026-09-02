import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";
import {
  planAdvanceDays,
  planChargeAmount,
  planChargeIntervalMonths,
  planCycleMonths,
  planInstallments,
} from "@/lib/dojo/payment-methods";
import { addDaysISO, addMonthsISO, todayISO as brToday, utcCalendarISO } from "@/lib/dates";

/**
 * Cron diário de geração de mensalidades.
 *
 * Invariantes:
 * - Uma regra ativa SEM `next_run_at` é agendada a partir de `due_day` do mês
 *   corrente (bug histórico: o filtro `lte(next_run_at)` descartava NULL e
 *   nenhuma mensalidade era gerada).
 * - A antecedência é por plano (`rules.billing_advance_days`, padrão 5 dias).
 * - A periodicidade vem do plano (`frequency`/`custom_months`) e o nº de
 *   parcelas (`installments`) define quantas cobranças são geradas dentro do
 *   ciclo: intervalo = ciclo / parcelas e valor = valor do ciclo / parcelas.
 * - Idempotente por (enrollment, mês do vencimento).
 * - Faturas nascem `pending` com vencimento futuro → o app do aluno mostra
 *   "A vencer".
 */
export const Route = createFileRoute("/api/public/hooks/generate-dojo-invoices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const todayISO = brToday();
        // Janela máxima de antecedência suportada (filtro grosso no banco; a
        // decisão fina usa a antecedência configurada em cada plano).
        const maxTargetISO = addDaysISO(todayISO, 60);

        const { data: enrolls, error } = await supabaseAdmin
          .from("dojo_enrollments")
          .select(
            "id, owner_id, student_id, due_day, start_date, custom_amount, next_run_at, paused_until, installments_total, installments_generated, asaas_subscription_id, plan:dojo_plans(amount, name, frequency, custom_months, installments, rules), student:dojo_students(unit_id)",
          )
          .eq("status", "active")
          .is("asaas_subscription_id", null)
          .or(`next_run_at.is.null,next_run_at.lte.${maxTargetISO}`);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let created = 0;
        let skipped = 0;
        for (const raw of (enrolls ?? []) as any[]) {
          const e = raw;
          // Respeita pausa temporária.
          if (e.paused_until && e.paused_until >= todayISO) { skipped++; continue; }
          // Respeita limite de parcelas configurado na regra.
          if (e.installments_total && (e.installments_generated ?? 0) >= e.installments_total) {
            skipped++;
            continue;
          }

          const plan = e.plan ?? {};
          const rules = plan.rules ?? {};
          if (rules.auto_generate_invoice === false) { skipped++; continue; }

          const cycleMonths = planCycleMonths(plan.frequency, plan.custom_months);
          const installments = planInstallments(plan.installments, cycleMonths);
          const intervalMonths = planChargeIntervalMonths(cycleMonths, installments);
          const advanceDays = planAdvanceDays(rules);

          // Vencimento alvo: agenda existente ou `due_day` do mês corrente.
          const dueDayRaw = Number(e.due_day ?? 5);
          let dueDate: string;
          if (e.next_run_at) {
            dueDate = String(e.next_run_at).slice(0, 10);
          } else {
            const [cy, cm] = todayISO.split("-").map(Number);
            const daysInMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
            const day = Math.min(Math.max(1, dueDayRaw), daysInMonth);
            dueDate = `${cy}-${String(cm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          }
          // Nunca gerar antes do início da matrícula.
          if (e.start_date && dueDate < String(e.start_date).slice(0, 10)) {
            const start = String(e.start_date).slice(0, 10);
            const [sy, sm] = start.split("-").map(Number);
            const daysInMonth = new Date(Date.UTC(sy, sm, 0)).getUTCDate();
            const day = Math.min(Math.max(1, dueDayRaw), daysInMonth);
            const candidate = `${sy}-${String(sm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            dueDate = candidate >= start ? candidate : addMonthsISO(candidate, 1);
          }

          // Antecedência configurada no plano.
          if (dueDate > addDaysISO(todayISO, advanceDays)) { skipped++; continue; }

          const [ry, rm] = dueDate.split("-").map(Number);
          const monthStart = `${ry}-${String(rm).padStart(2, "0")}-01`;
          const nextMonth = utcCalendarISO(new Date(Date.UTC(ry, rm, 1)));

          const { data: existing } = await supabaseAdmin
            .from("dojo_invoices")
            .select("id")
            .eq("enrollment_id", e.id)
            .gte("due_date", monthStart)
            .lt("due_date", nextMonth)
            .limit(1)
            .maybeSingle();
          if (existing) {
            // Já existe fatura para o ciclo: avança agenda para não travar.
            await supabaseAdmin
              .from("dojo_enrollments")
              .update({ next_run_at: addMonthsISO(dueDate, intervalMonths) } as never)
              .eq("id", e.id);
            skipped++;
            continue;
          }

          const cycleAmount = Number(e.custom_amount ?? plan.amount ?? 0);
          const amount = planChargeAmount(cycleAmount, installments);
          const invPayload: any = {
            id: crypto.randomUUID(),
            student_id: e.student_id,
            enrollment_id: e.id,
            unit_id: e.student?.unit_id ?? null,
            owner_id: e.owner_id,
            description: `${plan.name ?? "Mensalidade"} ${monthStart.slice(0, 7)}`,
            amount,
            due_date: dueDate,
            status: "pending",
          };
          try {
            const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
            const asaasData = await syncInvoiceWithAsaas(supabaseAdmin as any, invPayload);
            Object.assign(invPayload, asaasData);
          } catch (err) {
            console.warn("[recurring] AMT Pay sync falhou", err);
          }
          const { error: insErr } = await supabaseAdmin.from("dojo_invoices").insert(invPayload);
          if (insErr) {
            console.error("[recurring] falha ao inserir fatura", e.id, insErr.message);
            skipped++;
            continue;
          }

          await supabaseAdmin
            .from("dojo_enrollments")
            .update({
              installments_generated: (e.installments_generated ?? 0) + 1,
              last_run_at: dueDate,
              next_run_at: addMonthsISO(dueDate, intervalMonths),
            } as never)
            .eq("id", e.id);
          created++;
        }

        return Response.json({ ok: true, created, skipped, today: todayISO });
      },
    },
  },
});
