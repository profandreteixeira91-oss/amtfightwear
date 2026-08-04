import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Instagram Messaging Webhook — Meta Graph API
// GET: verification challenge
// POST: signed payload with messages/comments/mentions

const FALLBACK_META_VERIFY_TOKEN = "amt_ig_webhook_2026_verify_9f3a";

function getAllowedVerifyTokens() {
  return [
    process.env.META_VERIFY_TOKEN,
    process.env.META_WEBHOOK_VERIFY_TOKEN,
    FALLBACK_META_VERIFY_TOKEN,
  ].filter((value): value is string => Boolean(value));
}

export const Route = createFileRoute("/api/public/hooks/ig-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const allowedTokens = getAllowedVerifyTokens();

        if (mode === "subscribe" && token && challenge && allowedTokens.includes(token)) {
          return new Response(challenge ?? "", {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
        return new Response("forbidden", {
          status: 403,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256") ?? "";
        const appSecret = process.env.META_APP_SECRET ?? "";

        let signatureValid = false;
        if (signature.startsWith("sha256=") && appSecret) {
          const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
          const sigBuf = Buffer.from(signature.slice(7), "hex");
          const expBuf = Buffer.from(expected, "hex");
          signatureValid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
        }

        let payload: {
          object?: string;
          entry?: Array<{
            id?: string;
            time?: number;
            messaging?: Array<{
              sender?: { id?: string };
              recipient?: { id?: string };
              timestamp?: number;
              message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
            }>;
            changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
          }>;
        } = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = {};
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        await (supabaseAdmin as any).from("ig_webhook_log").insert({
          object: payload.object ?? null,
          entry_id: payload.entry?.[0]?.id ?? null,
          event_type: payload.entry?.[0]?.messaging ? "message" : payload.entry?.[0]?.changes?.[0]?.field ?? "unknown",
          signature_valid: signatureValid,
          payload: payload as unknown as Record<string, unknown>,
          processed: false,
        });

        if (!signatureValid) return new Response("invalid signature", { status: 401 });

        // Process messaging events
        for (const entry of payload.entry ?? []) {
          const igAccountId = entry.id;
          if (!igAccountId) continue;

          // Find owner user
          const { data: acc } = await supabaseAdmin
            .from("ig_accounts").select("id, user_id").eq("ig_user_id", igAccountId).maybeSingle();
          if (!acc) continue;

          for (const m of entry.messaging ?? []) {
            const senderId = m.sender?.id;
            const recipientId = m.recipient?.id;
            const isEcho = !!m.message?.is_echo;
            const direction = isEcho ? "out" : "in";
            const participantIgsid = isEcho ? recipientId : senderId;
            if (!participantIgsid) continue;

            // Upsert conversation
            const { data: existingConv } = await supabaseAdmin
              .from("ig_conversations")
              .select("id, status, unread_count")
              .eq("user_id", acc.user_id)
              .eq("channel", "instagram")
              .eq("participant_igsid", participantIgsid)
              .maybeSingle();

            const windowExpires = new Date(Date.now() + 7 * 86400000).toISOString();
            const preview = (m.message?.text ?? "").slice(0, 120);

            let convId: string;
            if (existingConv) {
              convId = existingConv.id;
              await (supabaseAdmin as any).from("ig_conversations").update({
                last_message_at: new Date().toISOString(),
                last_message_preview: preview,
                window_expires_at: windowExpires,
                unread_count: direction === "in" ? (existingConv.unread_count ?? 0) + 1 : existingConv.unread_count,
              }).eq("id", convId);
            } else {
              const { data: newConv } = await (supabaseAdmin as any).from("ig_conversations").insert({
                user_id: acc.user_id,
                ig_account_id: acc.id,
                channel: "instagram",
                participant_igsid: participantIgsid,
                status: "novo_lead",
                last_message_at: new Date().toISOString(),
                last_message_preview: preview,
                window_expires_at: windowExpires,
                unread_count: direction === "in" ? 1 : 0,
              }).select("id").single();
              convId = newConv?.id ?? "";
              if (convId) {
                await (supabaseAdmin as any).from("ig_events").insert({
                  user_id: acc.user_id, conversation_id: convId,
                  event_type: "conversation_created",
                });
              }
            }

            if (convId && m.message?.mid) {
              await (supabaseAdmin as any).from("ig_messages").upsert({
                user_id: acc.user_id,
                conversation_id: convId,
                mid: m.message.mid,
                direction,
                text: m.message.text ?? null,
                attachments: (m.message.attachments as unknown[] | undefined) ?? [],
                is_echo: isEcho,
                sent_at: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
              }, { onConflict: "conversation_id,mid" });

              // Notificar admins sobre mensagem IG recebida
              if (direction === "in" && convId) {
                try {
                  const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
                  await sendPushToAmtAdmins({
                    title: "Nova mensagem Instagram",
                    body: preview || "Mídia recebida",
                    url: `/admin/atendimento?chat=${convId}`,
                    tag: `ig-msg-${convId}`,
                  }, "sales_message.new");
                } catch (e) {
                  console.warn("Falha ao notificar admins IG:", e);
                }
              }
            }
          }

          // Process comments
          for (const ch of entry.changes ?? []) {
            if (ch.field === "comments") {
              const v = ch.value ?? {};
              const commentId = (v.id as string | undefined) ?? "";
              if (!commentId) continue;
              await (supabaseAdmin as any).from("ig_comments").upsert({
                user_id: acc.user_id,
                ig_account_id: acc.id,
                media_id: (v.media as { id?: string } | undefined)?.id ?? null,
                comment_id: commentId,
                parent_id: (v.parent_id as string | undefined) ?? null,
                from_username: (v.from as { username?: string } | undefined)?.username ?? null,
                from_id: (v.from as { id?: string } | undefined)?.id ?? null,
                text: (v.text as string | undefined) ?? null,
              }, { onConflict: "user_id,comment_id" });
            }
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
