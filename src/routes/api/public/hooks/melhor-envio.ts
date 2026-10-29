import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

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
            if (!meId || !z.string().uuid().safeParse(meId).success) continue;

            // Never trust webhook status/tracking: verify with the connected provider
            // before privileged writes (also rejects unknown/unrelated shipments).
            const { data: order } = await supabaseAdmin.from("store_orders").select("id,melhor_envio_env").or(`melhor_envio_order_id.eq.${meId},melhor_envio_cart_id.eq.${meId}`).maybeSingle();
            if (!order) continue;
            const { meRequest, loadShippingSettings } = await import("@/lib/store/shipping-admin.server");
            const settings = await loadShippingSettings();
            const verified = z.object({ id: z.string().uuid(), status: z.string(), tracking: z.string().nullish(), melhorenvio_tracking: z.string().nullish() }).parse(await meRequest(`/me/orders/${meId}`, order.melhor_envio_env || settings.env));
            if (verified.id !== meId) continue;

            const tracking = verified.tracking ?? verified.melhorenvio_tracking ?? null;
            const patch: {
              melhor_envio_status: string | null;
              melhor_envio_data: Json;
              melhor_envio_synced_at: string;
              shipping_tracking?: string;
              status?: string;
            } = {
              melhor_envio_status: verified.status,
              melhor_envio_data: verified as Json,
              melhor_envio_synced_at: new Date().toISOString(),
            };
            if (tracking) patch.shipping_tracking = tracking;
            if (verified.status === "posted") patch.status = "shipped";
            if (verified.status === "delivered") patch.status = "delivered";

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
