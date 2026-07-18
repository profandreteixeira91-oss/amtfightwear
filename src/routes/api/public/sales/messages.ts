import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findConversation(channel: string, external_id: string) {
  const { data } = await sb()
    .from("sales_conversations")
    .select("id, status")
    .eq("channel", channel)
    .eq("external_id", external_id)
    .maybeSingle();
  return data;
}

export const Route = createFileRoute("/api/public/sales/messages")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const channel = url.searchParams.get("channel") ?? "web";
        const external_id = url.searchParams.get("external_id");
        const since = url.searchParams.get("since"); // ISO
        if (!external_id) {
          return new Response(JSON.stringify({ error: "missing_external_id" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
        const conv = await findConversation(channel, external_id);
        if (!conv) {
          return new Response(JSON.stringify({ conversation: null, messages: [], status: "active" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
        let q = sb()
          .from("sales_messages")
          .select("id, role, parts, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(200);
        if (since) q = q.gt("created_at", since);
        const { data } = await q;
        return new Response(
          JSON.stringify({ conversation_id: conv.id, status: conv.status, messages: data ?? [] }),
          { status: 200, headers: { "Content-Type": "application/json", ...cors } },
        );
      },
      POST: async ({ request }) => {
        try {
          const raw = await request.json();
          const body = z
            .object({
              channel: z.enum(["web", "whatsapp", "instagram"]).default("web"),
              external_id: z.string().min(3).max(120),
              action: z.enum(["request_human", "resume_bot"]),
            })
            .parse(raw);
          const conv = await findConversation(body.channel, body.external_id);
          if (!conv) {
            return new Response(JSON.stringify({ error: "conversation_not_found" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...cors },
            });
          }
          const newStatus = body.action === "request_human" ? "human" : "active";
          const systemText =
            body.action === "request_human"
              ? "Cliente solicitou atendimento humano. Aguardando resposta do time AMT."
              : "Voltamos ao atendimento automatizado.";
          await sb().from("sales_conversations").update({ status: newStatus, last_message_at: new Date().toISOString() }).eq("id", conv.id);
          await sb().from("sales_messages").insert({
            conversation_id: conv.id,
            role: "system",
            parts: { text: systemText },
          });
          return new Response(JSON.stringify({ ok: true, status: newStatus }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...cors },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown_error";
          return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
      },
    },
  },
});
