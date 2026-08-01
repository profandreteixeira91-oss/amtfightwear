import { todayISO } from "@/lib/dates";
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

export type AsaasChargeUpdateInput = Pick<
  AsaasChargeInput,
  "billingType" | "value" | "dueDate" | "description" | "split"
>;

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
  loginEmail?: string;
  personType?: "FISICA" | "JURIDICA";
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
  site?: string;
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

type AsaasConfig = { baseUrl: string; apiKey: string; env: AsaasEnv; source: string };

function cleanSecret(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return clean || null;
}

function normalizeEnv(value: string | undefined): AsaasEnv {
  return cleanSecret(value)?.toLowerCase() === "production" ? "production" : "sandbox";
}

function inferKeyEnv(apiKey: string, fallback: AsaasEnv): AsaasEnv {
  if (apiKey.startsWith("$aact_prod_")) return "production";
  if (apiKey.startsWith("$aact_hmlg_")) return "sandbox";
  return fallback;
}

function makeAsaasConfig(
  apiKey: string,
  fallbackEnv: AsaasEnv,
  source: string,
): AsaasConfig {
  const env = inferKeyEnv(apiKey, fallbackEnv);
  return {
    apiKey,
    env,
    source,
    baseUrl: env === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3",
  };
}

/**
 * Monta as credenciais disponíveis na ordem do ambiente configurado.
 * Em caso de chave antiga/inválida, o cliente tenta a credencial do outro
 * ambiente somente após um 401. Isso também corrige chaves salvas com aspas
 * ou espaços e evita enviar uma chave de produção para a URL de homologação.
 */
function getAsaasConfigs(): AsaasConfig[] {
  const preferredEnv = normalizeEnv(process.env.ASAAS_ENV);
  const productionKey = cleanSecret(process.env.ASAAS_PRODUCTION_API_KEY);
  const sandboxKey = cleanSecret(process.env.ASAAS_SANDBOX_API_KEY);
  const genericKey = cleanSecret(process.env.ASAAS_API_KEY);
  const candidates: AsaasConfig[] = [];

  const add = (apiKey: string | null, fallbackEnv: AsaasEnv, source: string) => {
    if (!apiKey || candidates.some((candidate) => candidate.apiKey === apiKey)) return;
    candidates.push(makeAsaasConfig(apiKey, fallbackEnv, source));
  };

  if (preferredEnv === "production") {
    add(productionKey, "production", "ASAAS_PRODUCTION_API_KEY");
    add(genericKey, "production", "ASAAS_API_KEY");
    add(sandboxKey, "sandbox", "ASAAS_SANDBOX_API_KEY");
  } else {
    add(sandboxKey, "sandbox", "ASAAS_SANDBOX_API_KEY");
    add(genericKey, "sandbox", "ASAAS_API_KEY");
    add(productionKey, "production", "ASAAS_PRODUCTION_API_KEY");
  }

  if (!candidates.length) {
    throw new Error("AMT Pay API key não configurada. Configure a credencial do ambiente do AMT Pay.");
  }

  return candidates;
}

async function asaasFetch<T>(
  path: string,
  init: RequestInit & { apiKey?: string } = {},
): Promise<T> {
  const configured = getAsaasConfigs();
  const overrideKey = cleanSecret(init.apiKey);
  const configs = overrideKey
    ? [makeAsaasConfig(overrideKey, configured[0].env, "subaccount")]
    : configured;
  const attempted: string[] = [];

  for (const cfg of configs) {
    const { apiKey: _ignoredApiKey, ...fetchInit } = init;
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      ...fetchInit,
      headers: {
        "Content-Type": "application/json",
        access_token: cfg.apiKey,
        "User-Agent": "AMT-Dojo-Manager/1.0",
        ...(init.headers || {}),
      },
    });

    const text = await res.text();
    let data: Record<string, any> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (res.ok) return data as T;

    const err = data?.errors?.[0]?.description || data?.message || res.statusText;
    if (res.status !== 401 || overrideKey) {
      throw new Error(`AMT Pay API ${res.status}: ${err}`);
    }

    attempted.push(`${cfg.source} (${cfg.env})`);
  }

  throw new Error(
    `AMT Pay API 401: nenhuma credencial configurada foi aceita. Tentativas: ${attempted.join(", ")}.`,
  );
}

