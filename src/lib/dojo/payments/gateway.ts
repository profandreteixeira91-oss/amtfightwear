// ============================================================
// AMT Pay v3 — Camada de abstração de gateway de pagamento.
// TODO o motor financeiro (ledger, wallet, recorrências) fala
// apenas com esta interface. Trocar de gateway = trocar o
// adapter, sem mexer em nenhuma regra de negócio.
// ============================================================

export type GatewayId = "asaas" | "mercadopago" | "efi" | "pagbank" | "stripe" | "pagarme";

export type PaymentMethod = "pix" | "boleto" | "card";

export type CreateChargeInput = {
  ownerId: string;
  externalRef: string;       // id da cobrança recorrente / ciclo no AMT Pay
  amount: number;            // valor bruto em BRL
  method: PaymentMethod;
  installments?: number;     // para cartão
  dueDate: string;           // yyyy-mm-dd
  description?: string;
  customer: {
    name: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  metadata?: Record<string, unknown>;
};

export type CreateChargeResult = {
  gatewayId: GatewayId;
  externalId: string;        // id no gateway
  status: "pending" | "confirmed" | "failed";
  checkoutUrl?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  boletoUrl?: string | null;
  raw?: unknown;
};

export type TransferPixInput = {
  ownerId: string;
  amount: number;
  pixKey: string;
  pixKeyType: "cpf" | "cnpj" | "email" | "phone" | "random";
  description?: string;
  externalRef: string;       // id do saque no AMT Pay
};

export type TransferPixResult = {
  gatewayId: GatewayId;
  externalId: string;
  status: "pending" | "confirmed" | "failed";
  raw?: unknown;
};

export type WebhookEvent = {
  gatewayId: GatewayId;
  externalId: string;
  eventType: string;         // payment.received | payment.refunded | transfer.confirmed | ...
  status: string;
  amount?: number;
  paidAt?: string | null;
  raw: unknown;
};

/**
 * Contrato mínimo de um gateway de pagamento no AMT Pay.
 * O motor NUNCA depende de detalhes de nenhum provedor.
 */
export interface PaymentGateway {
  readonly id: GatewayId;
  readonly displayName: string;

  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  cancelCharge(externalId: string): Promise<void>;
  transferPix(input: TransferPixInput): Promise<TransferPixResult>;

  /**
   * Traduz um payload de webhook cru do provedor em um evento normalizado.
   * Retorna null quando o evento é irrelevante para o motor.
   */
  parseWebhook(payload: unknown, headers: Record<string, string>): WebhookEvent | null;
}
