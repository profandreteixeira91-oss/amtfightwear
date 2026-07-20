/**
 * AMT Pay / Asaas — Server Functions (thin wrappers).
 *
 * Este módulo é client-reachable, então NÃO importa `client.server.ts` no topo.
 * As chamadas ao módulo Asaas são feitas dentro dos handlers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verifica a conexão com o Asaas e retorna informações do ambiente. */
export const asaasCheckConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getAsaasEnv, asaasGetBalance, getAmtWalletId } = await import(
      "@/lib/asaas/client.server"
    );

    try {
      const env = getAsaasEnv();
      const walletId = (() => {
        try {
          return getAmtWalletId();
        } catch {
          return null;
        }
      })();

      const balance = await asaasGetBalance();

      return {
        ok: true as const,
        env,
        walletId,
        balance: balance.totalBalance,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  });

/** Salva a chave PIX no perfil do dojo. */
export const setDojoPixKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        pixKey: z.string().trim().min(1).max(200),
        pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { detectPixKeyType } = await import("@/lib/asaas/client.server");

    const keyType = data.pixKeyType || detectPixKeyType(data.pixKey);
    if (!keyType) {
      throw new Error("Formato de chave PIX inválido. Use CPF, CNPJ, email, telefone ou chave aleatória.");
    }

    const { error } = await context.supabase
      .from("dojo_academy_profile")
      .update({
        pix_key: data.pixKey.trim(),
        pix_key_type: keyType.toLowerCase(),
      })
      .eq("owner_id", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true, pixKeyType: keyType };
  });

/** Retorna a config do AMT Pay do dojo logado (status, chave PIX, wallet). */
export const getMyAsaasConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select(
        "asaas_subaccount_id, asaas_wallet_id, asaas_onboarding_status, asaas_onboarding_url, pix_key, pix_key_type, legal_name, trade_name, cnpj, email, phone, whatsapp, address, city, state, zip, address_number, address_complement, neighborhood, company_type, monthly_income, birth_date",
      )
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return {
      subaccountId: data?.asaas_subaccount_id ?? null,
      walletId: data?.asaas_wallet_id ?? null,
      onboardingStatus: data?.asaas_onboarding_status ?? "not_started",
      onboardingUrl: data?.asaas_onboarding_url ?? null,
      pixKey: data?.pix_key ?? null,
      pixKeyType: data?.pix_key_type ?? null,
      hasSplit: !!data?.asaas_wallet_id,
      profile: {
        legalName: data?.legal_name ?? null,
        tradeName: data?.trade_name ?? null,
        cnpj: data?.cnpj ?? null,
        email: data?.email ?? null,
        phone: data?.phone ?? null,
        whatsapp: data?.whatsapp ?? null,
        address: data?.address ?? null,
        city: data?.city ?? null,
        state: data?.state ?? null,
        zip: data?.zip ?? null,
        addressNumber: (data as { address_number?: string | null })?.address_number ?? null,
        addressComplement: (data as { address_complement?: string | null })?.address_complement ?? null,
        neighborhood: (data as { neighborhood?: string | null })?.neighborhood ?? null,
        companyType: (data as { company_type?: string | null })?.company_type ?? null,
        monthlyIncome: (data as { monthly_income?: number | null })?.monthly_income ?? null,
        birthDate: (data as { birth_date?: string | null })?.birth_date ?? null,
      },
    };
  });

/**
 * Cria a subconta Asaas do dojo autenticado.
 * Requer perfil preenchido (CPF/CNPJ, email, endereço). Os campos que faltam
 * podem ser complementados via `extras`.
 */
