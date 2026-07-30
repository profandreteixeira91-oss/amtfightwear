// Cron — aplica graduações agendadas.
// Uma graduação criada com data de cerimônia futura fica com applied_at = null.
// Ao chegar a data (fuso America/Sao_Paulo), este job troca a faixa do aluno
// no sistema e envia o push de parabéns. Idempotente via applied_at.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/apply-scheduled-graduations")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPushToStudent } = await import("@/lib/push/push.server");

        const todayISO = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date());

        const { data: pending, error } = await (supabaseAdmin as any)
          .from("dojo_graduations")
          .select("id, owner_id, student_id, belt_id, degree, graduation_date")
          .is("applied_at", null)
          .lte("graduation_date", todayISO)
          .order("graduation_date", { ascending: true })
          .limit(500);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!pending || pending.length === 0) {
          return Response.json({ ok: true, applied: 0, today: todayISO });
        }

        // Faixas envolvidas (nome + modalidade).
        const beltIds = [...new Set(pending.map((g: any) => g.belt_id).filter(Boolean))];
        const { data: belts } = await (supabaseAdmin as any)
          .from("dojo_belts")
          .select("id, name, modality")
          .in("id", beltIds);
        const beltById = new Map<string, any>(
          (belts ?? []).map((b: any) => [b.id as string, b] as [string, any]),
        );


        let applied = 0;
        let pushed = 0;

        for (const g of pending as any[]) {
          try {
            // Marca como aplicada primeiro (evita duplicidade se o job repetir).
            const { data: claimed } = await (supabaseAdmin as any)
              .from("dojo_graduations")
              .update({ applied_at: new Date().toISOString() })
              .eq("id", g.id)
              .is("applied_at", null)
              .select("id")
              .maybeSingle();
            if (!claimed) continue;

            // Recalcula a faixa atual do aluno respeitando a modalidade.
            const { data: student } = await (supabaseAdmin as any)
              .from("dojo_students")
              .select("id, current_belt_id, cancelled_at, dojo_belts:current_belt_id(modality)")
              .eq("id", g.student_id)
              .maybeSingle();

            const currentMod = (student as any)?.dojo_belts?.modality ?? null;
            const newMod = beltById.get(g.belt_id)?.modality ?? "jiu-jitsu";

            // Só sobrescreve se for a mesma modalidade (ou se não houver faixa),
            // e se não houver graduação aplicada mais recente na modalidade.
            const { data: newer } = await (supabaseAdmin as any)
              .from("dojo_graduations")
              .select("id, graduation_date, dojo_belts:belt_id(modality)")
              .eq("student_id", g.student_id)
              .not("applied_at", "is", null)
              .gt("graduation_date", g.graduation_date);
            const hasNewerSameMod = (newer ?? []).some(
              (n: any) => (n?.dojo_belts?.modality ?? "jiu-jitsu") === newMod,
            );

            if (
              !hasNewerSameMod &&
              (!student?.current_belt_id || currentMod === null || currentMod === newMod)
            ) {
              await (supabaseAdmin as any)
                .from("dojo_students")
                .update({ current_belt_id: g.belt_id, current_degree: g.degree ?? 0 })
                .eq("id", g.student_id);
            }
            applied++;

            if (student && !student.cancelled_at) {
              const belt = beltById.get(g.belt_id);
              const degreeTxt =
                typeof g.degree === "number" && g.degree > 0 ? ` — ${g.degree}º grau` : "";
              await sendPushToStudent(
                g.student_id,
                {
                  title: "Parabéns pela graduação! 🥋",
                  body: `Você foi graduado(a): ${belt?.name ?? "Nova faixa"}${degreeTxt}.`,
                  url: "/app/graduacoes",
                  tag: `graduation-${g.id}`,
                },
                "graduation",
              );
              pushed++;
            }
          } catch (err: any) {
            console.warn("[apply-scheduled-graduations] falha", {
              graduation: g.id,
              err: err?.message ?? err,
            });
          }
        }

        return Response.json({ ok: true, today: todayISO, applied, pushed });
      },
    },
  },
});
