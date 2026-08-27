/**
 * Auditoria de pedidos da loja (server-only).
 * Grava eventos em public.store_order_events sem nunca quebrar o fluxo principal.
 */
export type OrderEventInput = {
  order_id: string;
  event: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  actor_user_id?: string | null;
  actor_email?: string | null;
};

export async function logOrderEvent(input: OrderEventInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("store_order_events").insert({
      order_id: input.order_id,
      event: input.event,
      message: input.message ?? null,
      metadata: (input.metadata ?? null) as never,
      actor_user_id: input.actor_user_id ?? null,
      actor_email: input.actor_email ?? null,
    } as never);
  } catch (err) {
    console.error("[order-events] falha ao registrar evento", err);
  }
}
