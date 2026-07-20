/**
 * Asaas HTTP Client — Camada de acesso à API Asaas para o AMT Pay.
 *
 * SERVER-ONLY. Este módulo é bloqueado do bundle client pelo sufixo `.server.ts`.
 * Nunca importe deste arquivo em componentes React ou rotas — use os wrappers
 * `createServerFn` em `asaas.functions.ts`.
 *
 * Ambiente controlado por ASAAS_ENV: "sandbox" | "production".
 * API key controlada por ASAAS_API_KEY (produção) ou ASAAS_SANDBOX_API_KEY (sandbox).
 */

export type AsaasEnv = "sandbox" | "production";

export type AsaasPixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

export type AsaasSplit = {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
};

export type AsaasChargeInput = {
  customer: string; // customer id
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  split?: AsaasSplit[];
  postalService?: boolean;
};

export type AsaasCharge = {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  invoiceUrl: string;
  bankSlipUrl?: string | null;
  dueDate: string;
  billingType: string;
  externalReference?: string | null;
};

export type AsaasPixInfo = {
  encodedImage: string; // base64 QR
  payload: string; // copia-e-cola
  expirationDate?: string;
};

export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
  phone?: string;
};

export type AsaasCustomerInput = {
  name: string;
  email?: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  externalReference?: string;
};

export type AsaasSubaccountInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate?: string;
  companyType?: "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
  phone?: string;
  mobilePhone?: string;
  incomeValue?: number;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  postalCode: string;
  externalReference?: string;
};

export type AsaasSubaccount = {
  id: string;
  walletId: string;
  apiKey?: string;
  name: string;
  email: string;
  loginEmail?: string;
  cpfCnpj: string;
  onboardingStatus?: string;
};

export type AsaasSubscriptionInput = {
  customer: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
  description?: string;
  externalReference?: string;
  split?: AsaasSplit[];
  endDate?: string;
  maxPayments?: number;
};

export type AsaasSubscription = {
  id: string;
  customer: string;
  status: string;
  cycle: string;
  value: number;
  nextDueDate: string;
};

export type AsaasTransferInput = {
  value: number;
  pixAddressKey: string;
  pixAddressKeyType: AsaasPixKeyType;
  description?: string;
  externalReference?: string;
};

export type AsaasTransfer = {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  effectiveDate?: string | null;
  transferDate?: string;
};

export type AsaasBalance = {
  totalBalance: number;
};

/** Lê env vars e configura URL base + API key ativa. */
function getAsaasConfig(): { baseUrl: string; apiKey: string; env: AsaasEnv } {
  const env = (process.env.ASAAS_ENV || "sandbox") as AsaasEnv;
  const isProd = env === "production";
  const apiKey = isProd
    ? process.env.ASAAS_API_KEY
    : process.env.ASAAS_SANDBOX_API_KEY || process.env.ASAAS_API_KEY;

  if (!apiKey) {
    throw new Error(
      `Asaas API key não configurada para ambiente ${env}. ` +
        `Configure ${isProd ? "ASAAS_API_KEY" : "ASAAS_SANDBOX_API_KEY"}.`,
    );
  }

  const baseUrl = isProd ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
  return { baseUrl, apiKey, env };
}

async function asaasFetch<T>(
  path: string,
  init: RequestInit & { apiKey?: string } = {},
): Promise<T> {
  const cfg = getAsaasConfig();
  const apiKey = init.apiKey || cfg.apiKey;

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "AMT-Dojo-Manager/1.0",
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = data?.errors?.[0]?.description || data?.message || res.statusText;
    throw new Error(`Asaas API ${res.status}: ${err}`);
  }

  return data as T;
}

// ============ CUSTOMERS ============
export async function asaasCreateCustomer(
  input: AsaasCustomerInput,
  apiKey?: string,
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
    apiKey,
  });
}

