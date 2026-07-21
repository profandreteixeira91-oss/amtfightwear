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
  asaasGetCustomer,
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
  if (student.asaas_customer_id) {
    try {
      await asaasGetCustomer(student.asaas_customer_id, apiKey);
      return student.asaas_customer_id;
    } catch {
      // O Customer pode pertencer a outra conta Asaas; recria na conta emissora.
    }
  }
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
 * AMT Pay v2 (Fase 2 — Subcontas com split nativo).
 *
 * Se o dojo tem subconta Asaas APROVADA (com API key própria), as cobranças
 * são criadas na subconta e o Asaas aplica um split de 2% para a carteira
 * central AMT (`ASAAS_WALLET_ID_AMT`). Nesse cenário PIX/Boleto saem em nome
 * do CNPJ do dojo.
 *
 * Se o dojo apenas vinculou uma wallet externa (sem subconta), as cobranças
 * saem da conta central AMT com split de 98% para a wallet do dojo (a AMT
 * fica com 2%).
 *
 * Caso contrário, mantemos o modo central (todo o valor cai na AMT e o
 * repasse é feito pelo ledger interno + PIX transfer).
 */
export function resolveDojoAsaasCredentials(profile: {
  asaas_subaccount_id?: string | null;
  asaas_subaccount_api_key?: string | null;
  asaas_api_key_encrypted?: string | null;
  asaas_wallet_id?: string | null;
  asaas_onboarding_status?: string | null;
}): {
  apiKey: string | undefined;
  split: AsaasSplit[];
  mode: "central" | "subaccount" | "external_wallet";
} {
  const central = process.env.ASAAS_PRODUCTION_API_KEY;
  const subKey = (profile.asaas_subaccount_api_key ?? profile.asaas_api_key_encrypted ?? "").trim();
  const walletId = (profile.asaas_wallet_id ?? "").trim();
  const status = (profile.asaas_onboarding_status ?? "").toUpperCase();
  const approved = status === "APPROVED" || status === "ACTIVE";
  const amtWalletId = process.env.ASAAS_WALLET_ID_AMT?.trim();

  // Modo 1 — subconta aprovada com API key própria: cobrança na subconta,
  // split de 2% para a AMT.
  if (approved && subKey && profile.asaas_subaccount_id && amtWalletId) {
    return {
      apiKey: subKey,
      split: [{ walletId: amtWalletId, percentualValue: 2 }],
      mode: "subaccount",
    };
  }

  // Modo 2 — wallet externa vinculada (sem subconta): cobrança na conta
  // central AMT, split de 98% para a wallet do dojo.
  if (walletId && !profile.asaas_subaccount_id) {
    return {
      apiKey: central,
      split: [{ walletId, percentualValue: 98 }],
      mode: "external_wallet",
    };
  }

  // Modo 3 — fallback central (dojo sem AMT Pay ativado ou pendente).
  return {
    apiKey: central,
    split: [],
    mode: "central",
  };
}

/**
 * Cria uma cobrança avulsa no Asaas para uma fatura.
 * Usado para taxas de matrícula e faturas manuais criadas pelo owner.
 */
export async function syncInvoiceWithAsaas(
  supabase: AnyDb,
  invoice: {
    id?: string;
    student_id: string;
    amount: number;
    due_date: string;
    description?: string | null;
    owner_id: string;
  },
) {
  // 1. Carrega profile do dojo (para chave Asaas)
  const { data: profile } = await supabase
    .from("dojo_academy_profile")
    .select(
      "asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status, trade_name",
    )
    .eq("owner_id", invoice.owner_id)
    .maybeSingle();

  const { apiKey, split } = resolveDojoAsaasCredentials((profile ?? {}) as any);

  // 2. Carrega aluno
  const { data: student } = await supabase
    .from("dojo_students")
    .select("id, full_name, email, phone, cpf, asaas_customer_id")
    .eq("id", invoice.student_id)
    .maybeSingle();

  if (!student) throw new Error("Aluno não encontrado para sincronização Asaas");

  // 3. Garante Customer no Asaas
  const customerId = await ensureAsaasCustomerForStudent(
    supabase,
    student as any,
    apiKey,
  );

  // 4. Cria Cobrança (Payment) no Asaas — descrição rebranded com identidade do dojo
  const { asaasCreateCharge } = await import("@/lib/asaas/client.server");
  const { loadInvoiceIdentity, buildBrandedChargeDescription } = await import(
    "@/lib/dojo/invoice-branding.functions"
  );
  const identity = await loadInvoiceIdentity(supabase, invoice.owner_id);
  const brandedDescription = buildBrandedChargeDescription(
    identity,
    invoice.description ?? "Mensalidade",
  );
  const charge = await asaasCreateCharge(
    {
      customer: customerId,
      billingType: "UNDEFINED", // Permite o aluno escolher (Pix/Boleto/Cartão) no link
      value: invoice.amount,
      dueDate: invoice.due_date,
      description: brandedDescription,
      externalReference: invoice.id ? `dojo_invoice:${invoice.id}` : undefined,
      split,
    },
    apiKey,
  );

  // Link de pagamento BRANDED: exibe a página do Dojo Manager em vez de asaas.com.
  // A URL branded requer o id da fatura — caller deve pré-gerar o UUID (crypto.randomUUID()).
  const siteUrl = (
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://dojomanager.amtfightwear.com.br"
  ).replace(/\/$/, "");
  // Usa /dojo/pay/... porque o subdomínio dojomanager redireciona qualquer rota
  // fora de /dojo/* para /dojo/*, e a rota pública branded existe em ambos os prefixos.
  const brandedUrl = invoice.id ? `${siteUrl}/dojo/pay/${invoice.id}` : charge.invoiceUrl;

  return {
    asaas_charge_id: charge.id,
    payment_id: charge.id,
    payment_link: brandedUrl,
    asaas_invoice_url: charge.invoiceUrl,
    payment_provider: "asaas",
    provider: "asaas",
    split_config: split,
  };
}
