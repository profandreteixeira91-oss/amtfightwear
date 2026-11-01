import { createFileRoute } from "@tanstack/react-router";
import { verifyStandardWebhook } from "@/lib/security/standard-webhooks.server";

/**
 * Webhook de eventos da Resend (substitui /lovable/email/events).
 *
 * Bounce e reclamação de spam viram supressão em `suppressed_emails`, que o
 * envio de templates consulta antes de mandar. Configurar na Resend
 * (Webhooks → email.bounced, email.complained) e guardar o segredo
 * ("whsec_...") em RESEND_WEBHOOK_SECRET.
 */

const OUTCOMES = {
  "email.bounced": { reason: "bounce", status: "bounced", message: "Permanent bounce" },
  "email.complained": { reason: "complaint", status: "complained", message: "Spam complaint" },
} as const;

type ResendEvent = { type: string; data?: { to?: string[] | string; email_id?: string } };

export const Route = createFileRoute("/api/public/hooks/email-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await verifyStandardWebhook(request, process.env.RESEND_WEBHOOK_SECRET, "svix");
        if (body === null) return new Response("Unauthorized", { status: 401 });

        let event: ResendEvent;
        try {
          event = JSON.parse(body) as ResendEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const outcome = OUTCOMES[event.type as keyof typeof OUTCOMES];
        if (!outcome) return Response.json({ ignored: event.type });

        const recipients = ([] as string[]).concat(event.data?.to ?? []).map((e) => e.toLowerCase());
        if (recipients.length === 0) return Response.json({ ignored: "no recipient" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        for (const email of recipients) {
          const { error: suppressError } = await supabaseAdmin
            .from("suppressed_emails")
            .upsert({ email, reason: outcome.reason, metadata: null }, { onConflict: "email" });
          if (suppressError) {
            console.error("Failed to upsert suppressed email", { code: suppressError.code });
            return new Response("Failed to write suppression", { status: 500 });
          }
          const { error: logError } = await supabaseAdmin.from("email_send_log").insert({
            template_name: "system",
            recipient_email: email,
            status: outcome.status,
            error_message: outcome.message,
            metadata: event.data?.email_id ? { resend_email_id: event.data.email_id } : null,
          });
          if (logError) console.error("Failed to insert email_send_log", { code: logError.code });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