export async function asaasFindCustomerByCpfCnpj(
  cpfCnpj: string,
  apiKey?: string,
): Promise<AsaasCustomer | null> {
  const res = await asaasFetch<{ data: AsaasCustomer[]; totalCount: number }>(
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
    { apiKey },
  );
  return res.data?.[0] || null;
}

// ============ SUBACCOUNTS (dojos) ============
export async function asaasCreateSubaccount(
  input: AsaasSubaccountInput,
): Promise<AsaasSubaccount> {
  return asaasFetch<AsaasSubaccount>("/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function asaasGetSubaccount(id: string): Promise<AsaasSubaccount> {
  return asaasFetch<AsaasSubaccount>(`/accounts/${id}`);
}

// ============ CHARGES ============
export async function asaasCreateCharge(
  input: AsaasChargeInput,
  apiKey?: string,
): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
    apiKey,
  });
}

export async function asaasGetCharge(id: string, apiKey?: string): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${id}`, { apiKey });
}

export async function asaasGetChargePix(
  chargeId: string,
  apiKey?: string,
): Promise<AsaasPixInfo> {
  return asaasFetch<AsaasPixInfo>(`/payments/${chargeId}/pixQrCode`, { apiKey });
}

export async function asaasCancelCharge(id: string, apiKey?: string): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${id}`, { method: "DELETE", apiKey });
}

// ============ SUBSCRIPTIONS ============
export async function asaasCreateSubscription(
  input: AsaasSubscriptionInput,
  apiKey?: string,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
    apiKey,
  });
}

export async function asaasCancelSubscription(
  id: string,
  apiKey?: string,
): Promise<{ deleted: boolean; id: string }> {
  return asaasFetch<{ deleted: boolean; id: string }>(`/subscriptions/${id}`, {
    method: "DELETE",
    apiKey,
  });
}

// ============ TRANSFERS (PIX out) ============
export async function asaasCreateTransfer(
  input: AsaasTransferInput,
  apiKey?: string,
): Promise<AsaasTransfer> {
  return asaasFetch<AsaasTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      value: input.value,
      pixAddressKey: input.pixAddressKey,
      pixAddressKeyType: input.pixAddressKeyType,
      description: input.description,
      externalReference: input.externalReference,
      operationType: "PIX",
    }),
    apiKey,
  });
}

export async function asaasGetTransfer(id: string, apiKey?: string): Promise<AsaasTransfer> {
  return asaasFetch<AsaasTransfer>(`/transfers/${id}`, { apiKey });
}

// ============ BALANCE ============
export async function asaasGetBalance(apiKey?: string): Promise<AsaasBalance> {
  return asaasFetch<AsaasBalance>("/finance/balance", { apiKey });
}

export async function asaasListFinancialTransactions(
  params: { startDate?: string; endDate?: string; offset?: number; limit?: number } = {},
  apiKey?: string,
): Promise<{ data: Array<Record<string, unknown>>; totalCount: number; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  query.set("offset", String(params.offset ?? 0));
  query.set("limit", String(params.limit ?? 50));
  return asaasFetch(`/financialTransactions?${query.toString()}`, { apiKey });
}

// ============ UTILITIES ============
export function detectPixKeyType(key: string): AsaasPixKeyType | null {
  const clean = key.trim();
  if (/^\d{11}$/.test(clean.replace(/\D/g, "")) && clean.replace(/\D/g, "").length === 11)
    return "CPF";
  if (clean.replace(/\D/g, "").length === 14) return "CNPJ";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "EMAIL";
  if (/^\+?\d{10,14}$/.test(clean.replace(/\D/g, ""))) return "PHONE";
  if (/^[a-f0-9-]{32,36}$/i.test(clean)) return "EVP";
  return null;
}

export function getAsaasEnv(): AsaasEnv {
  return (process.env.ASAAS_ENV || "sandbox") as AsaasEnv;
}

export function getAmtWalletId(): string {
  const walletId = process.env.ASAAS_WALLET_ID_AMT;
  if (!walletId) {
    throw new Error("ASAAS_WALLET_ID_AMT não configurado — split não pode ser aplicado.");
  }
  return walletId;
}
