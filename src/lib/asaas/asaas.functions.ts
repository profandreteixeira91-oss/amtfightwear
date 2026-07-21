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
      onboardingUrl: null,
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
    // Asaas exige mobilePhone (celular) para permitir emissão de boletos.
    // Prioriza input → whatsapp → phone do perfil (cadastro do dono do dojo).
    const mobilePhoneRaw =
      data.mobilePhone ??
      (p.whatsapp ? String(p.whatsapp) : undefined) ??
      (p.phone ? String(p.phone) : undefined);
    const mobilePhone = mobilePhoneRaw ? mobilePhoneRaw.replace(/\D/g, "") : undefined;

    const cpfCnpj = String(p.cnpj ?? "").replace(/\D/g, "");
    const isCpf = cpfCnpj.length === 11;
    const isCnpj = cpfCnpj.length === 14;

    // Validações mínimas — tudo que o Asaas exige para APROVAR a subconta
    // automaticamente (sem exigir confirmação de e-mail depois).
    const missing: string[] = [];
    if (!p.legal_name && !p.trade_name) missing.push("Nome / Razão social");
    if (!isCpf && !isCnpj) missing.push("CPF ou CNPJ válido");
    if (!p.email) missing.push("E-mail");
    if (!p.address) missing.push("Endereço");
    if (!p.city) missing.push("Cidade");
    if (!p.state) missing.push("Estado (UF)");
    if (!p.zip) missing.push("CEP");
    if (!addressNumber) missing.push("Número do endereço");
    if (!province) missing.push("Bairro");
    if (!mobilePhone || mobilePhone.length < 10) missing.push("Celular (WhatsApp)");
    if (!incomeValue || incomeValue <= 0) missing.push("Faturamento mensal estimado");
    if (isCpf && !birthDate) missing.push("Data de nascimento");
    if (isCnpj && !companyType) missing.push("Tipo de titular (MEI/LTDA/…)");
    if (missing.length) {
      throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
    }

    const zip = String(p.zip).replace(/\D/g, "");

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

    // Criar subconta no Asaas — payload completo evita a etapa manual de
    // "confirmação de e-mail / ativação" que o Asaas cobra em cadastros parciais.
    const subaccount = await asaasCreateSubaccount({
      name: String(p.legal_name || p.trade_name),
      email: String(p.email),
      loginEmail: String(p.email),
      personType: isCpf ? "FISICA" : "JURIDICA",
      cpfCnpj,
      birthDate: isCpf ? birthDate : undefined,
      companyType: isCnpj ? companyType : undefined,
      phone: p.phone ? String(p.phone).replace(/\D/g, "") : (mobilePhone ?? undefined),
      mobilePhone,
      incomeValue: incomeValue!,
      address: String(p.address),
      addressNumber: addressNumber!,
      complement,
      province: province!,
      postalCode: zip,
      site: (p as any).website ?? undefined,
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

/** Consulta o status atual da subconta e atualiza o onboarding_status local.
 *  Se a subconta foi encerrada/desativada no Asaas (404 ou status terminal),
 *  limpa a configuração local para permitir uma nova ativação. */
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

    const CLOSED_STATUSES = new Set([
      "TERMINATED",
      "DISABLED",
      "CLOSED",
      "INACTIVE",
      "CANCELLED",
      "CANCELED",
      "DELETED",
      "BLOCKED",
    ]);

    const clearLocalConfig = async (reason: string, meta: Record<string, unknown>) => {
      await context.supabase
        .from("dojo_academy_profile")
        .update({
          asaas_subaccount_id: null,
          asaas_wallet_id: null,
          asaas_onboarding_status: "not_started",
          asaas_onboarding_url: null,
          asaas_api_key_encrypted: null,
        })
        .eq("owner_id", context.userId);

      await context.supabase.from("dojo_account_audit").insert({
        owner_id: context.userId,
        action: "asaas_subaccount_reset_auto",
        meta: { reason, subaccount_id: profile.asaas_subaccount_id, ...meta },
      });
    };

    try {
      const remote = await asaasGetSubaccount(profile.asaas_subaccount_id);
      const remoteStatus = String(remote.onboardingStatus || "").toUpperCase();

      if (CLOSED_STATUSES.has(remoteStatus)) {
        await clearLocalConfig("subaccount_closed", { remote_status: remoteStatus });
        return {
          subaccountId: null,
          walletId: null,
          onboardingStatus: "not_started",
          reset: true as const,
          reason: `Subconta encerrada no Asaas (status: ${remoteStatus}). Configuração redefinida.`,
        };
      }

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
        reset: false as const,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 404 ou "not found" indicam subconta removida
      if (/\b404\b/.test(msg) || /not\s*found/i.test(msg) || /inexistente|não encontrad/i.test(msg)) {
        await clearLocalConfig("subaccount_not_found", { error: msg });
        return {
          subaccountId: null,
          walletId: null,
          onboardingStatus: "not_started",
          reset: true as const,
          reason: "Subconta não encontrada no Asaas. Configuração redefinida — você pode criar uma nova.",
        };
      }
      throw err;
    }
  });

