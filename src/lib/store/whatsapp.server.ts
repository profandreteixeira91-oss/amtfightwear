/**
 * WhatsApp Cloud API (Meta) — envio de notificações de status de pedido.
 *
 * Requer duas variáveis de ambiente:
 *  - WHATSAPP_ACCESS_TOKEN     (token permanente do app no Meta Business)
 *  - WHATSAPP_PHONE_NUMBER_ID  (ID do número emissor, do painel do WhatsApp Business)
 *
 * Se qualquer uma estiver ausente, a função apenas loga e retorna — nunca quebra o fluxo do pedido.
 */

type StatusEvent = "paid" | "processing" | "shipped" | "delivered";

const GRAPH_VERSION = "v21.0";

function normalizeToE164BR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 10) return digits;
  return null;
}

function buildMessage(event: StatusEvent, order: {
  order_number: string;
  customer_name: string | null;
  shipping_tracking?: string | null;
  total: number | string;
}): string {
  const first = (order.customer_name ?? "").trim().split(/\s+/)[0] || "cliente";
  const num = order.order_number;
  switch (event) {
    case "paid":
      return `Olá, ${first}! 🎉\n\nRecebemos a confirmação do seu pagamento do pedido *${num}*.\nJá iniciamos a preparação — em breve enviamos novidades por aqui.\n\nAMT Fight Wear`;
    case "processing":
      return `Olá, ${first}! 🧵\n\nSeu pedido *${num}* entrou em *produção*.\nAssim que for despachado, você recebe o código de rastreio por aqui.\n\nAMT Fight Wear`;
    case "shipped": {
      const track = order.shipping_tracking?.trim();
      const trackLine = track
        ? `\nCódigo de rastreio: *${track}*\nAcompanhe em https://rastreamento.correios.com.br/app/index.php`
        : "";
      return `Olá, ${first}! 🚚\n\nSeu pedido *${num}* foi *enviado*!${trackLine}\n\nAMT Fight Wear`;
    }
    case "delivered":
      return `Olá, ${first}! ✅\n\nSeu pedido *${num}* foi *entregue*.\nEsperamos que aproveite muito — se puder, conte pra gente sua experiência respondendo esta mensagem.\n\nAMT Fight Wear`;
  }
}

async function fetchOrder(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("store_orders")
    .select("id, order_number, customer_name, customer_phone, shipping_tracking, total, whatsapp_notified")
    .eq("id", orderId)
    .maybeSingle();
  return data as
    | {
        id: string;
        order_number: string;
        customer_name: string | null;
        customer_phone: string | null;
        shipping_tracking: string | null;
        total: number;
        whatsapp_notified: Record<string, string> | null;
      }
    | null;
}

/**
 * Envia notificação de status. Idempotente por (order, event): grava
 * `whatsapp_notified.<event> = timestamp` em store_orders para não repetir.
 */
export async function sendWhatsAppOrderStatus(orderId: string, event: StatusEvent): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.warn("[whatsapp] credenciais ausentes — pulando envio", { event });
    return;
  }

  try {
    const order = await fetchOrder(orderId);
    if (!order) return;

    const already = order.whatsapp_notified?.[event];
    if (already) return; // já enviado

    const to = normalizeToE164BR(order.customer_phone);
    if (!to) {
      console.warn("[whatsapp] pedido sem telefone válido", { orderId, event });
      return;
    }

    const body = buildMessage(event, order);
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: true, body },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[whatsapp] falha no envio", { status: res.status, errText, orderId, event });
      return;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const merged = { ...(order.whatsapp_notified ?? {}), [event]: new Date().toISOString() };
    await supabaseAdmin
      .from("store_orders")
      .update({ whatsapp_notified: merged } as never)
      .eq("id", orderId);
  } catch (err) {
    console.error("[whatsapp] erro inesperado", err);
  }
}

/** Deriva o evento correspondente ao status novo do pedido, se houver. */
export function eventFromStatusTransition(newStatus: string, newPaymentStatus?: string | null): StatusEvent | null {
  if (newPaymentStatus === "paid" || newStatus === "paid") return "paid";
  if (newStatus === "processing") return "processing";
  if (newStatus === "shipped") return "shipped";
  if (newStatus === "delivered") return "delivered";
  return null;
}
