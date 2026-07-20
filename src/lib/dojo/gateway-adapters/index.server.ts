// ============================================================
// Resolvedor de adaptador por dono do dojo.
// Server-only. Chame apenas dentro de handlers autenticados.
// ============================================================
import type {
  GatewayBalance,
  GatewayCapabilities,
  NormalizedTx,
  NormalizedWithdrawal,
  ReceiptsSummary,
  WithdrawalRequest,
} from "./types";
import {
  asaasCancelWithdrawal,
  asaasCapabilities,
  asaasGetBalance,
  asaasGetReceiptsSummary,
  asaasGetStatement,
  asaasListWithdrawals,
  asaasRequestWithdrawal,
} from "./asaas.server";
import {
  mpCancelWithdrawal,
  mpCapabilities,
  mpGetBalance,
  mpGetReceiptsSummary,
  mpGetStatement,
  mpListWithdrawals,
  mpRequestWithdrawal,
} from "./mercadopago.server";

export type GatewayAdapter = {
  capabilities: GatewayCapabilities;
  getBalance: () => Promise<GatewayBalance>;
  getStatement: (opts?: { from?: string; to?: string; limit?: number }) => Promise<NormalizedTx[]>;
  getReceiptsSummary: () => Promise<ReceiptsSummary>;
  listWithdrawals: () => Promise<NormalizedWithdrawal[]>;
  requestWithdrawal: (input: WithdrawalRequest) => Promise<NormalizedWithdrawal>;
  cancelWithdrawal: (id: string) => Promise<void>;
};

function nullBalance(): GatewayBalance {
  return { available: 0, pending: 0, blocked: 0, total: 0, currency: "BRL", fetchedAt: new Date().toISOString() };
}

function nullAdapter(): GatewayAdapter {
  return {
    capabilities: {
      provider: null,
      providerName: "—",
      connected: false,
      balance: false,
      statement: false,
      withdrawals: false,
      editBankAccount: false,
      chooseWithdrawalPixKey: false,
      dashboardUrl: null,
    },
    getBalance: async () => nullBalance(),
    getStatement: async () => [],
    getReceiptsSummary: async () => ({ today: 0, month: 0, currency: "BRL" }),
    listWithdrawals: async () => [],
    requestWithdrawal: async () => {
      throw new Error("Conecte um gateway de pagamento antes de solicitar saques.");
    },
    cancelWithdrawal: async () => {
      throw new Error("Conecte um gateway de pagamento antes de cancelar saques.");
    },
  };
}

/** Resolve o adapter do dono com base em `dojo_payment_gateways`. */
export async function resolveAdapter(ownerId: string): Promise<GatewayAdapter> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("dojo_payment_gateways")
    .select("provider, access_token, is_default, active")
    .eq("owner_id", ownerId)
    .eq("active", true)
    .order("is_default", { ascending: false });

  const gw = (data ?? []).find((g: any) => g.is_default) ?? (data ?? [])[0];
  if (!gw || !gw.access_token) return nullAdapter();

  if (gw.provider === "asaas") {
    const token = gw.access_token as string;
    return {
      capabilities: asaasCapabilities(),
      getBalance: () => asaasGetBalance(token),
      getStatement: (opts) => asaasGetStatement(token, opts),
      getReceiptsSummary: () => asaasGetReceiptsSummary(token),
      listWithdrawals: () => asaasListWithdrawals(token),
      requestWithdrawal: (input) => asaasRequestWithdrawal(token, input),
      cancelWithdrawal: (id) => asaasCancelWithdrawal(token, id),
    };
  }

  if (gw.provider === "mercadopago") {
    const token = gw.access_token as string;
    return {
      capabilities: mpCapabilities(),
      getBalance: () => mpGetBalance(token),
      getStatement: (opts) => mpGetStatement(token, opts),
      getReceiptsSummary: () => mpGetReceiptsSummary(token),
      listWithdrawals: () => mpListWithdrawals(token),
      requestWithdrawal: (input) => mpRequestWithdrawal(token, input),
      cancelWithdrawal: (id) => mpCancelWithdrawal(token, id),
    };
  }

  return nullAdapter();
}