async function asaasFetchMultipart<T>(
  path: string,
  form: FormData,
  overrideKey?: string,
): Promise<T> {
  const configured = getAsaasConfigs();
  const override = cleanSecret(overrideKey);
  const configs = override
    ? [makeAsaasConfig(override, configured[0].env, "subaccount")]
    : configured;
  const attempted: string[] = [];
  for (const cfg of configs) {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: "POST",
      body: form,
      headers: {
        access_token: cfg.apiKey,
        "User-Agent": "AMT-Dojo-Manager/1.0",
      },
    });
    const text = await res.text();
    let data: Record<string, any> = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (res.ok) return data as T;
    const err = data?.errors?.[0]?.description || data?.message || res.statusText;
    if (res.status !== 401 || override) {
      throw new Error(`AMT Pay API ${res.status}: ${err}`);
    }
    attempted.push(`${cfg.source} (${cfg.env})`);
  }
  throw new Error(`AMT Pay API 401 (multipart): ${attempted.join(", ")}`);
}

// ============ SUBACCOUNT DOCUMENTS ============
export type AsaasPendingDocument = {
  id: string;
  status: string;
  type: string;
  title?: string;
  description?: string;
  documents?: Array<{ id: string; fileName?: string; type?: string; status?: string }>;
};

export async function asaasListMyDocuments(
  apiKey?: string,
): Promise<{ data: AsaasPendingDocument[] }> {
  return asaasFetch<{ data: AsaasPendingDocument[] }>(`/myAccount/documents`, { apiKey });
}

export async function asaasSendMyDocument(
  pendingId: string,
  type: string,
  files: Array<{ blob: Blob; fileName: string }>,
  apiKey?: string,
): Promise<unknown> {
  const form = new FormData();
  form.set("type", type);
  for (const f of files) form.append("documentFile", f.blob, f.fileName);
  return asaasFetchMultipart(`/myAccount/documents/${pendingId}`, form, apiKey);
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

export async function asaasGetCustomer(
  customerId: string,
  apiKey?: string,
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>(`/customers/${customerId}`, { apiKey });
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

export async function asaasUpdateCharge(
  id: string,
  input: AsaasChargeUpdateInput,
  apiKey?: string,
): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    apiKey,
  });
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

export async function asaasReceiveChargeInCash(
  id: string,
  value: number,
  apiKey?: string,
): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>(`/payments/${id}/receiveInCash`, {
    method: "POST",
    body: JSON.stringify({
      paymentDate: todayISO(),
      value,
      notifyCustomer: true,
    }),
    apiKey,
  });
}

// ============ CREDIT CARD (charge on existing payment) ============
export type AsaasCreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasCreditCardHolderInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone?: string;
  mobilePhone?: string;
};

export type AsaasCardChargeResult = {
  id: string;
  status: string;
  invoiceUrl?: string;
  value?: number;
  creditCard?: { creditCardToken?: string; creditCardBrand?: string; creditCardNumber?: string };
  errorCode?: string;
  errorDescription?: string;
};

export async function asaasChargeCreditCard(
  chargeId: string,
  input: {
    creditCard: AsaasCreditCardInput;
    creditCardHolderInfo: AsaasCreditCardHolderInfo;
    remoteIp?: string;
  },
  apiKey?: string,
): Promise<AsaasCardChargeResult> {
  return asaasFetch<AsaasCardChargeResult>(`/payments/${chargeId}/payWithCreditCard`, {
    method: "POST",
    body: JSON.stringify(input),
    apiKey,
  });
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

export async function asaasListSubscriptionPayments(
  subscriptionId: string,
  apiKey?: string,
): Promise<{ data: AsaasCharge[]; totalCount: number; hasMore: boolean }> {
  return asaasFetch(`/subscriptions/${subscriptionId}/payments?limit=10`, { apiKey });
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
  return getAsaasConfigs()[0].env;
}

export function getAmtWalletId(): string {
  const walletId = process.env.ASAAS_WALLET_ID_AMT;
  if (!walletId) {
    throw new Error("ASAAS_WALLET_ID_AMT não configurado — split não pode ser aplicado.");
  }
  return walletId;
}
