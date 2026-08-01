import { createFileRoute } from "@tanstack/react-router";

// Endpoint interno acionado pelos triggers do banco via pg_net.
// Não retorna PII: recebe apenas título/corpo/url pré-formatados pelo trigger.
export const Route = createFileRoute("/api/public/hooks/admin-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const providedKey = request.headers.get("apikey") ?? "";
          const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
          if (!providedKey || providedKey !== expected) {
            return new Response("Unauthorized", { status: 401 });
          }
          const body = (await request.json().catch(() => ({}))) as {
            event?: string;
            title?: string;
            body?: string;
            url?: string;
          };
          if (!body?.title) return Response.json({ ok: false, reason: "missing title" }, { status: 400 });
          const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
          const result = await sendPushToAmtAdmins(
            {
              title: body.title,
              body: body.body,
              url: body.url ?? "/admin",
              tag: body.event ?? "amt-admin",
              data: { event: body.event },
            },
            body.event,
          );

          return Response.json({ ok: true, ...result });
        } catch (err: any) {
          return Response.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
        }
      },
    },
  },
});
