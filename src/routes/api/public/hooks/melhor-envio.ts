import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

/**
 * Webhook do Melhor Envio.
 * Evento: "Atualização das etiquetas criadas e editadas".
 *
 * Recebe POST com JSON informando mudanças de status/tracking; usamos o `id`
 * do envio para localizar o pedido correspondente em store_orders e
 * atualizar rastreio + status local.
 */
export const Route = createFileRoute("/api/public/hooks/melhor-envio")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, service: "melhor-envio-webhook" }),
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          let payload: unknown = raw;
          try {
            payload = raw ? JSON.parse(raw) : null;
          } catch {
            // corpo não-JSON (teste de conectividade)
          }

          const events = Array.isArray(payload) ? payload : [payload];

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let updated = 0;

          for (const evRaw of events) {
            const ev = evRaw as { event?: string; data?: { id?: string; status?: string; tracking?: string; melhorenvio_tracking?: string } } | null;
            const data = ev?.data;
            const meId = data?.id;
            if (!meId) continue;

            const tracking = data?.tracking ?? data?.melhorenvio_tracking ?? null;
            const patch: {
              melhor_envio_status: string | null;
              melhor_envio_data: Json;
              melhor_envio_synced_at: string;
              shipping_tracking?: string;
              status?: string;
            } = {
              melhor_envio_status: data?.status ?? null,
              melhor_envio_data: (ev ?? {}) as Json,
              melhor_envio_synced_at: new Date().toISOString(),
            };
            if (tracking) patch.shipping_tracking = tracking;
            if (data?.status === "posted") patch.status = "shipped";
            if (data?.status === "delivered") patch.status = "delivered";

            const { error, count } = await supabaseAdmin
              .from("store_orders")
              .update(patch, { count: "exact" })
              .or(`melhor_envio_order_id.eq.${meId},melhor_envio_cart_id.eq.${meId}`);
            if (!error && count) updated += count;
          }

          console.log("[melhor-envio-webhook] processed", { updated, events: events.length });
          return Response.json({ ok: true, updated });
        } catch (err) {
          console.error("[melhor-envio-webhook] erro processando evento", err);
          return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
        }
      },
    },
  },
});
