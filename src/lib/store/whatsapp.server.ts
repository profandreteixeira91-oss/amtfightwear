/**
 * Avisos de pedido no WhatsApp, enviados pela Evolution API (ver
 * src/lib/whatsapp/evolution.server.ts):
 *  - para o CLIENTE: pagamento confirmado, produção, envio e entrega;
 *  - para o DONO (WHATSAPP_ADMIN_TO): pedido pago, com itens e nome a bordar.
 *
 * Idempotente: cada aviso grava `whatsapp_notified.<chave>` em store_orders e
 * não se repete. Nunca lança erro — falha de WhatsApp não pode travar o pedido.
 */
import { evolutionConfig, normalizeWhatsAppNumber, sendWhatsAppText } from "@/lib/whatsapp/evolution.server";

type StatusEvent = "paid" | "processing" | "shipped" | "delivered";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_tracking: string | null;
  total: number;
  payment_method: string | null;
  whatsapp_notified: Record<string, string> | null;
};

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const siteUrl = () => (process.env.SITE_URL || "https://amtfightwear.com.br").replace(/\/+$/, "");

function buildCustomerMessage(event: StatusEvent, order: OrderRow): string {
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

async function fetchOrder(orderId: string): Promise<OrderRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("store_orders")
    .select("id, order_number, customer_name, customer_phone, shipping_tracking, total, payment_method, whatsapp_notified")
    .eq("id", orderId)
    .maybeSingle();
  return (data as OrderRow | null) ?? null;
}

/** Marca o aviso como enviado, relendo o pedido para não sobrescrever outra chave. */
async function markNotified(orderId: string, key: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const fresh = await fetchOrder(orderId);
  const merged = { ...(fresh?.whatsapp_notified ?? {}), [key]: new Date().toISOString() };
  await supabaseAdmin.from("store_orders").update({ whatsapp_notified: merged } as never).eq("id", orderId);
}

/** Aviso ao cliente. Pedido pago também avisa o dono. */
export async function sendWhatsAppOrderStatus(orderId: string, event: StatusEvent): Promise<void> {
  if (event === "paid") await notifyOwnerOrderPaid(orderId);
  if (!evolutionConfig()) return;
  try {
    const order = await fetchOrder(orderId);
    if (!order || order.whatsapp_notified?.[event]) return;
    if (!normalizeWhatsAppNumber(order.customer_phone)) {
      console.warn("[whatsapp] pedido sem telefone válido", { orderId, event });
      return;
    }
    const result = await sendWhatsAppText(order.customer_phone!, buildCustomerMessage(event, order));
    if (!result.ok) {
      console.error("[whatsapp] falha no aviso ao cliente", { orderId, event, error: result.error });
      return;
    }
    await markNotified(orderId, event);
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

/* ------------------------------ Aviso ao dono ------------------------------ */

/** Números que recebem os avisos da loja (WHATSAPP_ADMIN_TO, separados por vírgula). */
export function ownerRecipients(): string[] {
  return (process.env.WHATSAPP_ADMIN_TO ?? "")
    .split(",")
    .map((n) => normalizeWhatsAppNumber(n))
    .filter((n): n is string => !!n);
}

const PAYMENT_LABEL: Record<string, string> = { PIX: "PIX", CREDIT_CARD: "Cartão", BOLETO: "Boleto" };

function buildOwnerMessage(
  order: Pick<OrderRow, "id" | "order_number" | "customer_name" | "total" | "payment_method">,
  items: string[],
): string {
  const payment = order.payment_method ? PAYMENT_LABEL[order.payment_method] ?? order.payment_method : null;
  return [
    `🛒 *Pedido pago — ${order.order_number}*`,
    "",
    `Cliente: ${order.customer_name ?? "—"}`,
    `Total: *${brl(order.total)}*${payment ? ` (${payment})` : ""}`,
    "",
    "*Itens*",
    ...(items.length ? items.map((i) => `• ${i}`) : ["• ver no painel"]),
    "",
    `Abrir: ${siteUrl()}/admin/pedidos/${order.id}`,
  ].join("\n");
}

/** Envia o mesmo texto a todos os números do dono. */
export async function sendToOwners(text: string): Promise<{ sent: number; errors: string[] }> {
  const to = ownerRecipients();
  if (!evolutionConfig()) return { sent: 0, errors: ["Evolution API não configurada"] };
  if (to.length === 0) return { sent: 0, errors: ["Nenhum número em WHATSAPP_ADMIN_TO"] };
  let sent = 0;
  const errors: string[] = [];
  for (const n of to) {
    const r = await sendWhatsAppText(n, text);
    if (r.ok) sent++;
    else errors.push(`…${n.slice(-4)}: ${r.error}`);
  }
  return { sent, errors };
}

/** Avisa o dono que um pedido foi pago (uma vez por pedido). */
export async function notifyOwnerOrderPaid(orderId: string): Promise<void> {
  if (!evolutionConfig() || ownerRecipients().length === 0) return;
  try {
    const order = await fetchOrder(orderId);
    if (!order || order.whatsapp_notified?.owner_paid) return;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("store_order_items")
      .select("product_name, quantity, variant_label, custom_config")
      .eq("order_id", orderId);
    const items = ((data ?? []) as Array<{
      product_name: string | null;
      quantity: number;
      variant_label: string | null;
      custom_config: { embroidery_name?: string } | null;
    }>).map((it) => {
      let line = `${it.quantity}x ${it.product_name ?? "Item"}`;
      if (it.variant_label) line += ` (${it.variant_label})`;
      if (it.custom_config?.embroidery_name) line += ` — bordar "${it.custom_config.embroidery_name}"`;
      return line;
    });

    const { sent, errors } = await sendToOwners(buildOwnerMessage(order, items));
    if (errors.length) console.error("[whatsapp] aviso ao dono com falha", { orderId, errors });
    if (sent > 0) await markNotified(orderId, "owner_paid");
  } catch (err) {
    console.error("[whatsapp] erro no aviso ao dono", err);
  }
}

/** Mensagem de teste do painel (pedido fictício). */
export function ownerTestMessage(): string {
  return buildOwnerMessage(
    { id: "teste", order_number: "TESTE-0001", customer_name: "Cliente de teste", total: 199.9, payment_method: "PIX" },
    ['1x Faixa Jiu-Jitsu Azul Bordada Personalizada - Linha Pro (A2) — bordar "João Silva"'],
  );
}
