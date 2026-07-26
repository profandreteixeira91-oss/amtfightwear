// ============================================================
// AsaasGateway — adaptador do Asaas para o contrato PaymentGateway.
// Reutiliza o cliente HTTP existente em @/lib/asaas/client.server.
// Server-only: importar apenas de handlers de server fn / server routes.
// ============================================================
import type {
  CreateChargeInput,
  CreateChargeResult,
  PaymentGateway,
  TransferPixInput,
  TransferPixResult,
  WebhookEvent,
} from "./gateway";

async function asaasFetch(path: string, init: RequestInit = {}): Promise<any> {
  const apiKey = process.env.ASAAS_PRODUCTION_API_KEY || process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_PRODUCTION_API_KEY não configurada");
  const base =
    process.env.ASAAS_ENV === "sandbox"
      ? "https://api-sandbox.asaas.com/v3"
      : "https://api.asaas.com/v3";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = json?.errors?.[0]?.description ?? json?.message ?? res.statusText;
    throw new Error(`AMT Pay ${res.status}: ${msg}`);
  }
  return json;
}

const METHOD_MAP: Record<string, string> = {
  pix: "PIX",
  boleto: "BOLETO",
  card: "CREDIT_CARD",
};

export const asaasGateway: PaymentGateway = {
  id: "asaas",
  displayName: "AMT Pay",

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    // O AMT Pay usa a conta central da AMT; o split fica a cargo do webhook.
    const body: Record<string, unknown> = {
      customer: input.customer, // aqui pode ser id do customer no Asaas — quem chama resolve
      billingType: METHOD_MAP[input.method] ?? "PIX",
      value: Number(input.amount.toFixed(2)),
      dueDate: input.dueDate,
      description: input.description ?? `AMT Pay ${input.externalRef}`,
      externalReference: input.externalRef,
    };
    if (input.method === "card" && input.installments && input.installments > 1) {
      body.installmentCount = input.installments;
      body.installmentValue = Number((input.amount / input.installments).toFixed(2));
    }
    const created = await asaasFetch(`/payments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    let pixCopyPaste: string | null = null;
    let pixQrCodeBase64: string | null = null;
    if (input.method === "pix" && created?.id) {
      try {
        const qr = await asaasFetch(`/payments/${created.id}/pixQrCode`);
        pixCopyPaste = qr?.payload ?? null;
        pixQrCodeBase64 = qr?.encodedImage ?? null;
      } catch {
        // ignora — a cobrança segue válida mesmo sem QR
      }
    }
    return {
      gatewayId: "asaas",
      externalId: created.id,
      status: "pending",
      checkoutUrl: created.invoiceUrl ?? null,
      pixCopyPaste,
      pixQrCodeBase64,
      boletoUrl: created.bankSlipUrl ?? null,
      raw: created,
    };
  },

  async cancelCharge(externalId: string) {
    await asaasFetch(`/payments/${externalId}`, { method: "DELETE" });
  },

  async transferPix(input: TransferPixInput): Promise<TransferPixResult> {
    const created = await asaasFetch(`/transfers`, {
      method: "POST",
      body: JSON.stringify({
        value: Number(input.amount.toFixed(2)),
        pixAddressKey: input.pixKey,
        pixAddressKeyType: input.pixKeyType.toUpperCase(),
        description: input.description ?? `Saque AMT Pay ${input.externalRef}`,
        externalReference: input.externalRef,
      }),
    });
    return {
      gatewayId: "asaas",
      externalId: created.id,
      status: created.status === "DONE" ? "confirmed" : "pending",
      raw: created,
    };
  },

  parseWebhook(payload: unknown): WebhookEvent | null {
    const p = payload as any;
    if (!p || typeof p !== "object") return null;
    const event = String(p.event ?? "");
    if (event.startsWith("PAYMENT_")) {
      const pay = p.payment ?? {};
      const map: Record<string, string> = {
        PAYMENT_CONFIRMED: "payment.received",
        PAYMENT_RECEIVED: "payment.received",
        PAYMENT_REFUNDED: "payment.refunded",
        PAYMENT_CHARGEBACK_REQUESTED: "payment.chargeback",
        PAYMENT_DELETED: "payment.cancelled",
        PAYMENT_OVERDUE: "payment.overdue",
      };
      const mapped = map[event];
      if (!mapped) return null;
      return {
        gatewayId: "asaas",
        externalId: pay.id,
        eventType: mapped,
        status: pay.status ?? "",
        amount: Number(pay.value ?? 0),
        paidAt: pay.paymentDate ?? pay.confirmedDate ?? null,
        raw: p,
      };
    }
    if (event.startsWith("TRANSFER_")) {
      const t = p.transfer ?? {};
      const map: Record<string, string> = {
        TRANSFER_CREATED: "transfer.pending",
        TRANSFER_DONE: "transfer.confirmed",
        TRANSFER_FAILED: "transfer.failed",
        TRANSFER_CANCELLED: "transfer.cancelled",
      };
      const mapped = map[event];
      if (!mapped) return null;
      return {
        gatewayId: "asaas",
        externalId: t.id,
        eventType: mapped,
        status: t.status ?? "",
        amount: Number(t.value ?? 0),
        paidAt: t.effectiveDate ?? null,
        raw: p,
      };
    }
    return null;
  },
};
