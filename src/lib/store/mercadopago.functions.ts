import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_BASE = "https://api.mercadopago.com";

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

/** Mensagem amigável para erros conhecidos do Mercado Pago. */
export function friendlyMpError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("without key enabled for qr")) {
    return "A conta Mercado Pago da loja ainda não possui chave Pix habilitada para receber. Cadastre uma chave Pix na conta da loja (Mercado Pago > Seu negócio > Pix) ou use Cartão/Boleto.";
  }
  if (m.includes("financial identity")) {
    return "A conta Mercado Pago da loja está com cadastro pendente e não pode gerar cobranças Pix. Conclua os dados da conta ou use Cartão/Boleto.";
  }
  return raw;
}

/** Token da conta MP da LOJA (independente da conta do AMT Pay/Dojo). */
function storeToken(): string {
  const key =
    process.env.STORE_MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!key) throw new Error("STORE_MERCADOPAGO_ACCESS_TOKEN não configurada");
  return key;
}

/** Token de fallback (conta global) usado só quando a conta da loja não tem Pix. */
function fallbackToken(): string | null {
  const store = process.env.STORE_MERCADOPAGO_ACCESS_TOKEN;
  const global = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (process.env.STORE_PIX_FALLBACK_GLOBAL === "false") return null;
  if (!global || !store || global === store) return null;
  return global;
}

async function mp<T = any>(path: string, init?: RequestInit, tokenOverride?: string): Promise<T> {
  const key = tokenOverride || storeToken();
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

/** Cria um pagamento; se a conta da loja não tiver chave Pix, tenta a conta global. */
async function createPayment(
  payload: Record<string, any>,
  headers: Record<string, string>,
): Promise<any> {
  const body = JSON.stringify(payload);
  try {
    return await mp<any>(`/v1/payments`, { method: "POST", headers, body });
  } catch (e) {
    const raw = (e as Error).message ?? "";
    const isPixKeyIssue =
      /without key enabled for qr|financial identity/i.test(raw) &&
      payload.payment_method_id === "pix";
    const fb = isPixKeyIssue ? fallbackToken() : null;
    if (!fb) throw new Error(friendlyMpError(raw));
    try {
      return await mp<any>(
        `/v1/payments`,
        { method: "POST", headers: { ...headers, "X-Idempotency-Key": `${headers["X-Idempotency-Key"]}-fb` }, body },
        fb,
      );
    } catch (e2) {
      throw new Error(friendlyMpError((e2 as Error).message ?? raw));
    }
  }
}

function storePublicKey(): string {
  const key = process.env.STORE_MERCADOPAGO_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY;
  if (!key) throw new Error("STORE_MERCADOPAGO_PUBLIC_KEY não configurada");
  return key;
}

/** Chave pública da loja para tokenizar o cartão no navegador (SDK MercadoPago.js v2). */
export const getStoreMpPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: storePublicKey(),
}));

/**
 * Fallback de bandeira por IIN — usado APENAS quando o navegador não conseguiu
 * resolver o `payment_method_id` pelo SDK do Mercado Pago (fonte de verdade).
 * A busca server-side por BIN (`/v1/payment_methods/search?bin=`) não filtra por
 * BIN nesta conta (retorna sempre o mesmo primeiro resultado), portanto não é
 * confiável e não é usada.
 */
