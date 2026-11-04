import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook da Evolution API (instância da loja): mensagens recebidas, enviadas pelo
 * celular e mudanças de status. Configurado pelo admin (WhatsApp › Ativar caixa de
 * entrada), que cadastra a URL com o cabeçalho x-amt-token.
 */
export const Route = createFileRoute("/api/public/hooks/whatsapp")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, service: "whatsapp-webhook" }),
      POST: async ({ request }) => {
        const { webhookToken, handleEvolutionEvent } = await import("@/lib/whatsapp/inbox.server");
        const expected = await webhookToken();
        const got = request.headers.get("x-amt-token") ?? "";
        if (!expected || got.length !== expected.length || !timingSafeEqual(got, expected)) {
          return Response.json({ ok: false }, { status: 401 });
        }
        try {
          await handleEvolutionEvent(await request.json());
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[whatsapp-webhook] erro", err);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});

function timingSafeEqual(a: string, b: string) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
