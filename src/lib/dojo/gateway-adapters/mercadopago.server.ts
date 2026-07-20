// ============================================================
// Adaptador Mercado Pago — v1: consulta limitada.
// Mercado Pago não expõe uma API pública simples de saldo/saques
// para contas de vendedor. Nesta primeira versão o AMT Pay apenas
// oferece um atalho para o painel do MP e conta com dados internos
// (pagamentos criados via checkout) para o extrato de recebimentos.
// ============================================================
import type {
  GatewayBalance,
  GatewayCapabilities,
  NormalizedTx,
  NormalizedWithdrawal,
  ReceiptsSummary,
  WithdrawalRequest,
} from "./types";

export function mpCapabilities(): GatewayCapabilities {
  return {
    provider: "mercadopago",
    providerName: "Mercado Pago",
    connected: true,
    balance: false,
    statement: false,
    withdrawals: false,
    editBankAccount: false,
    chooseWithdrawalPixKey: false,
    dashboardUrl: "https://www.mercadopago.com.br/balance",
  };
}

export async function mpGetBalance(_token: string): Promise<GatewayBalance> {
  return {
    available: 0,
    pending: 0,
    blocked: 0,
    total: 0,
    currency: "BRL",
    fetchedAt: new Date().toISOString(),
  };
}

export async function mpGetStatement(
  _token: string,
  _opts: { from?: string; to?: string; limit?: number } = {},
): Promise<NormalizedTx[]> {
  return [];
}

export async function mpGetReceiptsSummary(_token: string): Promise<ReceiptsSummary> {
  return { today: 0, month: 0, currency: "BRL" };
}

export async function mpListWithdrawals(_token: string): Promise<NormalizedWithdrawal[]> {
  return [];
}

export async function mpRequestWithdrawal(
  _token: string,
  _input: WithdrawalRequest,
): Promise<NormalizedWithdrawal> {
  throw new Error(
    "O Mercado Pago não permite solicitar saques via API. Acesse o painel do Mercado Pago para transferir o saldo para sua conta bancária.",
  );
}

export async function mpCancelWithdrawal(_token: string, _id: string): Promise<void> {
  throw new Error("Cancelamento de saque disponível apenas no painel do Mercado Pago.");
}