/** Reseta manualmente a configuração do AMT Pay (subconta ou wallet vinculada).
 *  Usado quando o dono do dojo encerrou a conta Asaas ou quer trocar para outra. */
export const resetMyAsaasConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("asaas_subaccount_id, asaas_wallet_id, asaas_onboarding_status")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const { error } = await context.supabase
      .from("dojo_academy_profile")
      .update({
        asaas_subaccount_id: null,
        asaas_wallet_id: null,
        asaas_onboarding_status: "not_started",
        asaas_onboarding_url: null,
        asaas_api_key_encrypted: null,
      })
      .eq("owner_id", context.userId);

    if (error) throw new Error(error.message);

    await context.supabase.from("dojo_account_audit").insert({
      owner_id: context.userId,
      action: "asaas_config_reset_manual",
      meta: {
        previous_subaccount_id: profile?.asaas_subaccount_id ?? null,
        previous_wallet_id: profile?.asaas_wallet_id ?? null,
        previous_status: profile?.asaas_onboarding_status ?? null,
      },
    });

    return { ok: true as const };
  });


/**
 * Vincula uma conta Asaas existente (o dono do dojo já possui conta própria).
 * Em vez de criar subconta, gravamos apenas o `walletId` — o split das
 * mensalidades será direcionado para a wallet informada.
 *
 * Nota: só funciona se a conta destino estiver na mesma plataforma Asaas
 * (production/sandbox) que a AMT. O walletId aparece no painel do Asaas em
 * "Minha conta" → "Integrações" → "Chaves de API".
 */
export const linkExistingAsaasAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        walletId: z
          .string()
          .trim()
          .min(10, "walletId inválido")
          .max(120, "walletId inválido"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const walletId = data.walletId.trim();

    // Validação leve: walletId do Asaas é um UUID v4.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId)) {
      throw new Error("walletId inválido — deve ser um UUID (ex: 12345678-abcd-...).");
    }

    const { error } = await context.supabase
      .from("dojo_academy_profile")
      .update({
        asaas_wallet_id: walletId,
        asaas_subaccount_id: null, // conta externa, não é subconta gerenciada
        asaas_onboarding_status: "linked_external",
      })
      .eq("owner_id", context.userId);

    if (error) throw error;

    await context.supabase.from("dojo_account_audit").insert({
      owner_id: context.userId,
      action: "asaas_account_linked_external",
      meta: { wallet_id: walletId },
    });

    return { ok: true as const, walletId };
  });

// ============================================================
// DOCUMENTOS DA SUBCONTA (KYC obrigatório, principalmente CNPJ)
// ============================================================

/** Mapeia tipos de documento do Asaas para os tipos locais salvos no bucket
 *  `dojo-documents` durante o onboarding. */