function detectBrandFallback(cardNumber: string): string {
  const n = onlyDigits(cardNumber);
  if (/^3[47]/.test(n)) return "amex";
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|506699)/.test(n)) return "elo";
  if (/^(38|60)/.test(n)) return "hipercard";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "master";
  if (/^(30[0-5]|36)/.test(n)) return "diners";
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
        /** Token gerado no navegador pelo SDK do Mercado Pago (caminho preferido). */
        card_token: z.string().min(10).optional(),
        payment_method_id: z.string().min(2).optional(),
        issuer_id: z.string().min(1).optional(),
        card_last4: z.string().regex(/^\d{4}$/).optional(),
        card_bin: z.string().regex(/^\d{6,8}$/).optional(),
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
      // Caminho preferido: token gerado no navegador (SDK MP), com bandeira/emissor
      // resolvidos pelo próprio Mercado Pago. Fallback: tokenização no servidor
      // com consulta oficial de BIN — nunca mais bandeira adivinhada por regex.
      let token = data.card_token ?? null;
      let brand = data.payment_method_id ?? null;
      let issuerId = data.issuer_id ?? null;

      if (!token) {
        if (!data.card) throw new Error("Dados do cartão obrigatórios");
        token = await createCardToken({
          ...data.card,
          document: order.customer_document ?? "",
        });
      }
      if (!brand) {
        const src = data.card?.number ?? "";
        if (!src) {
          throw new Error(
            "Não foi possível identificar a bandeira do cartão. Recarregue a página e tente novamente.",
          );
        }
        brand = detectBrandFallback(src);
      }

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
      if (issuerId) paymentPayload.issuer_id = issuerId;
    }

    const headers: Record<string, string> = {
      "X-Idempotency-Key": `${order.id}-${Date.now()}`,
    };
    if (data.remote_ip) headers["X-Forwarded-For"] = data.remote_ip;

    const payment = await createPayment(paymentPayload, headers);

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
        data.method === "CREDIT_CARD"
          ? (data.card_last4 ?? (data.card ? onlyDigits(data.card.number).slice(-4) : null))
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

/**
 * Regera os QR Codes Pix de todos os pedidos pendentes usando a conta Mercado Pago
 * atual da loja (STORE_MERCADOPAGO_*). Útil após troca de conta/credenciais.
 */
export const adminRegenerateStorePixQrCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("store_orders")
      .select("*")
      .eq("payment_method", "PIX")
      .in("payment_status", ["pending", "failed"])
      .limit(500);
    if (error) throw new Error(error.message);

    let updated = 0;
    const failures: { order: string; message: string }[] = [];

    for (const order of orders ?? []) {
      const total = Number(order.total);
      const parts = (order.customer_name || "Cliente").trim().split(/\s+/);
      const cpf = onlyDigits(order.customer_document);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      try {
        const payment = await createPayment(
          {
            transaction_amount: Math.round(total * 100) / 100,
            description: `Pedido ${order.order_number}`,
            external_reference: order.id,
            statement_descriptor: "AMTFIGHTWEAR",
            notification_url: `https://amtfightwear.com.br/api/public/hooks/mercadopago`,
            payment_method_id: "pix",
            date_of_expiration: expires.toISOString(),
            payer: {
              email: order.customer_email,
              first_name: parts[0] || "Cliente",
              last_name: parts.slice(1).join(" ") || "AMT",
              identification: cpf ? { type: "CPF", number: cpf } : undefined,
            },
          },
          { "X-Idempotency-Key": `${order.id}-regen-${Date.now()}` },
        );
        const poi = payment?.point_of_interaction?.transaction_data ?? {};
        await supabaseAdmin
          .from("store_orders")
          .update({
            payment_provider: "mercadopago",
            payment_reference: String(payment.id ?? ""),
            mp_payment_id: String(payment.id ?? ""),
            asaas_pix_qr_code: poi.qr_code_base64
              ? `data:image/png;base64,${poi.qr_code_base64}`
              : null,
            asaas_pix_copy_paste: poi.qr_code ?? null,
            asaas_pix_expires_at: payment.date_of_expiration ?? null,
            asaas_invoice_url: poi.ticket_url ?? null,
            payment_raw: payment,
          } as never)
          .eq("id", order.id);
        updated += 1;
      } catch (e) {
        failures.push({ order: order.order_number ?? order.id, message: (e as Error).message });
      }
    }

    return { ok: failures.length === 0, updated, failures };
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
