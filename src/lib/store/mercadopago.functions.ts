import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_BASE = "https://api.mercadopago.com";

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

async function mp<T = any>(path: string, init?: RequestInit): Promise<T> {
  // Conta MP da LOJA AMT Fight Wear (independente da conta do AMT Pay/Dojo).
  const key =
    process.env.STORE_MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!key) throw new Error("STORE_MERCADOPAGO_ACCESS_TOKEN não configurada");
  const res = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      body?.message ||
      body?.cause?.[0]?.description ||
      body?.error ||
      (typeof body === "string" ? body : `Mercado Pago ${res.status}`);
    throw new Error(String(msg));
  }
  return body as T;
}

/** Detecta payment_method_id do Mercado Pago por IIN (Brasil). */
function detectBrand(cardNumber: string): string {
  const n = onlyDigits(cardNumber);
  if (/^3[47]/.test(n)) return "amex";
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(n)) return "elo";
  if (/^(38|60)/.test(n)) return "hipercard";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "master";
  if (/^(30[0-5]|36|38)/.test(n)) return "diners";
  return "visa";
}

async function createCardToken(card: {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  document: string;
}): Promise<string> {
  const publicKey =
    process.env.STORE_MERCADOPAGO_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY;
  if (!publicKey) throw new Error("STORE_MERCADOPAGO_PUBLIC_KEY não configurada");
  const res = await fetch(`${MP_BASE}/v1/card_tokens?public_key=${publicKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      card_number: onlyDigits(card.number),
      security_code: onlyDigits(card.ccv),
      expiration_month: Number(card.expiryMonth),
      expiration_year: Number(
        card.expiryYear.length === 2 ? `20${card.expiryYear}` : card.expiryYear,
      ),
      cardholder: {
        name: card.holderName,
        identification: { type: "CPF", number: onlyDigits(card.document) || "00000000000" },
      },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      body?.cause?.[0]?.description || body?.message || `Falha ao tokenizar cartão (${res.status})`,
    );
  }
  return body.id as string;
}

const CardSchema = z.object({
  holderName: z.string().min(2),
  number: z.string().min(12),
  expiryMonth: z.string().min(1),
  expiryYear: z.string().min(2),
  ccv: z.string().min(3),
});

export const createMercadopagoPayment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        method: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]),
        installments: z.number().int().min(1).max(10).optional(),
        card: CardSchema.optional(),
        remote_ip: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("store_orders")
      .select("*")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");

    if (order.mp_payment_id && order.payment_status !== "pending" && order.payment_status !== "failed") {
      throw new Error("Pedido já possui pagamento em andamento");
    }

    const addr = (order.shipping_address as any) ?? {};
    const total = Number(order.total);
    const nameParts = (order.customer_name || "Cliente").trim().split(/\s+/);
    const firstName = nameParts[0] || "Cliente";
    const lastName = nameParts.slice(1).join(" ") || "AMT";
    const cpf = onlyDigits(order.customer_document);

    const basePayload: Record<string, any> = {
      transaction_amount: Math.round(total * 100) / 100,
      description: `Pedido ${order.order_number}`,
      external_reference: order.id,
      statement_descriptor: "AMTFIGHTWEAR",
      notification_url: `https://amtfightwear.com.br/api/public/hooks/mercadopago`,
      payer: {
        email: order.customer_email,
        first_name: firstName,
        last_name: lastName,
        identification: cpf ? { type: "CPF", number: cpf } : undefined,
        address: addr.zip
          ? {
              zip_code: onlyDigits(addr.zip),
              street_name: addr.street,
              street_number: addr.number,
              neighborhood: addr.neighborhood,
              city: addr.city,
              federal_unit: addr.state,
            }
          : undefined,
      },
    };

    let paymentPayload: Record<string, any>;

    if (data.method === "PIX") {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      paymentPayload = {
        ...basePayload,
        payment_method_id: "pix",
        date_of_expiration: expires.toISOString(),
      };
    } else if (data.method === "BOLETO") {
      const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      paymentPayload = {
        ...basePayload,
        payment_method_id: "bolbradesco",
        date_of_expiration: expires.toISOString(),
      };
    } else {
      if (!data.card) throw new Error("Dados do cartão obrigatórios");
      const token = await createCardToken({
        ...data.card,
        document: order.customer_document ?? "",
      });
      const brand = detectBrand(data.card.number);
      // Regras de parcelamento sem juros: 3x ≥ R$200, 5x ≥ R$600, 10x ≥ R$1000.
      const requested = data.installments ?? 1;
      const maxAllowed = total >= 1000 ? 10 : total >= 600 ? 5 : total >= 200 ? 3 : 1;
      const installments = Math.min(Math.max(1, requested), maxAllowed);
      paymentPayload = {
        ...basePayload,
        token,
        installments,
        payment_method_id: brand,
        capture: true,
      };
    }

    const headers: Record<string, string> = {
      "X-Idempotency-Key": `${order.id}-${Date.now()}`,
    };
    if (data.remote_ip) headers["X-Forwarded-For"] = data.remote_ip;

    const payment = await mp<any>(`/v1/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentPayload),
    });

    // Reaproveitamos as colunas asaas_* como buckets genéricos p/ manter compatibilidade da UI.
    const poi = payment?.point_of_interaction?.transaction_data ?? {};
    const pixQr = poi.qr_code_base64 ? `data:image/png;base64,${poi.qr_code_base64}` : null;
    const pixCopy = poi.qr_code ?? null;
    const pixExp = payment.date_of_expiration ?? null;
    const boletoUrl = payment?.transaction_details?.external_resource_url ?? null;
    const ticketUrl = poi.ticket_url ?? boletoUrl;

    const patch: Record<string, any> = {
      payment_method: data.method,
      payment_provider: "mercadopago",
      payment_reference: String(payment.id ?? ""),
      installments: data.method === "CREDIT_CARD" ? (paymentPayload.installments ?? 1) : null,
      mp_payment_id: String(payment.id ?? ""),
      asaas_payment_id: null,
      asaas_invoice_url: ticketUrl,
      asaas_boleto_url: boletoUrl,
      asaas_pix_qr_code: pixQr,
      asaas_pix_copy_paste: pixCopy,
      asaas_pix_expires_at: pixExp,
      card_last4:
        data.method === "CREDIT_CARD" && data.card
          ? onlyDigits(data.card.number).slice(-4)
          : null,
      payment_raw: payment,
    };

    const status = String(payment.status ?? "").toLowerCase();
    if (status === "approved") {
      patch.payment_status = "paid";
      patch.status = "paid";
    } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) {
      patch.payment_status = status === "refunded" ? "refunded" : "failed";
    }

    await supabaseAdmin.from("store_orders").update(patch as never).eq("id", order.id);

    return {
      ok: true,
      payment_id: String(payment.id ?? ""),
      status: payment.status,
      invoice_url: ticketUrl,
      boleto_url: boletoUrl,
      pix_qr_code: pixQr,
      pix_copy_paste: pixCopy,
      pix_expires_at: pixExp,
    };
  });

export const syncMercadopagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ order_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("store_orders")
      .select("id, mp_payment_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order?.mp_payment_id) throw new Error("Pedido sem cobrança Mercado Pago");

    const payment = await mp<any>(`/v1/payments/${order.mp_payment_id}`, { method: "GET" });
    const status = String(payment.status ?? "").toLowerCase();
    const patch: Record<string, any> = { payment_raw: payment };
    if (status === "approved") {
      patch.payment_status = "paid";
      patch.status = "paid";
    } else if (["rejected", "cancelled"].includes(status)) {
      patch.payment_status = "failed";
    } else if (status === "refunded" || status === "charged_back") {
      patch.payment_status = "refunded";
    }
    await supabaseAdmin.from("store_orders").update(patch as never).eq("id", order.id);
    return { status, patch };
  });
