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
  // Pedido pago também avisa o dono (independe de o cliente ter telefone válido).
  if (event === "paid") await notifyOwnerOrderPaid(orderId);
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

/* ------------------------------------------------------------------------- */
/* Aviso ao dono da loja: pedido pago                                         */
/* ------------------------------------------------------------------------- */
/*
 * Mensagens iniciadas pela empresa só chegam fora da janela de 24h se usarem um
 * TEMPLATE aprovado na Meta (categoria "Utilidade"). Por isso o aviso ao dono usa
 * template, com 4 variáveis no corpo:
 *   {{1}} número do pedido · {{2}} cliente · {{3}} total · {{4}} itens
 *
 * Variáveis de ambiente:
 *  - WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID  (as mesmas do envio ao cliente)
 *  - WHATSAPP_ADMIN_TO        números que recebem o aviso, separados por vírgula
 *  - WHATSAPP_ADMIN_TEMPLATE  nome do template (padrão: novo_pedido_pago)
 *  - WHATSAPP_TEMPLATE_LANG   idioma do template (padrão: pt_BR)
 */

export type OwnerWhatsAppConfig = {
  hasCredentials: boolean;
  recipients: string[];
  template: string;
  language: string;
};

export function ownerWhatsAppConfig(): OwnerWhatsAppConfig {
  const recipients = (process.env.WHATSAPP_ADMIN_TO ?? "")
    .split(",")
    .map((n) => normalizeToE164BR(n))
    .filter((n): n is string => !!n);
  return {
    hasCredentials: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    recipients,
    template: process.env.WHATSAPP_ADMIN_TEMPLATE || "novo_pedido_pago",
    language: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR",
  };
}

/** Parâmetro de template: a Meta recusa quebras de linha, tabs e mais de 4 espaços seguidos. */
function templateParam(value: string, max = 200): string {
  const clean = value.replace(/[\n\r\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return (clean.length > max ? `${clean.slice(0, max - 1)}…` : clean) || "-";
}

/** Envia um template para cada destinatário. Retorna quantos foram aceitos e os erros. */
export async function sendOwnerTemplate(params: string[]): Promise<{ sent: number; errors: string[] }> {
  const cfg = ownerWhatsAppConfig();
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!cfg.hasCredentials || !token || !phoneId) return { sent: 0, errors: ["Credenciais do WhatsApp ausentes"] };
  if (cfg.recipients.length === 0) return { sent: 0, errors: ["Nenhum número em WHATSAPP_ADMIN_TO"] };

  let sent = 0;
  const errors: string[] = [];
  for (const to of cfg.recipients) {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: cfg.template,
          language: { code: cfg.language },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: templateParam(text) })) }],
        },
      }),
    });
    if (res.ok) sent++;
    else errors.push(`${to.slice(0, 4)}…${to.slice(-2)}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return { sent, errors };
}

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Avisa o(s) número(s) do dono que um pedido foi pago. Idempotente por pedido
 * (whatsapp_notified.owner_paid) e nunca lança erro: falhar aqui não pode
 * atrapalhar a confirmação do pagamento.
 */
export async function notifyOwnerOrderPaid(orderId: string): Promise<void> {
  const cfg = ownerWhatsAppConfig();
  if (!cfg.hasCredentials || cfg.recipients.length === 0) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const order = await fetchOrder(orderId);
    if (!order || order.whatsapp_notified?.owner_paid) return;

    const { data: items } = await supabaseAdmin
      .from("store_order_items")
      .select("product_name, quantity, variant_label, custom_config")
      .eq("order_id", orderId);
    const summary = ((items ?? []) as Array<{
      product_name: string | null;
      quantity: number;
      variant_label: string | null;
      custom_config: { embroidery_name?: string } | null;
    }>)
      .map((it) => {
        const parts = [`${it.quantity}x ${it.product_name ?? "Item"}`];
        if (it.variant_label) parts.push(`(${it.variant_label})`);
        if (it.custom_config?.embroidery_name) parts.push(`bordar "${it.custom_config.embroidery_name}"`);
        return parts.join(" ");
      })
      .join("; ");

    const { sent, errors } = await sendOwnerTemplate([
      order.order_number,
      order.customer_name ?? "Cliente",
      brl(order.total),
      summary || "ver pedido no painel",
    ]);
    if (errors.length) console.error("[whatsapp] aviso ao dono com falha", { orderId, errors });
    if (sent === 0) return;

    const fresh = await fetchOrder(orderId);
    const merged = { ...(fresh?.whatsapp_notified ?? {}), owner_paid: new Date().toISOString() };
    await supabaseAdmin.from("store_orders").update({ whatsapp_notified: merged } as never).eq("id", orderId);
  } catch (err) {
    console.error("[whatsapp] erro no aviso ao dono", err);
  }
}
