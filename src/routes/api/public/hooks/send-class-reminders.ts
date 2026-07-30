// Cron — dispara lembretes de aulas para o app do aluno.
// Roda a cada 5 minutos e verifica, para cada owner com prefs ativas,
// quais aulas iniciam dentro dos offsets configurados (em minutos)
// no fuso horário da academia. Idempotente via dojo_class_reminders_sent.
import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

type ExtrasShape = {
  class_reminder_offsets_min?: number[];
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce((acc: any, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {} as Record<string, string>);
  const hour = parts.hour === "24" ? 0 : parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  const weekday = WEEKDAY_MAP[parts.weekday] ?? 0;
  const dateISO = `${parts.year}-${parts.month}-${parts.day}`;
  return { weekday, minuteOfDay: hour * 60 + minute, dateISO };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export const Route = createFileRoute("/api/public/hooks/send-class-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { sendPushToStudent } = await import("@/lib/push/push.server");

        // Carrega prefs de todos os donos com class_reminder ativado.
        const { data: prefsRows } = await (supabaseAdmin as any)
          .from("dojo_student_notification_prefs")
          .select("owner_id, categories, extras");

        const ownersToProcess: Array<{ ownerId: string; offsets: number[] }> = [];
        for (const row of prefsRows ?? []) {
          const categories = (row.categories ?? {}) as Record<string, boolean>;
          if (categories.class_reminder === false) continue;
          const extras = (row.extras ?? {}) as ExtrasShape;
          const raw = Array.isArray(extras.class_reminder_offsets_min)
            ? extras.class_reminder_offsets_min
            : [60, 15];
          const offsets = raw
            .map((n) => Math.round(Number(n)))
            .filter((n) => Number.isFinite(n) && n >= 0 && n <= 720);
          if (offsets.length === 0) continue;
          ownersToProcess.push({ ownerId: row.owner_id, offsets });
        }

        if (ownersToProcess.length === 0) {
          return Response.json({ ok: true, scanned: 0, sent: 0, reason: "no_owners" });
        }

        const now = new Date();
        let scanned = 0;
        let sent = 0;
        let skipped = 0;

        for (const { ownerId, offsets } of ownersToProcess) {
          // Timezone do dojo (default America/Sao_Paulo)
          const { data: checkin } = await (supabaseAdmin as any)
            .from("dojo_checkin_settings")
            .select("timezone")
            .eq("owner_id", ownerId)
            .maybeSingle();
          const timezone = checkin?.timezone || "America/Sao_Paulo";
          const { weekday, minuteOfDay, dateISO } = localParts(now, timezone);

          // Aulas ativas do dono para hoje.
          const { data: schedules } = await (supabaseAdmin as any)
            .from("dojo_class_schedules")
            .select(
              "class_id, start_time, weekday, dojo_classes!inner(name, status, owner_id)",
            )
            .eq("owner_id", ownerId)
            .eq("weekday", weekday);

          if (!schedules || schedules.length === 0) continue;

          // Para cada offset configurado, checa se alguma aula inicia
          // no minuto atual + offset (com tolerância de +/- 2 min para o cron de 5 min).
          const TOLERANCE = 3;
          for (const s of schedules) {
            if ((s as any).dojo_classes?.status && (s as any).dojo_classes.status !== "active") continue;
            const startMin = timeToMinutes(String(s.start_time));
            for (const off of offsets) {
              const target = startMin - off;
              if (Math.abs(target - minuteOfDay) > TOLERANCE) continue;
              // Somente disparos futuros — evita reenvio depois da aula.
              if (target < minuteOfDay - TOLERANCE) continue;

              scanned++;

              // Alunos ativos matriculados na turma.
              const { data: enrolls } = await (supabaseAdmin as any)
                .from("dojo_class_students")
                .select("student_id")
                .eq("class_id", s.class_id)
                .eq("status", "active");

              const studentIds = (enrolls ?? [])
                .map((e: any) => e.student_id)
                .filter(Boolean);
              if (studentIds.length === 0) continue;

              // Filtra alunos ativos (não congelados/cancelados).
              const { data: students } = await (supabaseAdmin as any)
                .from("dojo_students")
                .select("id, full_name, status, cancelled_at")
                .in("id", studentIds);

              const eligible = (students ?? []).filter(
                (st: any) =>
                  !st.cancelled_at &&
                  st.status !== "frozen" &&
                  st.status !== "cancelled",
              );

              const className = (s as any).dojo_classes?.name ?? "Aula";
              const startHH = String(Math.floor(startMin / 60)).padStart(2, "0");
              const startMM = String(startMin % 60).padStart(2, "0");

              for (const st of eligible) {
                // Idempotência
                const { data: existing } = await (supabaseAdmin as any)
                  .from("dojo_class_reminders_sent")
                  .select("id")
                  .eq("student_id", st.id)
                  .eq("class_id", s.class_id)
                  .eq("occurrence_date", dateISO)
                  .eq("occurrence_start_time", String(s.start_time))
                  .eq("offset_minutes", off)
                  .maybeSingle();
                if (existing) {
                  skipped++;
                  continue;
                }

                try {
                  const bodyText =
                    off === 0
                      ? `${className} começa agora (${startHH}:${startMM})`
                      : `${className} começa em ${off} min · ${startHH}:${startMM}`;
                  await sendPushToStudent(
                    st.id,
                    {
                      title: "Lembrete de aula",
                      body: bodyText,
                      url: "/app/schedule",
                      tag: `class-${s.class_id}-${dateISO}-${off}`,
                      data: {
                        classId: s.class_id,
                        date: dateISO,
                        startTime: String(s.start_time),
                        offsetMinutes: off,
                      },
                    },
                    "class_reminder",
                  );

                  await (supabaseAdmin as any)
                    .from("dojo_class_reminders_sent")
                    .insert({
                      owner_id: ownerId,
                      student_id: st.id,
                      class_id: s.class_id,
                      occurrence_date: dateISO,
                      occurrence_start_time: String(s.start_time),
                      offset_minutes: off,
                    });
                  sent++;
                } catch (err: any) {
                  console.warn("[send-class-reminders] falha", {
                    ownerId,
                    student: st.id,
                    err: err?.message ?? err,
                  });
                }
              }
            }
          }
        }

        return Response.json({ ok: true, scanned, sent, skipped });
      },
    },
  },
});
