/**
 * Onboarding obrigatório do dono do dojo.
 * - Preenche todos os dados necessários para aprovação da subconta Asaas.
 * - Registra documentos enviados.
 * - Marca onboarding_completed no perfil.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DOC_TYPES = [
  "identity_front",
  "identity_back",
  "cnpj_card",
  "address_proof",
  "social_contract",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Retorna o estado atual do onboarding. */
export const getMyOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();

    const { data: docs } = await context.supabase
      .from("dojo_onboarding_documents")
      .select("doc_type, file_path, mime_type, size_bytes, created_at")
      .eq("owner_id", context.userId);

    const p = (profile ?? null) as Record<string, unknown> | null;
    return {
      profile: p ? (JSON.parse(JSON.stringify(p)) as Record<string, string | number | boolean | null>) : null,
      documents: (docs ?? []).map((d) => ({
        doc_type: d.doc_type as DocType,
        file_path: String(d.file_path),
        mime_type: d.mime_type ?? null,
        size_bytes: d.size_bytes ?? null,
        created_at: String(d.created_at),
      })),
      completed: !!(p as { onboarding_completed?: boolean } | null)?.onboarding_completed,
    };
  });

const profileSchema = z.object({
  // Responsável / dados pessoais
  responsibleName: z.string().trim().min(3).max(160),
  email: z.string().trim().email(),
  whatsapp: z.string().trim().min(10).max(20),
  phone: z.string().trim().max(20).optional().nullable(),
  cnpj: z.string().trim().min(11).max(20), // CPF ou CNPJ
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  companyType: z
    .enum(["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"])
    .optional()
    .nullable(),

  // Dados comerciais
  legalName: z.string().trim().min(2).max(200),
  tradeName: z.string().trim().min(2).max(200),
  monthlyIncome: z.number().positive().min(1000, "Faturamento mínimo R$ 1.000"),
  modalities: z.array(z.string().trim().min(1)).min(1).max(20),

  // Endereço
  zip: z.string().trim().min(8).max(10),
  address: z.string().trim().min(3).max(200),
  addressNumber: z.string().trim().min(1).max(20),
  addressComplement: z.string().trim().max(120).optional().nullable(),
  neighborhood: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2),

  // AMT Pay
  pixKey: z.string().trim().min(3).max(200),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]),
  acceptAmtPayTerms: z.literal(true),
});