function mapAsaasTypeToLocal(asaasType: string): string[] {
  const t = asaasType.toUpperCase();
  if (t === "IDENTIFICATION") return ["identity_front", "identity_back"];
  if (t === "RESIDENCIAL_PROOF" || t === "RESIDENCE_PROOF" || t === "ADDRESS_PROOF")
    return ["address_proof"];
  if (
    t === "SOCIAL_CONTRACT" ||
    t === "ENTREPRENEUR_REQUIREMENT" ||
    t === "MINUTES_OF_ELECTION" ||
    t === "CNPJ" ||
    t === "CUSTOM"
  )
    return ["cnpj_card", "social_contract"];
  return [];
}

/** Lista os documentos pendentes/enviados na subconta Asaas do dojo autenticado. */
export const listMyAsaasDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("asaas_subaccount_id, asaas_api_key_encrypted")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const p = profile as
      | { asaas_subaccount_id?: string | null; asaas_api_key_encrypted?: string | null }
      | null;

    if (!p?.asaas_subaccount_id) {
      return { configured: false as const, apiKeyMissing: false, pending: [] as any[], localDocs: [] as any[] };
    }
    if (!p.asaas_api_key_encrypted) {
      return { configured: true as const, apiKeyMissing: true, pending: [] as any[], localDocs: [] as any[] };
    }

    const { asaasListMyDocuments } = await import("@/lib/asaas/client.server");
    let res: { data: any[] };
    try {
      res = await asaasListMyDocuments(p.asaas_api_key_encrypted);
    } catch (err) {
      throw new Error(
        `Não foi possível consultar documentos no Asaas: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const { data: local } = await context.supabase
      .from("dojo_onboarding_documents")
      .select("doc_type, file_path, mime_type")
      .eq("owner_id", context.userId);

    const localList = (local ?? []) as Array<{ doc_type: string; file_path: string; mime_type: string | null }>;
    const localTypes = new Set(localList.map((d) => String(d.doc_type)));
    const pending = (res.data ?? []).map((item) => {
      const mapped = mapAsaasTypeToLocal(String(item.type || ""));
      const availableLocal = mapped.filter((t) => localTypes.has(t));
      return {
        id: String(item.id),
        status: String(item.status || "PENDING"),
        type: String(item.type || ""),
        title: item.title ?? null,
        description: item.description ?? null,
        expectedLocalTypes: mapped,
        availableLocalTypes: availableLocal,
      };
    });

    return {
      configured: true as const,
      apiKeyMissing: false,
      pending,
      localDocs: localList.map((d) => ({
        doc_type: String(d.doc_type),
        file_name: String(d.file_path).split("/").pop() ?? String(d.file_path),
      })),
    };
  });

/** Envia os documentos locais do onboarding para os itens pendentes da subconta Asaas. */
export const sendMyAsaasDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("asaas_subaccount_id, asaas_api_key_encrypted")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const p = profile as
      | { asaas_subaccount_id?: string | null; asaas_api_key_encrypted?: string | null }
      | null;

    if (!p?.asaas_subaccount_id) throw new Error("Subconta Asaas não configurada.");
    if (!p.asaas_api_key_encrypted)
      throw new Error(
        "API key da subconta indisponível. Redefina o AMT Pay e refaça a ativação para poder enviar os documentos.",
      );

    const { asaasListMyDocuments, asaasSendMyDocument } = await import(
      "@/lib/asaas/client.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: local } = await context.supabase
      .from("dojo_onboarding_documents")
      .select("doc_type, file_path, mime_type")
      .eq("owner_id", context.userId);
    const localList = (local ?? []) as Array<{ doc_type: string; file_path: string; mime_type: string | null }>;
    const byType = new Map<string, { path: string; name: string; mime: string }>();
    for (const d of localList) {
      byType.set(String(d.doc_type), {
        path: String(d.file_path),
        name: String(d.file_path).split("/").pop() || "document.pdf",
        mime: String(d.mime_type || "application/octet-stream"),
      });
    }

    const pendingRes = await asaasListMyDocuments(p.asaas_api_key_encrypted);
    const pending = (pendingRes.data ?? []).filter(
      (d: any) => String(d.status || "").toUpperCase() !== "APPROVED",
    );

    const results: Array<{
      pendingId: string;
      asaasType: string;
      sent: boolean;
      reason?: string;
    }> = [];

    for (const item of pending) {
      const asaasType = String(item.type || "").toUpperCase();
      const localTypes = mapAsaasTypeToLocal(asaasType);
      if (!localTypes.length) {
        results.push({
          pendingId: String(item.id),
          asaasType,
          sent: false,
          reason: "Tipo sem correspondência local — envie manualmente pelo painel Asaas.",
        });
        continue;
      }

      const files: Array<{ blob: Blob; fileName: string }> = [];
      for (const t of localTypes) {
        const local = byType.get(t);
        if (!local) continue;
        const { data: fileBlob, error } = await supabaseAdmin.storage
          .from("dojo-documents")
          .download(local.path);
        if (error || !fileBlob) {
          results.push({
            pendingId: String(item.id),
            asaasType,
            sent: false,
            reason: `Falha ao ler ${t} do storage: ${error?.message ?? "arquivo indisponível"}`,
          });
          files.length = 0;
          break;
        }
        files.push({ blob: fileBlob, fileName: local.name });
      }
      if (!files.length) {
        results.push({
          pendingId: String(item.id),
          asaasType,
          sent: false,
          reason: `Envie primeiro os documentos locais: ${localTypes.join(", ")}`,
        });
        continue;
      }

      try {
        await asaasSendMyDocument(String(item.id), asaasType, files, p.asaas_api_key_encrypted);
        results.push({ pendingId: String(item.id), asaasType, sent: true });
      } catch (err) {
        results.push({
          pendingId: String(item.id),
          asaasType,
          sent: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await context.supabase.from("dojo_account_audit").insert({
      owner_id: context.userId,
      action: "asaas_documents_sent",
      meta: { results },
    });

    return { ok: true as const, results };
  });

/**
 * Envia um arquivo específico (já carregado no bucket `dojo-documents`) para
 * um item pendente do KYC Asaas. Usado para envio individual e para reenvio
 * em caso de REJECTED — o Asaas aceita novos arquivos no mesmo pendingId.
 */
export const uploadAsaasDocumentForPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        pendingId: z.string().trim().min(1).max(120),
        asaasType: z.string().trim().min(1).max(60),
        filePath: z.string().trim().min(3).max(500),
        mimeType: z.string().trim().max(120).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Segurança: só aceita arquivos dentro do prefixo do próprio usuário
    if (!data.filePath.startsWith(`${context.userId}/`)) {
      throw new Error("Caminho de arquivo inválido.");
    }

    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("asaas_subaccount_id, asaas_api_key_encrypted")
      .eq("owner_id", context.userId)
      .maybeSingle();
    const p = profile as
      | { asaas_subaccount_id?: string | null; asaas_api_key_encrypted?: string | null }
      | null;

    if (!p?.asaas_subaccount_id) throw new Error("Subconta Asaas não configurada.");
    if (!p.asaas_api_key_encrypted) {
      throw new Error(
        "A chave privada da subconta não está disponível. Redefina o AMT Pay e refaça a ativação para poder enviar documentos.",
      );
    }

    const { asaasSendMyDocument } = await import("@/lib/asaas/client.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from("dojo-documents")
      .download(data.filePath);
    if (dlErr || !blob) {
      throw new Error(`Falha ao ler o arquivo: ${dlErr?.message ?? "arquivo indisponível"}`);
    }

    const fileName = data.filePath.split("/").pop() || "document.pdf";
    try {
      await asaasSendMyDocument(
        data.pendingId,
        data.asaasType.toUpperCase(),
        [{ blob, fileName }],
        p.asaas_api_key_encrypted,
      );
    } catch (err) {
      throw new Error(
        `O Asaas recusou o envio: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    await context.supabase.from("dojo_account_audit").insert({
      owner_id: context.userId,
      action: "asaas_document_uploaded",
      meta: {
        pending_id: data.pendingId,
        asaas_type: data.asaasType,
        file_path: data.filePath,
      },
    });

    return { ok: true as const };
  });

