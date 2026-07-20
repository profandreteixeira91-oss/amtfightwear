// ============================================================
// Adaptador Asaas — leitura ao vivo de saldo, extrato, transferências.
// Server-only.
// ============================================================
import type {
  GatewayBalance,
  GatewayCapabilities,
  NormalizedTx,
  NormalizedWithdrawal,
  ReceiptsSummary,
  WithdrawalRequest,
} from "./types";

const BASE = "https://api.asaas.com/v3"; // produção
// Nota: se o dojo estiver em sandbox, o token começa com `$aact_YTU5...` (sandbox).
// Asaas expõe o endpoint `sandbox.asaas.com/api/v3` para sandbox. Detectamos por prefixo.

function baseFor(token: string): string {
  return token.startsWith("$aact_YTU5") || token.startsWith("$aact_hmlg")
    ? "https://sandbox.asaas.com/api/v3"
    : BASE;
}

function authHeaders(token: string): Record<string, string> {
  return {
    access_token: token,
    "Content-Type": "application/json",
    "User-Agent": "AMTPay/1.0",
  };
}

async function req<T = any>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${baseFor(token)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers as any) },
  });
  const text = await res.text();
  const body = text ? (safeJson(text) ?? text) : null;
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && (body as any).errors?.[0]?.description) ||
      (typeof body === "string" ? body : `${res.status} ${res.statusText}`);
    throw new Error(`Asaas: ${msg}`);
  }
  return body as T;
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Capacidades
// ------------------------------------------------------------
export function asaasCapabilities(): GatewayCapabilities {
  return {
    provider: "asaas",
    providerName: "Asaas",
    connected: true,
    balance: true,
    statement: true,
    withdrawals: true,
    editBankAccount: false, // conta bancária configurada no painel do Asaas
    chooseWithdrawalPixKey: true,
    dashboardUrl: "https://www.asaas.com/finance",
  };
}

