/**
 * Helpers server-only para orquestrar matrículas → Asaas (customer + subscription).
 * Fluxo NextFit-like: uma matrícula ativa vira uma Subscription no Asaas,
 * e o próprio Asaas emite cada cobrança automaticamente no ciclo do plano.
 *
 * SERVER-ONLY (sufixo .server.ts bloqueia bundle client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  asaasCreateCustomer,
  asaasFindCustomerByCpfCnpj,
  type AsaasSplit,
} from "@/lib/asaas/client.server";

type AnyDb = SupabaseClient<any, "public", any>;

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
export type AsaasCycle =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

/**
 * Métodos de pagamento do plano que geram cobrança pelo Asaas.
 * `manual` e `cash` são liquidados fora do gateway.
 */
export const GATEWAY_PAYMENT_METHODS = new Set([
  "pix",
  "boleto",
  "credit_card",
  "payment_link",
  "recurring",
  "debit_card",
]);

export function isGatewayPaymentMethod(code: string | null | undefined) {
  if (!code) return false;
  return GATEWAY_PAYMENT_METHODS.has(code);
}

export function mapPaymentMethodToBillingType(
  code: string | null | undefined,
): AsaasBillingType {
  switch (code) {
    case "pix":
      return "PIX";
    case "boleto":
      return "BOLETO";
    case "credit_card":
    case "debit_card":
      return "CREDIT_CARD";
    default:
      return "UNDEFINED";
  }
}

export function mapFrequencyToAsaasCycle(
  frequency: string | null | undefined,
): AsaasCycle {
  switch (frequency) {
    case "monthly":
      return "MONTHLY";
    case "bimonthly":
      return "BIMONTHLY";
    case "quarterly":
      return "QUARTERLY";
    case "quadrimestral":
      // Asaas não expõe ciclo de 4 meses; QUARTERLY é o mais próximo.
      // Se o dojo precisa de exatidão, deve usar cobrança manual.
      return "QUARTERLY";
    case "semiannual":
      return "SEMIANNUALLY";
    case "annual":
      return "YEARLY";
    case "custom":
      throw new Error(
        "Planos com frequência personalizada não suportam cobrança automática pelo Asaas. Configure o plano como mensal/bimestral/trimestral/semestral/anual, ou registre as cobranças manualmente.",
      );
    default:
      return "MONTHLY";
  }
}

/**
 * Garante que existe um Customer no Asaas para o aluno.
 * Busca por CPF (se houver), cria caso não exista, e persiste o id no aluno.
 */
export async function ensureAsaasCustomerForStudent(
  supabase: AnyDb,
  student: {
    id: string;
    full_name: string;
    email?: string | null;
    phone?: string | null;
    cpf?: string | null;
    asaas_customer_id?: string | null;
    address?: string | null;
  },
  apiKey?: string,
): Promise<string> {
  if (student.asaas_customer_id) return student.asaas_customer_id;
  if (!student.cpf || student.cpf.replace(/\D/g, "").length < 11) {
    throw new Error(
      "CPF do aluno é obrigatório para cobrança automática pelo Asaas. Preencha o CPF ou escolha cobrança manual.",
    );
  }
  const cpfClean = student.cpf.replace(/\D/g, "");

  let customerId: string | null = null;
  try {
    const found = await asaasFindCustomerByCpfCnpj(cpfClean, apiKey);
    if (found?.id) customerId = found.id;
  } catch {
    // se a busca falhar, seguimos para criar
  }

  if (!customerId) {
    const created = await asaasCreateCustomer(
      {
        name: student.full_name,
        cpfCnpj: cpfClean,
        email: student.email ?? undefined,
        phone: student.phone ?? undefined,
        mobilePhone: student.phone ?? undefined,
        externalReference: `dojo_student:${student.id}`,
      },
      apiKey,
    );
    customerId = created.id;
  }

  await supabase
    .from("dojo_students")
    .update({ asaas_customer_id: customerId } as never)
    .eq("id", student.id);
  return customerId;
}

/**
 * Resolve a API key + split a usar para as cobranças de um dojo.
 * - Se o dojo tem subconta Asaas (`asaas_api_key_encrypted`): usa a chave da
 *   subconta e aplica split de 5% para a wallet AMT.
 * - Caso contrário: cai na chave AMT central (sem split — a AMT já é dona).
 */
export function resolveDojoAsaasCredentials(profile: {
  asaas_api_key_encrypted?: string | null;
}): { apiKey: string | undefined; split: AsaasSplit[] | undefined } {
  const subaccountKey = profile?.asaas_api_key_encrypted ?? null;
  if (subaccountKey) {
    const walletId = process.env.ASAAS_WALLET_ID_AMT;
    const split: AsaasSplit[] | undefined = walletId
      ? [{ walletId, percentualValue: 5 }]
      : undefined;
    return { apiKey: subaccountKey, split };
  }
  return { apiKey: undefined, split: undefined };
}
