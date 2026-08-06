// Cron — Processa assinaturas e graduações.
import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

export const Route = createFileRoute("/api/public/hooks/apply-scheduled-graduations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPushToStudent } = await import("@/lib/push/push.server");

        const todayDate = new Date();
        const todayISO = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(todayDate);

        // ============================================================
        // 1) GRADUAÇÕES AGENDADAS
        // ============================================================
        const { data: pendingGrads } = await (supabaseAdmin as any)
          .from("dojo_graduations")
          .select("id, owner_id, student_id, belt_id, degree, graduation_date")
          .is("applied_at", null)
          .lte("graduation_date", todayISO)
          .order("graduation_date", { ascending: true })
          .limit(200);

        let gradsApplied = 0;
        if (pendingGrads?.length) {
          const beltIds = [...new Set(pendingGrads.map((g: any) => g.belt_id).filter(Boolean))];
          const { data: belts } = await (supabaseAdmin as any)
            .from("dojo_belts")
            .select("id, name, modality")
            .in("id", beltIds);
          const beltById = new Map((belts ?? []).map((b: any) => [b.id, b]));

          for (const g of pendingGrads) {
            try {
              const { data: claimed } = await (supabaseAdmin as any)
                .from("dojo_graduations")
                .update({ applied_at: new Date().toISOString() })
                .eq("id", g.id)
                .is("applied_at", null)
                .select("id")
                .maybeSingle();
              if (!claimed) continue;

              const { data: student } = await (supabaseAdmin as any)
                .from("dojo_students")
                .select("id, current_belt_id, cancelled_at, dojo_belts:current_belt_id(modality)")
                .eq("id", g.student_id)
                .maybeSingle();

              const currentMod = (student as any)?.dojo_belts?.modality ?? null;
              const newMod = beltById.get(g.belt_id)?.modality ?? "jiu-jitsu";

              const { data: newer } = await (supabaseAdmin as any)
                .from("dojo_graduations")
                .select("id, graduation_date, dojo_belts:belt_id(modality)")
                .eq("student_id", g.student_id)
                .not("applied_at", "is", null)
                .gt("graduation_date", g.graduation_date);
              const hasNewerSameMod = (newer ?? []).some(
                (n: any) => (n?.dojo_belts?.modality ?? "jiu-jitsu") === newMod,
              );

              if (!hasNewerSameMod && (!student?.current_belt_id || currentMod === null || currentMod === newMod)) {
                await (supabaseAdmin as any)
                  .from("dojo_students")
                  .update({ current_belt_id: g.belt_id, current_degree: g.degree ?? 0 })
                  .eq("id", g.student_id);
              }
              gradsApplied++;

              if (student && !student.cancelled_at) {
                const belt = beltById.get(g.belt_id);
                const degreeTxt = typeof g.degree === "number" && g.degree > 0 ? ` — ${g.degree}º grau` : "";
                await sendPushToStudent(g.student_id, {
                  title: "Parabéns pela graduação! 🥋",
                  body: `Você foi graduado(a): ${belt?.name ?? "Nova faixa"}${degreeTxt}.`,
                  url: "/app/graduacoes",
                  tag: `graduation-${g.id}`,
                }, "graduation");
              }
            } catch (err) {}
          }
        }

        // ============================================================
        // 2) RENOVAÇÃO DE ASSINATURAS PIX
        // ============================================================
        // Busca assinaturas PIX que vencem em breve (ex: 3 dias) ou já venceram
        // e que ainda não têm uma nova cobrança pendente.
        const threeDaysAhead = new Date();
        threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
        const threeDaysAheadISO = threeDaysAhead.toISOString().split("T")[0];

        const { data: subsToRenew } = await (supabaseAdmin as any)
          .from("dojo_subscriptions")
          .select("id, owner_id, status, subscription_type, next_due_date, current_payment_status")
          .eq("subscription_type", "pix")
          .eq("status", "active")
          .lte("next_due_date", threeDaysAheadISO)
          .not("current_payment_status", "eq", "pending") // Só renova se o atual não estiver pendente
          .limit(100);

        let pixRenewals = 0;
        if (subsToRenew?.length) {
          const { PLAN_AMOUNT } = await import("@/lib/dojo/subscription.functions");
          const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

          for (const sub of subsToRenew) {
            try {
              // Busca e-mail do dono
              const { data: owner } = await supabaseAdmin.auth.admin.getUserById(sub.owner_id);
              const email = owner.user?.email;
              if (!email || !mpToken) continue;

              // Gera novo pagamento PIX
              const res = await fetch("https://api.mercadopago.com/v1/payments", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${mpToken}`,
                  "Content-Type": "application/json",
                  "X-Idempotency-Key": `renew-${sub.id}-${sub.next_due_date}`,
                },
                body: JSON.stringify({
                  transaction_amount: PLAN_AMOUNT,
                  description: "Renovação AMT Dojo Manager — PIX",
                  payment_method_id: "pix",
                  external_reference: `dojo_sub_pix_payment:${sub.id}`,
                  payer: { email },
                }),
              });

              if (res.ok) {
                const payment = await res.json();
                await (supabaseAdmin as any)
                  .from("dojo_subscriptions")
                  .update({
                    last_payment_id: String(payment.id),
                    current_payment_status: "pending",
                    last_qr_code: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                    last_copy_paste: payment.point_of_interaction?.transaction_data?.qr_code,
                  })
                  .eq("id", sub.id);
                pixRenewals++;
                
                // Notifica o dono via push ou similar (opcional, já vai receber o e-mail do MP)
              }
            } catch (err) {}
          }
        }

        // ============================================================
        // 3) SUSPENSÃO POR ATRASO (PIX)
        // ============================================================
        // Suspende se estiver vencido há mais de 5 dias
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const fiveDaysAgoISO = fiveDaysAgo.toISOString().split("T")[0];

        const { data: overdueSubs } = await (supabaseAdmin as any)
          .from("dojo_subscriptions")
          .select("id")
          .eq("subscription_type", "pix")
          .eq("status", "active")
          .lte("next_due_date", fiveDaysAgoISO)
          .not("current_payment_status", "eq", "approved")
          .limit(100);

        if (overdueSubs?.length) {
          const ids = overdueSubs.map((s: any) => s.id);
          await (supabaseAdmin as any)
            .from("dojo_subscriptions")
            .update({ status: "suspended" })
            .in("id", ids);
        }

        return Response.json({ 
          ok: true, 
          today: todayISO, 
          gradsApplied, 
          pixRenewals, 
          suspended: overdueSubs?.length ?? 0 
        });
      },
    },
  },
});
