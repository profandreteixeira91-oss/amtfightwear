// ============================================================
// Contratos comuns dos adaptadores de gateway do AMT Pay.
// Este arquivo é client-safe: apenas tipos.
// ============================================================
export type GatewayProvider = "asaas" | "mercadopago" | "pagseguro";

export type GatewayCapabilities = {
  provider: GatewayProvider | null;
  providerName: string;
  connected: boolean;
  /** Consulta de saldo via API. */
  balance: boolean;
  /** Extrato de lançamentos via API. */
  statement: boolean;
  /** Saques/transferências programáveis via API. */
  withdrawals: boolean;
  /** Cadastro/edição de conta bancária via API do gateway. */
  editBankAccount: boolean;
  /** Permite escolher uma chave PIX alternativa por saque. */
  chooseWithdrawalPixKey: boolean;
  /** URL do painel do gateway (para fluxos manuais). */
  dashboardUrl: string | null;
};

export type GatewayBalance = {
  available: number;
  pending: number;
  blocked: number;
  total: number;
  currency: string;
  fetchedAt: string;
};

export type NormalizedTx = {
  id: string;
  occurred_at: string;
  kind:
    | "receipt"
    | "fee"
    | "refund"
    | "withdrawal"
    | "withdrawal_reversal"
    | "adjustment"
    | "transfer_in"
    | "transfer_out";
  method: "pix" | "card" | "boleto" | "link" | "cash" | "transfer" | "internal" | "other";
  status: "pending" | "available" | "blocked" | "reversed";
  direction: 1 | -1;
  amount: number;
  net_amount: number;
  description: string | null;
  provider_tx_id: string | null;
};

export type NormalizedWithdrawal = {
  id: string;
  provider_tx_id: string | null;
  requested_at: string;
  amount: number;
  status: "requested" | "in_review" | "processing" | "paid" | "cancelled" | "rejected";
  pix_key: string | null;
  pix_key_type: string | null;
  bank_account: {
    bank_name: string | null;
    branch: string | null;
    account_number: string | null;
    pix_key: string | null;
    pix_key_type: string | null;
    holder_name: string | null;
  } | null;
};

export type ReceiptsSummary = {
  today: number;
  month: number;
  currency: string;
};

export type WithdrawalRequest = {
  amount: number;
  pixKey?: string | null;
  pixKeyType?: "cpf" | "cnpj" | "email" | "phone" | "random" | null;
  bank?: {
    bank_code?: string | null;
    branch?: string | null;
    account_number?: string | null;
    account_digit?: string | null;
    holder_name: string;
    holder_document: string;
    account_type?: "checking" | "savings" | "payment" | null;
  } | null;
  notes?: string | null;
};
