import { createFileRoute } from "@tanstack/react-router";

type Step = { day: number; subject: string; body: string };

function fillTemplate(tpl: string, lead: Record<string, any>) {
  return tpl
    .replace(/\{empresa\}/gi, lead.name ?? "")
    .replace(/\{nome\}/gi, lead.responsible ?? "")
    .replace(/\{cidade\}/gi, lead.city ?? "")
    .replace(/\{estado\}/gi, lead.state ?? "")
    .replace(/\{segmento\}/gi, lead.modality ?? "");
}

export const Route = createFileRoute("/api/public/hooks/auto-followup")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const nowIso = new Date().toISOString();
          const { data: runs } = await supabaseAdmin
            .from("email_sequence_runs")
            .select("*, leads(*), email_sequences(*)")
            .eq("status", "running")
            .lte("next_send_at", nowIso)
            .limit(50);

          const results: any[] = [];
          for (const run of runs ?? []) {
            const lead = (run as any).leads;
            const seq = (run as any).email_sequences;
            if (!lead || !seq) {
              await supabaseAdmin
                .from("email_sequence_runs")
                .update({ status: "cancelled" })
                .eq("id", (run as any).id);
              continue;
            }

            // Cancel if the lead has responded after the run started
            if (lead.last_response_at && new Date(lead.last_response_at) > new Date((run as any).created_at)) {
              await supabaseAdmin
                .from("email_sequence_runs")
                .update({ status: "cancelled_by_reply" })
                .eq("id", (run as any).id);
              results.push({ run: (run as any).id, action: "cancelled_by_reply" });
              continue;
            }

            const steps = (seq.steps ?? []) as Step[];
            const stepIdx = (run as any).current_step;
            const step = steps[stepIdx];
            if (!step) {
              await supabaseAdmin
                .from("email_sequence_runs")
                .update({ status: "completed" })
                .eq("id", (run as any).id);
              results.push({ run: (run as any).id, action: "completed" });
              continue;
            }

            if (!lead.email) {
              await supabaseAdmin
                .from("email_sequence_runs")
                .update({ status: "cancelled" })
                .eq("id", (run as any).id);
              results.push({ run: (run as any).id, action: "no_email" });
              continue;
            }

            const subject = fillTemplate(step.subject, lead);
            const body = fillTemplate(step.body, lead);

            // Enqueue via public.enqueue_email (transactional queue)
            try {
              await supabaseAdmin.rpc("enqueue_email", {
                queue_name: "transactional_emails",
                payload: {
                  to: lead.email,
                  subject,
                  html: body.replace(/\n/g, "<br/>"),
                  text: body,
                  template: "sequence_step",
                  metadata: { lead_id: lead.id, run_id: (run as any).id, step: stepIdx },
                },
              });
            } catch (e) {
              console.error("enqueue_email failed", e);
            }

            await supabaseAdmin.from("outreach_log").insert({
              lead_id: lead.id,
              channel: "email",
              status: "queued",
              subject,
              body,
              source: `sequence:${seq.id}:step:${stepIdx}`,
            });

            await supabaseAdmin
              .from("leads")
              .update({ last_contact_at: nowIso, pipeline_stage: "contato_iniciado" })
              .eq("id", lead.id);

            const nextStep = steps[stepIdx + 1];
            const nextSendAt = nextStep
              ? new Date(Date.now() + (nextStep.day - step.day) * 86_400_000).toISOString()
              : null;
            await supabaseAdmin
              .from("email_sequence_runs")
              .update({
                current_step: stepIdx + 1,
                last_step_sent_at: nowIso,
                next_send_at: nextSendAt,
                status: nextStep ? "running" : "completed",
              })
              .eq("id", (run as any).id);

            results.push({ run: (run as any).id, step: stepIdx, sent_to: lead.email });
          }

          return Response.json({ ok: true, processed: results.length, results });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
