import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ASAAS_BASE = "https://api.asaas.com/v3";

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

async function asaas<T = any>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "AMT Fight Wear",
      access_token: key,
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
      body?.errors?.[0]?.description ||
      body?.errors?.map?.((e: any) => e.description).join("; ") ||
      (typeof body === "string" ? body : `Asaas ${res.status}`);
    throw new Error(msg);
  }
  return body as T;
}

async function findOrCreateAsaasCustomer(opts: {
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    complement?: string | null;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
}): Promise<string> {
  const cpfCnpj = onlyDigits(opts.document);
  if (cpfCnpj) {
    const found = await asaas<{ data?: Array<{ id: string }> }>(
      `/customers?cpfCnpj=${cpfCnpj}`,
      { method: "GET" },
    );
    if (found?.data?.[0]?.id) return found.data[0].id;
  } else {
    const found = await asaas<{ data?: Array<{ id: string }> }>(
      `/customers?email=${encodeURIComponent(opts.email)}`,
      { method: "GET" },
    );
    if (found?.data?.[0]?.id) return found.data[0].id;
  }

  const created = await asaas<{ id: string }>(`/customers`, {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      email: opts.email,
      cpfCnpj: cpfCnpj || undefined,
      mobilePhone: onlyDigits(opts.phone) || undefined,
      postalCode: opts.address?.zip ? onlyDigits(opts.address.zip) : undefined,
      address: opts.address?.street,
      addressNumber: opts.address?.number,
      complement: opts.address?.complement || undefined,
      province: opts.address?.neighborhood,
      notificationDisabled: false,
    }),
  });
  return created.id;
}

const CardSchema = z.object({
  holderName: z.string().min(2),
  number: z.string().min(12),
  expiryMonth: z.string().min(1),
  expiryYear: z.string().min(2),
  ccv: z.string().min(3),
});

export const createAsaasPayment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        method: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]),
        installments: z.number().int().min(1).max(12).optional(),
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

    if (order.asaas_payment_id && order.payment_status !== "pending" && order.payment_status !== "failed") {
      throw new Error("Pedido já possui pagamento em andamento");
    }

    const addr = (order.shipping_address as any) ?? {};

    const customerId =
      order.asaas_customer_id ||
      (await findOrCreateAsaasCustomer({
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        document: order.customer_document,
        address: {
          zip: addr.zip,
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
        },
      }));

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (data.method === "BOLETO" ? 3 : 1));
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const total = Number(order.total);
    const useInstallments =
      data.method === "CREDIT_CARD" && data.installments && data.installments > 1;

    const paymentPayload: Record<string, any> = {
      customer: customerId,
      billingType: data.method,
      dueDate: dueDateStr,
      description: `Pedido ${order.order_number}`,
      externalReference: order.id,
    };

    if (useInstallments) {
      paymentPayload.installmentCount = data.installments;
      paymentPayload.installmentValue = Math.round((total / (data.installments as number)) * 100) / 100;
      paymentPayload.totalValue = total;
    } else {
      paymentPayload.value = total;
    }

    if (data.method === "CREDIT_CARD") {
      if (!data.card) throw new Error("Dados do cartão obrigatórios");
      paymentPayload.creditCard = {
        holderName: data.card.holderName,
        number: onlyDigits(data.card.number),
        expiryMonth: data.card.expiryMonth.padStart(2, "0"),
        expiryYear:
          data.card.expiryYear.length === 2 ? `20${data.card.expiryYear}` : data.card.expiryYear,
        ccv: data.card.ccv,
      };
      paymentPayload.creditCardHolderInfo = {
        name: order.customer_name,
        email: order.customer_email,
        cpfCnpj: onlyDigits(order.customer_document) || onlyDigits(data.card.holderName) || "00000000000",
        postalCode: onlyDigits(addr.zip ?? "") || "00000000",
        addressNumber: addr.number || "S/N",
        addressComplement: addr.complement || undefined,
        phone: onlyDigits(order.customer_phone ?? "") || undefined,
        mobilePhone: onlyDigits(order.customer_phone ?? "") || undefined,
      };
      if (data.remote_ip) paymentPayload.remoteIp = data.remote_ip;
    }

    const payment = await asaas<any>(useInstallments ? `/payments` : `/payments`, {
      method: "POST",
      body: JSON.stringify(paymentPayload),
    });

    // Para PIX, buscar QR Code
    let pixQr: string | null = null;
    let pixCopy: string | null = null;
    let pixExp: string | null = null;
    if (data.method === "PIX" && payment?.id) {
      try {
        const qr = await asaas<{ encodedImage?: string; payload?: string; expirationDate?: string }>(
          `/payments/${payment.id}/pixQrCode`,
          { method: "GET" },
        );
        pixQr = qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null;
        pixCopy = qr.payload ?? null;
        pixExp = qr.expirationDate ?? null;
      } catch {
        /* ignore */
      }
    }

    const patch: Record<string, any> = {
      payment_method: data.method,
      installments: useInstallments ? data.installments : data.method === "CREDIT_CARD" ? 1 : null,
      asaas_customer_id: customerId,
      asaas_payment_id: payment.id,
      asaas_invoice_url: payment.invoiceUrl ?? null,
      asaas_boleto_url: payment.bankSlipUrl ?? null,
      asaas_pix_qr_code: pixQr,
      asaas_pix_copy_paste: pixCopy,
      asaas_pix_expires_at: pixExp,
      card_last4:
        data.method === "CREDIT_CARD" && data.card
          ? onlyDigits(data.card.number).slice(-4)
          : null,
      payment_raw: payment,
    };

    // Se cartão foi aprovado imediatamente, marca como pago
    const status = String(payment.status ?? "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status)) {
      patch.payment_status = "paid";
      patch.status = "paid";
    } else if (status === "REFUSED" || status === "REFUNDED") {
      patch.payment_status = "failed";
    }

    await supabaseAdmin.from("store_orders").update(patch).eq("id", order.id);

    return {
      ok: true,
      payment_id: payment.id,
      status: payment.status,
      invoice_url: payment.invoiceUrl ?? null,
      boleto_url: payment.bankSlipUrl ?? null,
      pix_qr_code: pixQr,
      pix_copy_paste: pixCopy,
      pix_expires_at: pixExp,
    };
  });

export const syncAsaasPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ order_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("store_orders")
      .select("id, asaas_payment_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order?.asaas_payment_id) throw new Error("Pedido sem cobrança Asaas");

    const payment = await asaas<any>(`/payments/${order.asaas_payment_id}`, { method: "GET" });
    const status = String(payment.status ?? "").toUpperCase();
    const patch: Record<string, any> = { payment_raw: payment };
    if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status)) {
      patch.payment_status = "paid";
      patch.status = "paid";
    } else if (["REFUSED", "REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"].includes(status)) {
      patch.payment_status = "failed";
    } else if (status === "OVERDUE") {
      patch.payment_status = "overdue";
    }
    await supabaseAdmin.from("store_orders").update(patch).eq("id", order.id);
    return { status, patch };
  });
