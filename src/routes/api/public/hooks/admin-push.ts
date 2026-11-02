import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

// Endpoint interno acionado pelos triggers do banco via pg_net.
// Não retorna PII: recebe apenas título/corpo/url pré-formatados pelo trigger.
export const Route = createFileRoute("/api/public/hooks/admin-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const denied = checkInternalHookAuth(request);
          if (denied) return denied;
          const body = (await request.json().catch(() => ({}))) as {
            event?: string;
            title?: string;
            body?: string;
            url?: string;
          };
          if (!body?.title) return Response.json({ ok: false, reason: "missing title" }, { status: 400 });
          // O admin da loja não recebe mais eventos do Dojo Manager (ele terá painel próprio).
          if (body.event?.startsWith("dojo_")) return Response.json({ ok: true, skipped: "dojo event" });
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