export const createMyAsaasSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        // Campos opcionais para complementar o perfil na hora do onboarding
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        companyType: z.enum(["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"]).optional(),
        incomeValue: z.number().positive().optional(),
        addressNumber: z.string().min(1).max(20).optional(),
        complement: z.string().max(120).optional(),
        province: z.string().min(1).max(120).optional(), // bairro
        mobilePhone: z.string().max(20).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { asaasCreateSubaccount } = await import("@/lib/asaas/client.server");

    // Carrega perfil
    const { data: profile, error: profileErr } = await context.supabase
      .from("dojo_academy_profile")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (profileErr) throw new Error(profileErr.message);
    if (!profile) throw new Error("Perfil do dojo não encontrado. Complete os dados fiscais primeiro.");

    const p = profile as Record<string, unknown> & {
      asaas_subaccount_id?: string | null;
      asaas_wallet_id?: string | null;
      asaas_onboarding_url?: string | null;
      asaas_onboarding_status?: string | null;
      legal_name?: string | null;
      trade_name?: string | null;
      cnpj?: string | null;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      address_number?: string | null;
      address_complement?: string | null;
      neighborhood?: string | null;
      company_type?: string | null;
      monthly_income?: number | null;
      birth_date?: string | null;
    };

    if (p.asaas_subaccount_id) {
      return {
        ok: true as const,
        alreadyExists: true,
        subaccountId: p.asaas_subaccount_id,
        walletId: p.asaas_wallet_id ?? null,
        onboardingUrl: p.asaas_onboarding_url ?? null,
        onboardingStatus: p.asaas_onboarding_status ?? "pending",
      };
    }

    // Merge input com perfil (input tem prioridade e será salvo no perfil depois)
    const addressNumber = data.addressNumber ?? p.address_number ?? null;
    const province = data.province ?? p.neighborhood ?? null;
    const complement = data.complement ?? p.address_complement ?? undefined;
    const companyType = (data.companyType ?? (p.company_type as typeof data.companyType | null)) ?? undefined;
    const incomeValue = data.incomeValue ?? (typeof p.monthly_income === "number" ? p.monthly_income : undefined);
    const birthDate = data.birthDate ?? (p.birth_date ? String(p.birth_date).slice(0, 10) : undefined);
    const mobilePhone = data.mobilePhone ?? (p.whatsapp ? String(p.whatsapp) : undefined);

    // Validações mínimas
    const missing: string[] = [];
    if (!p.legal_name && !p.trade_name) missing.push("Nome / Razão social");
    if (!p.cnpj) missing.push("CPF/CNPJ");
    if (!p.email) missing.push("E-mail");
    if (!p.address) missing.push("Endereço");
    if (!p.city) missing.push("Cidade");
    if (!p.state) missing.push("Estado (UF)");
    if (!p.zip) missing.push("CEP");
    if (!addressNumber) missing.push("Número do endereço");
    if (!province) missing.push("Bairro");
    if (missing.length) {
      throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
    }

    const cpfCnpj = String(p.cnpj).replace(/\D/g, "");
    const zip = String(p.zip).replace(/\D/g, "");
    const isCpf = cpfCnpj.length === 11;

    // Persiste os dados fornecidos no perfil (para próximas ativações serem 1-clique)
    await context.supabase
      .from("dojo_academy_profile")
      .update({
        address_number: addressNumber,
        address_complement: complement ?? null,
        neighborhood: province,
        company_type: companyType ?? null,
        monthly_income: incomeValue ?? null,
        birth_date: birthDate ?? null,
      } as never)
      .eq("owner_id", context.userId);

    // Criar subconta no Asaas
    const subaccount = await asaasCreateSubaccount({
      name: String(p.legal_name || p.trade_name),
      email: String(p.email),
      cpfCnpj,
      birthDate: isCpf ? birthDate : undefined,
      companyType: !isCpf ? (companyType || "MEI") : undefined,
      phone: p.phone ? String(p.phone).replace(/\D/g, "") : undefined,
      mobilePhone: mobilePhone ? mobilePhone.replace(/\D/g, "") : undefined,
      incomeValue: incomeValue ?? 5000,
      address: String(p.address),
      addressNumber: addressNumber!,
      complement,
      province: province!,
      postalCode: zip,
      externalReference: `dojo:${context.userId}`,
    });

    // Persiste subaccount_id, walletId, apiKey (privada — usada para PIX out desta subconta)
    const { error: updateErr } = await context.supabase
      .from("dojo_academy_profile")
      .update({
        asaas_subaccount_id: subaccount.id,
        asaas_wallet_id: subaccount.walletId,
        asaas_onboarding_status: subaccount.onboardingStatus || "pending",
        asaas_api_key_encrypted: subaccount.apiKey || null,
      })
      .eq("owner_id", context.userId);

    if (updateErr) throw new Error(updateErr.message);

    // Log auditoria
    await context.supabase.from("dojo_account_audit").insert({
      owner_id: context.userId,
      action: "asaas_subaccount_created",
      meta: {
        subaccount_id: subaccount.id,
        wallet_id: subaccount.walletId,
        onboarding_status: subaccount.onboardingStatus,
      },
    });

    return {
      ok: true as const,
      alreadyExists: false,
      subaccountId: subaccount.id,
      walletId: subaccount.walletId,
      onboardingStatus: subaccount.onboardingStatus || "pending",
    };
  });

/** Consulta o status atual da subconta e atualiza o onboarding_status local. */
export const refreshMyAsaasSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { asaasGetSubaccount } = await import("@/lib/asaas/client.server");

    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("asaas_subaccount_id")
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (!profile?.asaas_subaccount_id) {
      throw new Error("Subconta Asaas ainda não criada.");
    }

    const remote = await asaasGetSubaccount(profile.asaas_subaccount_id);

    await context.supabase
      .from("dojo_academy_profile")
      .update({
        asaas_onboarding_status: remote.onboardingStatus || "pending",
        asaas_wallet_id: remote.walletId,
      })
      .eq("owner_id", context.userId);

    return {
      subaccountId: remote.id,
      walletId: remote.walletId,
      onboardingStatus: remote.onboardingStatus || "pending",
    };
  });