/** Salva/atualiza o perfil do dojo com dados de onboarding (sem finalizar). */
export const saveOnboardingProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const cnpj = data.cnpj.replace(/\D/g, "");
    const isCpf = cnpj.length === 11;
    const isCnpj = cnpj.length === 14;
    if (!isCpf && !isCnpj) throw new Error("CPF ou CNPJ inválido.");
    if (isCpf && !data.birthDate)
      throw new Error("Data de nascimento é obrigatória para CPF.");
    if (isCnpj && !data.companyType)
      throw new Error("Tipo de empresa é obrigatório para CNPJ.");

    const payload = {
      owner_id: context.userId,
      responsible_name: data.responsibleName,
      email: data.email,
      whatsapp: data.whatsapp.replace(/\D/g, ""),
      phone: data.phone ? data.phone.replace(/\D/g, "") : null,
      cnpj,
      birth_date: isCpf ? data.birthDate : null,
      company_type: isCnpj ? data.companyType : null,
      legal_name: data.legalName,
      trade_name: data.tradeName,
      monthly_income: data.monthlyIncome,
      modalities: data.modalities,
      zip: data.zip.replace(/\D/g, ""),
      address: data.address,
      address_number: data.addressNumber,
      address_complement: data.addressComplement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state.toUpperCase(),
      pix_key: data.pixKey,
      pix_key_type: data.pixKeyType.toLowerCase(),
      accepted_amtpay_terms: true,
      accepted_amtpay_terms_at: new Date().toISOString(),
    };

    const { error } = await context.supabase
      .from("dojo_academy_profile")
      .upsert(payload as never, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

/** Registra (ou substitui) um documento já enviado ao bucket dojo-documents. */
export const recordOnboardingDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        docType: z.enum(DOC_TYPES),
        filePath: z.string().trim().min(3).max(500),
        mimeType: z.string().trim().max(120).optional().nullable(),
        sizeBytes: z.number().int().nonnegative().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Segurança: o filePath precisa começar com o uid do usuário
    if (!data.filePath.startsWith(`${context.userId}/`)) {
      throw new Error("Caminho de arquivo inválido.");
    }
    const { error } = await context.supabase
      .from("dojo_onboarding_documents")
      .upsert(
        {
          owner_id: context.userId,
          doc_type: data.docType,
          file_path: data.filePath,
          mime_type: data.mimeType ?? null,
          size_bytes: data.sizeBytes ?? null,
        },
        { onConflict: "owner_id,doc_type" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Remove um documento enviado. */
export const removeOnboardingDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ docType: z.enum(DOC_TYPES) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("dojo_onboarding_documents")
      .select("file_path")
      .eq("owner_id", context.userId)
      .eq("doc_type", data.docType)
      .maybeSingle();

    if (row?.file_path) {
      await context.supabase.storage.from("dojo-documents").remove([row.file_path]);
    }
    await context.supabase
      .from("dojo_onboarding_documents")
      .delete()
      .eq("owner_id", context.userId)
      .eq("doc_type", data.docType);
    return { ok: true as const };
  });

/** Finaliza o onboarding: valida documentos obrigatórios e marca completed. */
export const finishOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("dojo_academy_profile")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!profile) throw new Error("Preencha os dados do dojo antes de finalizar.");

    const p = profile as Record<string, unknown>;
    const cnpj = String(p.cnpj || "").replace(/\D/g, "");
    const isCpf = cnpj.length === 11;
    const isCnpj = cnpj.length === 14;

    const required: Array<[string, unknown]> = [
      ["Nome do responsável", p.responsible_name],
      ["Razão social / nome", p.legal_name],
      ["Nome fantasia", p.trade_name],
      ["E-mail", p.email],
      ["WhatsApp", p.whatsapp],
      ["CPF/CNPJ", cnpj && (isCpf || isCnpj) ? true : null],
      ["Faturamento mensal", (p.monthly_income as number) > 0 ? true : null],
      ["CEP", p.zip],
      ["Endereço", p.address],
      ["Número", p.address_number],
      ["Bairro", p.neighborhood],
      ["Cidade", p.city],
      ["Estado", p.state],
      ["Chave PIX", p.pix_key],
      ["Aceite dos termos AMT Pay", p.accepted_amtpay_terms],
    ];
    if (isCpf) required.push(["Data de nascimento", p.birth_date]);
    if (isCnpj) required.push(["Tipo de empresa", p.company_type]);

    const missing = required.filter(([, v]) => !v).map(([n]) => n);
    if (missing.length)
      throw new Error(`Complete: ${missing.join(", ")}`);

    // Documentos obrigatórios
    const { data: docs } = await context.supabase
      .from("dojo_onboarding_documents")
      .select("doc_type")
      .eq("owner_id", context.userId);
    const uploaded = new Set((docs ?? []).map((d) => d.doc_type as string));
    // Documentos obrigatórios seguem o enum oficial do Asaas
    // (GET /v3/myAccount/documents). Comprovante de residência NÃO está
    // na lista de tipos exigidos pela API — só aparece se o analista
    // solicitar via CUSTOM, e nesse caso é enviado direto pelo AMT Pay.
    const docRequired: string[] = ["identity_front", "identity_back"];
    if (isCnpj) docRequired.push("cnpj_card");
    const missingDocs = docRequired.filter((d) => !uploaded.has(d));
    if (missingDocs.length) {
      const labels: Record<string, string> = {
        identity_front: "RG/CNH (frente)",
        identity_back: "RG/CNH (verso)",
        address_proof: "Comprovante de endereço",
        cnpj_card: "Cartão CNPJ",
        social_contract: "Contrato social",
      };
      throw new Error(
        `Envie: ${missingDocs.map((d) => labels[d] || d).join(", ")}`,
      );
    }

    const { error: updErr } = await context.supabase
      .from("dojo_academy_profile")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      } as never)
      .eq("owner_id", context.userId);
    if (updErr) throw new Error(updErr.message);

    await context.supabase.from("dojo_account_audit").insert({
      owner_id: context.userId,
      action: "onboarding_completed",
      meta: {},
    });

    return { ok: true as const };
  });
