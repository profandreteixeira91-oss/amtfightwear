/**
 * Notificações in-app de status de pedidos.
 * Grava uma linha em `order_notifications` para o dono do pedido. Idempotente
 * por (order_id, event) via índice único.
 */

export type OrderNotifyEvent = "paid" | "processing" | "shipped" | "delivered" | "cancelled";

function buildContent(
  event: OrderNotifyEvent,
  order: {
    order_number: string;
    customer_name: string | null;
    shipping_tracking?: string | null;
  },
): { title: string; body: string } {
  const first = (order.customer_name ?? "").trim().split(/\s+/)[0] || "cliente";
  const num = order.order_number;
  switch (event) {
    case "paid":
      return {
        title: `Pagamento confirmado — Pedido ${num}`,
        body: `Olá, ${first}! Recebemos a confirmação do pagamento do seu pedido ${num}. Já iniciamos a preparação.`,
      };
    case "processing":
      return {
        title: `Pedido ${num} em produção`,
        body: `Olá, ${first}! Seu pedido ${num} entrou em produção. Avisaremos aqui assim que for despachado.`,
      };
    case "shipped": {
      const track = order.shipping_tracking?.trim();
      const trackLine = track ? ` Código de rastreio: ${track}.` : "";
      return {
        title: `Pedido ${num} enviado 🚚`,
        body: `Olá, ${first}! Seu pedido ${num} foi enviado.${trackLine}`,
      };
    }
    case "delivered":
      return {
        title: `Pedido ${num} entregue ✅`,
        body: `Olá, ${first}! Seu pedido ${num} foi entregue. Esperamos que aproveite!`,
      };
    case "cancelled":
      return {
        title: `Pedido ${num} cancelado`,
        body: `Olá, ${first}! Seu pedido ${num} foi cancelado. Se tiver dúvidas, fale com a gente pelo WhatsApp.`,
      };
  }
}

export async function createOrderNotification(orderId: string, event: OrderNotifyEvent): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("store_orders")
      .select("id, order_number, customer_name, customer_email, user_id, shipping_tracking")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    // Resolve user_id: usa o do pedido; se não houver, tenta pelo e-mail.
    let userId = (order as { user_id: string | null }).user_id ?? null;
    if (!userId && (order as { customer_email?: string }).customer_email) {
      const email = (order as { customer_email: string }).customer_email.toLowerCase();
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
      userId = found?.id ?? null;
    }
    if (!userId) return; // convidado — sem destino in-app

    const { title, body } = buildContent(event, order as never);
    await supabaseAdmin
      .from("order_notifications")
      .insert({ user_id: userId, order_id: orderId, event, title, body } as never);
  } catch (err) {
    // idempotência (23505) ou erro transitório — não interrompe o fluxo do pedido.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("duplicate key")) console.error("[notifications] falha ao criar", { event, orderId, err });
  }
}

export function notifyEventFromStatus(newStatus: string, newPaymentStatus?: string | null): OrderNotifyEvent | null {
  if (newPaymentStatus === "paid" || newStatus === "paid") return "paid";
  if (newStatus === "processing" || newStatus === "preparing") return "processing";
  if (newStatus === "shipped") return "shipped";
  if (newStatus === "delivered") return "delivered";
  if (newStatus === "cancelled") return "cancelled";
  return null;
}
