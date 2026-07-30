import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";
import { advanceDate, type RecurringFrequency } from "@/lib/dojo/recurring.functions";

// Roda diariamente. Para toda regra recorrente ativa cujo `next_run_at` seja
// hoje + 3 dias (ou já passou), garante uma fatura pendente para o ciclo.
// Idempotente por (enrollment, mês do vencimento). Respeita pausa, limite de
// parcelas e regras com Asaas Subscriptions (delegadas ao gateway).
export const Route = createFileRoute("/api/public/hooks/generate-dojo-invoices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const target = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3),
        );
        const todayISO = now.toISOString().slice(0, 10);
        const targetISO = target.toISOString().slice(0, 10);

        const { data: enrolls, error } = await supabaseAdmin
          .from("dojo_enrollments")
          .select(
            "id, owner_id, student_id, due_day, custom_amount, frequency, custom_days, next_run_at, paused_until, installments_total, installments_generated, asaas_subscription_id, plan:dojo_plans(amount, name), student:dojo_students(unit_id)",
          )
          .eq("status", "active")
          .is("asaas_subscription_id", null)
          .lte("next_run_at", targetISO);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let created = 0;
        let skipped = 0;
        for (const raw of (enrolls ?? []) as any[]) {
          const e = raw;
          // Respeita pausa temporária.
          if (e.paused_until && e.paused_until >= todayISO) { skipped++; continue; }
          // Respeita limite de parcelas.
          if (e.installments_total && (e.installments_generated ?? 0) >= e.installments_total) {
            skipped++;
            continue;
          }

          // Calcula vencimento efetivo a partir de next_run_at (fallback: mês corrente + due_day).
          const runAt = e.next_run_at
            ? new Date(`${e.next_run_at}T00:00:00Z`)
            : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(e.due_day ?? 5, 28)));
          const ry = runAt.getUTCFullYear();
          const rm = runAt.getUTCMonth();
          const daysInMonth = new Date(Date.UTC(ry, rm + 1, 0)).getUTCDate();
          const dueDay = Math.min(e.due_day ?? runAt.getUTCDate(), daysInMonth);
          const dueDate = `${ry}-${String(rm + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
          const monthStart = `${ry}-${String(rm + 1).padStart(2, "0")}-01`;
          const nextMonth = new Date(Date.UTC(ry, rm + 1, 1)).toISOString().slice(0, 10);

          const { data: existing } = await supabaseAdmin
            .from("dojo_invoices")
            .select("id")
            .eq("enrollment_id", e.id)
            .gte("due_date", monthStart)
            .lt("due_date", nextMonth)
            .maybeSingle();
          if (existing) {
            // Já existe fatura para o ciclo: avança agenda mesmo assim para não travar.
            const next = advanceDate(new Date(dueDate + "T00:00:00Z"), (e.frequency ?? "monthly") as RecurringFrequency, e.custom_days);
            await supabaseAdmin
              .from("dojo_enrollments")
              .update({ next_run_at: next.toISOString().slice(0, 10) } as never)
              .eq("id", e.id);
            skipped++;
            continue;
          }

          const amount = e.custom_amount ?? e.plan?.amount ?? 0;
          const invPayload: any = {
            id: crypto.randomUUID(),
            student_id: e.student_id,
            enrollment_id: e.id,
            unit_id: e.student?.unit_id ?? null,
            owner_id: e.owner_id,
            description: `${e.plan?.name ?? "Mensalidade"} ${monthStart.slice(0, 7)}`,
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
          if (insErr) { skipped++; continue; }

          const next = advanceDate(new Date(dueDate + "T00:00:00Z"), (e.frequency ?? "monthly") as RecurringFrequency, e.custom_days);
          await supabaseAdmin
            .from("dojo_enrollments")
            .update({
              installments_generated: (e.installments_generated ?? 0) + 1,
              last_run_at: dueDate,
              next_run_at: next.toISOString().slice(0, 10),
            } as never)
            .eq("id", e.id);
          created++;
        }

        return Response.json({ ok: true, created, skipped, target: targetISO });
      },
    },
  },
});
