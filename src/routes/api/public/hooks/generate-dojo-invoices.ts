import { createFileRoute } from "@tanstack/react-router";

// Runs daily. For every active enrollment whose due_day (capped to the month's
// last day) equals today + 3 days, ensure a pending invoice exists for that
// month with due_date = target date. Idempotent per enrollment/month.
export const Route = createFileRoute("/api/public/hooks/generate-dojo-invoices")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const target = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 3,
        ));
        const ty = target.getUTCFullYear();
        const tm = target.getUTCMonth(); // 0-based
        const td = target.getUTCDate();
        const daysInMonth = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
        const referenceMonth = `${ty}-${String(tm + 1).padStart(2, "0")}`;
        const dueDate = `${referenceMonth}-${String(td).padStart(2, "0")}`;
        const monthStart = `${referenceMonth}-01`;
        const nextMonth = new Date(Date.UTC(ty, tm + 1, 1)).toISOString().slice(0, 10);

        const { data: enrolls, error } = await supabaseAdmin
          .from("dojo_enrollments")
          .select("id, owner_id, student_id, due_day, custom_amount, plan:dojo_plans(amount), student:dojo_students(unit_id)")
          .eq("status", "active");
        if (error) return Response.json({ error: error.message }, { status: 500 });

        let created = 0;
        let skipped = 0;
        for (const e of (enrolls ?? []) as any[]) {
          const rawDay = Number(e.due_day ?? 5);
          const cappedDay = Math.min(Math.max(rawDay, 1), daysInMonth);
          if (cappedDay !== td) { skipped++; continue; }

          const { data: existing } = await supabaseAdmin
            .from("dojo_invoices")
            .select("id")
            .eq("enrollment_id", e.id)
            .gte("due_date", monthStart)
            .lt("due_date", nextMonth)
            .maybeSingle();
          if (existing) { skipped++; continue; }

          const amount = e.custom_amount ?? e.plan?.amount ?? 0;
          const { error: insErr } = await supabaseAdmin.from("dojo_invoices").insert({
            student_id: e.student_id,
            enrollment_id: e.id,
            unit_id: e.student?.unit_id ?? null,
            owner_id: e.owner_id,
            description: `Mensalidade ${referenceMonth}`,
            amount,
            due_date: dueDate,
            status: "pending",
          });
          if (!insErr) created++;
        }

        return Response.json({ ok: true, created, skipped, target: dueDate });
      },
    },
  },
});