// ------------------------------------------------------------
// Saldo
// ------------------------------------------------------------
export async function asaasGetBalance(token: string): Promise<GatewayBalance> {
  const data = await req<{ balance?: number; totalBalance?: number }>(token, "/finance/balance");
  const available = Number(data.balance ?? data.totalBalance ?? 0);
  return {
    available,
    pending: 0,
    blocked: 0,
    total: available,
    currency: "BRL",
    fetchedAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// Extrato (financialTransactions)
// ------------------------------------------------------------
type AsaasFinTx = {
  id?: string;
  transactionReceiptUrl?: string | null;
  date: string; // YYYY-MM-DD
  value: number; // pode ser negativo
  netValue?: number;
  balance?: number;
  type?: string; // PAYMENT_RECEIVED, PAYMENT_FEE, TRANSFER, PAYMENT_REFUND_CANCELLED...
  description?: string | null;
  payment?: { id: string; billingType?: string } | null;
  transfer?: { id: string } | null;
};

function mapFinTx(row: AsaasFinTx): NormalizedTx {
  const type = (row.type ?? "").toUpperCase();
  const amount = Number(row.value ?? 0);
  const direction: 1 | -1 = amount >= 0 ? 1 : -1;
  const abs = Math.abs(amount);

  let kind: NormalizedTx["kind"] = "adjustment";
  if (type.includes("PAYMENT_RECEIVED") || type.includes("PAYMENT_CONFIRMED")) kind = "receipt";
  else if (type.includes("FEE")) kind = "fee";
  else if (type.includes("REFUND") || type.includes("CHARGEBACK")) kind = "refund";
  else if (type.includes("TRANSFER")) kind = direction === -1 ? "withdrawal" : "transfer_in";
  else if (type.includes("REVERSAL")) kind = "withdrawal_reversal";

  const billingType = (row.payment?.billingType ?? "").toUpperCase();
  let method: NormalizedTx["method"] = "other";
  if (billingType.includes("PIX")) method = "pix";
  else if (billingType.includes("CREDIT") || billingType.includes("DEBIT")) method = "card";
  else if (billingType.includes("BOLETO")) method = "boleto";
  else if (kind === "withdrawal" || kind === "transfer_in") method = "transfer";
  else if (kind === "fee") method = "internal";

  return {
    id: row.id ?? `${row.date}-${row.value}-${row.type ?? ""}`,
    occurred_at: `${row.date}T12:00:00.000Z`,
    kind,
    method,
    status: "available",
    direction,
    amount: abs,
    net_amount: Number(row.netValue ?? abs),
    description: row.description ?? null,
    provider_tx_id: row.payment?.id ?? row.transfer?.id ?? row.id ?? null,
  };
}

export async function asaasGetStatement(
  token: string,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<NormalizedTx[]> {
  const q = new URLSearchParams();
  if (opts.from) q.set("startDate", opts.from.slice(0, 10));
  if (opts.to) q.set("finishDate", opts.to.slice(0, 10));
  q.set("limit", String(Math.min(opts.limit ?? 100, 100)));
  const data = await req<{ data: AsaasFinTx[] }>(token, `/financialTransactions?${q.toString()}`);
  return (data.data ?? []).map(mapFinTx);
}

// ------------------------------------------------------------
// Resumo de recebimentos (hoje / mês)
// ------------------------------------------------------------
export async function asaasGetReceiptsSummary(token: string): Promise<ReceiptsSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString().slice(0, 10);

  const [today, month] = await Promise.all([
    asaasGetStatement(token, { from: startOfDay, to: endOfDay, limit: 100 }),
    asaasGetStatement(token, { from: startOfMonth, to: endOfDay, limit: 100 }),
  ]);
  const sum = (rows: NormalizedTx[]) =>
    rows.filter((r) => r.kind === "receipt" && r.direction === 1).reduce((s, r) => s + r.net_amount, 0);
  return { today: sum(today), month: sum(month), currency: "BRL" };
}

// ------------------------------------------------------------
// Saques / transferências
// ------------------------------------------------------------
type AsaasTransfer = {
  id: string;
  dateCreated: string;
  status: string; // PENDING, DONE, CANCELLED, FAILED, BANK_PROCESSING
  value: number;
  netValue?: number;
  operationType?: string;
  pixAddressKey?: string | null;
  pixAddressKeyType?: string | null;
  bankAccount?: {
    bank?: { code?: string; name?: string };
    agency?: string;
    account?: string;
    accountDigit?: string;
    ownerName?: string;
  } | null;
};

function mapTransfer(t: AsaasTransfer): NormalizedWithdrawal {
  const st = (t.status ?? "").toUpperCase();
  let status: NormalizedWithdrawal["status"] = "requested";
  if (st === "PENDING") status = "requested";
  else if (st === "BANK_PROCESSING") status = "processing";
  else if (st === "DONE") status = "paid";
  else if (st === "CANCELLED") status = "cancelled";
  else if (st === "FAILED") status = "rejected";
  return {
    id: t.id,
    provider_tx_id: t.id,
    requested_at: t.dateCreated,
    amount: Number(t.value ?? 0),
    status,
    pix_key: t.pixAddressKey ?? null,
    pix_key_type: t.pixAddressKeyType ? String(t.pixAddressKeyType).toLowerCase() : null,
    bank_account: t.bankAccount
      ? {
          bank_name: t.bankAccount.bank?.name ?? null,
          branch: t.bankAccount.agency ?? null,
          account_number: t.bankAccount.account ?? null,
          pix_key: t.pixAddressKey ?? null,
          pix_key_type: t.pixAddressKeyType ? String(t.pixAddressKeyType).toLowerCase() : null,
          holder_name: t.bankAccount.ownerName ?? null,
        }
      : null,
  };
}

export async function asaasListWithdrawals(token: string): Promise<NormalizedWithdrawal[]> {
  const data = await req<{ data: AsaasTransfer[] }>(token, "/transfers?limit=100");
  return (data.data ?? []).map(mapTransfer);
}

export async function asaasRequestWithdrawal(
  token: string,
  input: WithdrawalRequest,
): Promise<NormalizedWithdrawal> {
  const body: Record<string, unknown> = {
    value: Number(input.amount),
    operationType: "PIX",
  };
  if (input.pixKey && input.pixKeyType) {
    body.pixAddressKey = input.pixKey;
    body.pixAddressKeyType = input.pixKeyType.toUpperCase();
  } else if (input.bank) {
    body.operationType = "TED";
    body.bankAccount = {
      bank: { code: input.bank.bank_code ?? "" },
      accountName: input.bank.holder_name,
      ownerName: input.bank.holder_name,
      cpfCnpj: input.bank.holder_document,
      agency: input.bank.branch ?? "",
      account: input.bank.account_number ?? "",
      accountDigit: input.bank.account_digit ?? "",
      bankAccountType: (input.bank.account_type ?? "checking").toUpperCase(),
    };
  } else {
    throw new Error("Informe uma chave PIX ou dados bancários para o saque.");
  }
  const t = await req<AsaasTransfer>(token, "/transfers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapTransfer(t);
}

export async function asaasCancelWithdrawal(token: string, id: string): Promise<void> {
  await req(token, `/transfers/${id}/cancel`, { method: "POST" });
}
