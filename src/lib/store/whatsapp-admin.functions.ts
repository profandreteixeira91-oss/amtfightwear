import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

export type OwnerWhatsAppStatus = {
  configured: boolean;
  instance: string | null;
  /** "open" = conectado; null = instância ainda não criada no servidor. */
  state: "open" | "connecting" | "close" | null;
  connectedNumber: string | null;
  profileName: string | null;
  /** Números que recebem o aviso de pedido pago (mascarados). */
  recipients: string[];
  error: string | null;
};

const mask = (n: string) => (n.length > 6 ? `+${n.slice(0, 4)} ••••• ${n.slice(-4)}` : "••••");

/** Situação do WhatsApp da loja, sem expor chaves nem números completos dos destinatários. */
export const adminGetOwnerWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerWhatsAppStatus> => {
    await assertSaasOwner(context);
    const evo = await import("@/lib/whatsapp/evolution.server");
    const { ownerRecipients } = await import("@/lib/store/whatsapp.server");
    const cfg = evo.evolutionConfig();
    const base: OwnerWhatsAppStatus = {
      configured: !!cfg,
      instance: cfg?.instance ?? null,
      state: null,
      connectedNumber: null,
      profileName: null,
      recipients: ownerRecipients().map(mask),
      error: null,
    };
    if (!cfg) return base;
    try {
      base.state = await evo.evolutionConnectionState();
      if (base.state === "open") {
        const info = await evo.evolutionInstanceInfo();
        base.connectedNumber = info.number;
        base.profileName = info.profileName;
      }
    } catch (err) {
      base.error = err instanceof Error ? err.message : String(err);
    }
    return base;
  });

/** Inicia a conexão do número da loja: QR Code ou, com `number`, código de pareamento. */
export const adminConnectStoreWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ number: z.string().trim().max(20).optional().nullable() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const evo = await import("@/lib/whatsapp/evolution.server");
    const number = data.number ? evo.normalizeWhatsAppNumber(data.number) : null;
    if (data.number && !number) throw new Error("Número inválido. Use DDD + número, ex.: 82 99999-8888.");
    return evo.evolutionStartConnection(number ?? undefined);
  });

/** Desconecta o número da loja (para trocar de aparelho ou de número). */
export const adminDisconnectStoreWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { evolutionLogout } = await import("@/lib/whatsapp/evolution.server");
    await evolutionLogout();
    return { ok: true };
  });

/** Envia um aviso de pedido pago fictício para os números do dono. */
export const adminSendOwnerWhatsAppTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { sendToOwners, ownerTestMessage } = await import("@/lib/store/whatsapp.server");
    return sendToOwners(ownerTestMessage());
  });

/* ------------------------- Rastreio para os clientes ------------------------- */

export type TrackingNotifyRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  tracking: string | null;
  phone_ok: boolean;
  sent_at: string | null;
};

/**
 * Pedidos enviados e o aviso de rastreio de cada um. Antes de listar, busca no
 * Melhor Envio o código dos pedidos enviados que ainda estão sem rastreio.
 */
export const adminListTrackingNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TrackingNotifyRow[]> => {
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizeWhatsAppNumber } = await import("@/lib/whatsapp/evolution.server");
    const { trackingNotifiedAt } = await import("@/lib/store/whatsapp.server");
    const load = async () => {
      const { data, error } = await supabaseAdmin
        .from("store_orders")
        .select("id, order_number, customer_name, customer_phone, shipping_tracking, whatsapp_notified, melhor_envio_order_id, melhor_envio_env")
        .eq("status", "shipped")
        .order("updated_at", { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      return data ?? [];
    };
    let orders = await load();

    const missing = orders.filter((o) => !o.shipping_tracking?.trim() && o.melhor_envio_order_id);
    if (missing.length) {
      try {
        const { meRequest, loadShippingSettings } = await import("@/lib/store/shipping-admin.server");
        const settings = await loadShippingSettings();
        const byEnv = new Map<string, typeof missing>();
        for (const o of missing) {
          const env = o.melhor_envio_env || settings.env;
          byEnv.set(env, [...(byEnv.get(env) ?? []), o]);
        }
        for (const [env, list] of byEnv) {
          const res = z
            .record(z.string(), z.object({ tracking: z.string().nullish(), melhorenvio_tracking: z.string().nullish() }))
            .parse(await meRequest("/me/shipment/tracking", env, { orders: list.map((o) => o.melhor_envio_order_id) }));
          for (const o of list) {
            const row = res[o.melhor_envio_order_id!];
            const code = row?.tracking || row?.melhorenvio_tracking;
            if (code) await supabaseAdmin.from("store_orders").update({ shipping_tracking: code }).eq("id", o.id);
          }
        }
        orders = await load();
      } catch (err) {
        console.error("[whatsapp] rastreio: falha ao buscar códigos no Melhor Envio", err);
      }
    }

    return orders.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      tracking: o.shipping_tracking?.trim() || null,
      phone_ok: !!normalizeWhatsAppNumber(o.customer_phone),
      sent_at: trackingNotifiedAt(o.whatsapp_notified, o.shipping_tracking),
    }));
  });

/** Envia o código de rastreio no WhatsApp (até 10 pedidos por chamada; o painel envia em lotes). */
export const adminSendTrackingWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ order_ids: z.array(z.string().uuid()).min(1).max(10), force: z.boolean().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const { sendWhatsAppTracking } = await import("@/lib/store/whatsapp.server");
    const results: Array<{ id: string; ok: boolean; skipped?: boolean; error?: string }> = [];
    for (const id of data.order_ids) {
      const r = await sendWhatsAppTracking(id, { force: data.force });
      results.push(r.ok ? { id, ok: true } : { id, ok: false, skipped: r.skipped, error: r.error });
    }
    return { results };
  });
