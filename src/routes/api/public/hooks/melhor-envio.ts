import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Melhor Envio.
 * Evento disponível: "Atualização das etiquetas criadas e editadas".
 *
 * Melhor Envio faz uma requisição de teste (GET/POST) ao cadastrar o webhook
 * e espera status 2xx. Depois envia POST com JSON a cada evento.
 *
 * Observação: nesta fase apenas registramos o evento em log (console).
 * Quando implementarmos emissão de etiquetas, aqui atualizamos o pedido
 * correspondente com o status/tracking recebido.
 */
export const Route = createFileRoute("/api/public/hooks/melhor-envio")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, service: "melhor-envio-webhook" });
      },
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          let payload: unknown = raw;
          try {
            payload = JSON.parse(raw);
          } catch {
            // corpo não-JSON (ex.: teste de conectividade)
          }

          const headers: Record<string, string> = {};
          request.headers.forEach((value, key) => {
            // evita logar tokens sensíveis
            if (
              key.toLowerCase() === "authorization" ||
              key.toLowerCase() === "cookie"
            ) {
              return;
            }
            headers[key] = value;
          });

          console.log("[melhor-envio-webhook] evento recebido", {
            headers,
            payload,
          });

          return Response.json({ ok: true });
        } catch (err) {
          console.error("[melhor-envio-webhook] erro processando evento", err);
          return Response.json(
            { ok: false, error: "internal_error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
