/**
 * Fluxo público de auto-matrícula.
 *
 * Uma página aberta em /matricula/<slug> permite que qualquer pessoa se
 * cadastre e escolha um plano. Ao finalizar, gera-se uma fatura local
 * pendente e o aluno é redirecionado para `/pay/<invoiceId>` — a página
 * de pagamento pública do dojo (PIX, boleto, cartão ou cobrança nativa
 * conforme configurado em Planos).
 *
 * As fns aqui usam supabaseAdmin: a página é pública e o aluno não tem
 * sessão. A ownership do dojo é resolvida via `slug` na tabela
 * `dojo_academy_profile`, e todos os inserts carregam `owner_id`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/, "slug inválido");

const uuid = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  "UUID inválido",
);

export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  enrollment_fee: number | null;
  frequency: string | null;
  custom_months: number | null;
  payment_methods: Array<{ code: string; enabled?: boolean; gateway?: string }> | null;
};

export type PublicUnit = { id: string; name: string };
export type PublicBelt = {
  id: string;
  name: string;
  modality: string | null;
  max_degrees: number | null;
  sort_order: number | null;
};

export type PublicEnrollmentBundle = {
  academy: {
    slug: string;
    trade_name: string | null;
    legal_name: string | null;
    logo_url: string | null;
    brand_primary: string | null;
    brand_secondary: string | null;
    city: string | null;
    state: string | null;
  };
  plans: PublicPlan[];
  units: PublicUnit[];
  belts: PublicBelt[];
};


export const getPublicEnrollmentBundle = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: slugSchema }).parse(i))
  .handler(async ({ data }): Promise<PublicEnrollmentBundle> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: academy, error: acErr } = await supabaseAdmin
      .from("dojo_academy_profile")
      .select(
        "owner_id, slug, trade_name, legal_name, logo_url, brand_primary, brand_secondary, city, state",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (acErr) throw new Error(acErr.message);
    if (!academy) throw new Error("Dojo não encontrado");

    const ownerId = (academy as any).owner_id as string;

    const { data: plans, error: plansErr } = await supabaseAdmin
      .from("dojo_plans")
      .select(
        "id, name, description, amount, enrollment_fee, frequency, custom_months, payment_methods, active, sort_order",
      )
      .eq("owner_id", ownerId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (plansErr) throw new Error(plansErr.message);

    const { data: units } = await supabaseAdmin
      .from("dojo_units")
      .select("id, name")
      .eq("owner_id", ownerId)
      .order("name", { ascending: true });

    const { data: belts } = await supabaseAdmin
      .from("dojo_belts")
      .select("id, name, modality, max_degrees, sort_order")
      .eq("owner_id", ownerId)
      .order("sort_order", { ascending: true });

    return {
      academy: {
        slug: (academy as any).slug,
        trade_name: (academy as any).trade_name,
        legal_name: (academy as any).legal_name,
        logo_url: (academy as any).logo_url,
        brand_primary: (academy as any).brand_primary,
        brand_secondary: (academy as any).brand_secondary,
        city: (academy as any).city,
        state: (academy as any).state,
      },
      plans: (plans ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        amount: Number(p.amount ?? 0),
        enrollment_fee: p.enrollment_fee != null ? Number(p.enrollment_fee) : null,
        frequency: p.frequency,
        custom_months: p.custom_months,
        payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods : null,
      })),
      units: (units ?? []).map((u: any) => ({ id: u.id, name: u.name })),
      belts: (belts ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        modality: b.modality ?? null,
        max_degrees: b.max_degrees != null ? Number(b.max_degrees) : null,
        sort_order: b.sort_order != null ? Number(b.sort_order) : null,
      })),
    };

  });

const enrollInput = z.object({
  slug: slugSchema,
  plan_id: uuid,
  payment_method: z.string().min(1).max(40).default("manual"),
  include_enrollment_fee: z.boolean().optional(),
  // Dados do aluno
  full_name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  rg: z.string().trim().max(30).optional().or(z.literal("")),
  birth_date: z.string().max(20).optional().or(z.literal("")),
  gender: z.string().max(30).optional().or(z.literal("")),
  nationality: z.string().max(60).optional().or(z.literal("")),
  marital_status: z.string().max(40).optional().or(z.literal("")),
  profession: z.string().max(120).optional().or(z.literal("")),
  blood_type: z.string().max(5).optional().or(z.literal("")),
  health_insurance: z.string().max(120).optional().or(z.literal("")),
  // Endereço
  zip: z.string().max(20).optional().or(z.literal("")),
  street: z.string().max(200).optional().or(z.literal("")),
  address_number: z.string().max(20).optional().or(z.literal("")),
  address_complement: z.string().max(120).optional().or(z.literal("")),
  neighborhood: z.string().max(120).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  state: z.string().max(2).optional().or(z.literal("")),
  // Contatos de emergência / responsável
  guardian_name: z.string().max(200).optional().or(z.literal("")),
  guardian_phone: z.string().max(40).optional().or(z.literal("")),
  emergency_contact_name: z.string().max(200).optional().or(z.literal("")),
  emergency_contact_phone: z.string().max(40).optional().or(z.literal("")),
  emergency_contact_relationship: z.string().max(60).optional().or(z.literal("")),
  // Dojo (unidade e modalidades/faixas)
  unit_id: uuid.optional().nullable(),
  modalities: z
    .array(
      z.object({
        modality: z.string().max(60),
        belt_id: uuid,
        degree: z.number().int().min(0).max(20).optional(),
      }),
    )
    .max(6)
    .optional(),
  // Anamnese e saúde
  anamnesis: z.record(z.string(), z.any()).optional(),
  has_medical_clearance: z.boolean().optional(),
  medical_clearance_date: z.string().max(20).optional().or(z.literal("")),
  // Foto
  photo_url: z.string().max(600).optional().or(z.literal("")),
  // Consentimentos (obrigatórios para prosseguir)
  lgpd_consent: z.boolean(),
  terms_accepted: z.boolean(),
  image_rights_consent: z.boolean().optional(),
  facial_recognition_consent: z.boolean().optional(),
});


export const publicEnrollStudent = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => enrollInput.parse(i))
  .handler(async ({ data }) => {
    if (!data.lgpd_consent || !data.terms_accepted) {
      throw new Error("É necessário aceitar os termos e o consentimento LGPD.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Resolve o dojo pelo slug
    const { data: academy, error: acErr } = await supabaseAdmin
      .from("dojo_academy_profile")
      .select("owner_id, trade_name")
      .eq("slug", data.slug)
      .maybeSingle();
    if (acErr) throw new Error(acErr.message);
    if (!academy) throw new Error("Dojo não encontrado");
    const ownerId = (academy as any).owner_id as string;

    // 2) Valida o plano (deve pertencer ao mesmo dono e estar ativo)
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("dojo_plans")
      .select("id, name, amount, enrollment_fee, frequency, payment_methods, active, owner_id")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (planErr) throw new Error(planErr.message);
    if (!plan || (plan as any).owner_id !== ownerId || (plan as any).active === false) {
      throw new Error("Plano indisponível");
    }

    // Valida o método contra o plano
    const enabledMethods = Array.isArray((plan as any).payment_methods)
      ? ((plan as any).payment_methods as any[])
          .filter((m) => m && (m.enabled === true || m.enabled === undefined))
          .map((m) => String(m.code))
      : [];
    let methodCode = data.payment_method;
    if (enabledMethods.length > 0 && !enabledMethods.includes(methodCode)) {
      // fallback silencioso para o primeiro habilitado
      methodCode = enabledMethods[0];
    }

    const now = new Date().toISOString();

    // 3) Cria o aluno
    const studentPayload: any = {
      owner_id: ownerId,
      full_name: data.full_name.trim(),
      email: data.email ? data.email.trim() : null,
      phone: data.phone || null,
      cpf: data.cpf || null,
      rg: data.rg || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      zip: data.zip || null,
      street: data.street || null,
      address_number: data.address_number || null,
      address_complement: data.address_complement || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      guardian_name: data.guardian_name || null,
      guardian_phone: data.guardian_phone || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      status: "active",
      lgpd_consent: true,
      lgpd_consent_date: now,
      terms_accepted: true,
      terms_accepted_date: now,
      image_rights_consent: data.image_rights_consent ?? false,
    };
    const { data: studentRow, error: sErr } = await supabaseAdmin
      .from("dojo_students")
      .insert(studentPayload)
      .select("id, full_name, unit_id, email, cpf, phone")
      .single();
    if (sErr) throw new Error(sErr.message);

    // 4) Cria a matrícula
    const today = new Date();
    const dueDay = Math.min(28, Math.max(1, today.getDate()));
    const startDate = today.toISOString().slice(0, 10);

    const { data: enrRow, error: enrErr } = await supabaseAdmin
      .from("dojo_enrollments")
      .insert({
        student_id: studentRow.id,
        plan_id: (plan as any).id,
        due_day: dueDay,
        start_date: startDate,
        status: "active",
        payment_method_code: methodCode,
        owner_id: ownerId,
      } as any)
      .select("id")
      .single();
    if (enrErr) throw new Error(enrErr.message);

    // 5) Cria a primeira fatura local (fluxo manual — a página /pay lida com
    // gateway/nativa conforme a configuração do dojo).
    const baseAmount = Number((plan as any).amount ?? 0);
    const fee = data.include_enrollment_fee ? Number((plan as any).enrollment_fee ?? 0) : 0;
    const amount = baseAmount + fee;
    const description = fee > 0
      ? `Matrícula + 1ª mensalidade — ${(plan as any).name}`
      : `1ª mensalidade — ${(plan as any).name}`;

    const invoicePayload: any = {
      id: crypto.randomUUID(),
      student_id: studentRow.id,
      enrollment_id: enrRow.id,
      unit_id: (studentRow as any).unit_id ?? null,
      description,
      amount,
      due_date: startDate,
      status: "pending",
      owner_id: ownerId,
    };

    // Se o AMT Pay estiver ativo no dojo, tenta sincronizar com o gateway
    // (gera link/QR). Se falhar ou estiver em modo central, apenas grava
    // a fatura local — a página /pay/<id> cuida do resto.
    try {
      const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
      const enriched = await syncInvoiceWithAsaas(supabaseAdmin as any, invoicePayload);
      Object.assign(invoicePayload, enriched);
    } catch (e) {
      console.warn("[public-enroll] syncInvoiceWithAsaas falhou, seguindo local:", e);
    }

    const { data: invRow, error: invErr } = await supabaseAdmin
      .from("dojo_invoices")
      .insert(invoicePayload)
      .select("id")
      .single();
    if (invErr) throw new Error(invErr.message);

    // 6) Notifica o dono do dojo
    try {
      const { sendPushToDojoOwner } = await import("@/lib/push/dojo-owner-push.server");
      void sendPushToDojoOwner(ownerId, "enrollments", {
        title: "Nova matrícula (auto-atendimento)",
        body: `${studentRow.full_name ?? "Novo aluno"} concluiu a matrícula em ${(plan as any).name}`,
        url: `/dojo/app/students/${studentRow.id}`,
        tag: `dojo-public-enroll-${studentRow.id}`,
      }).catch(() => {});
    } catch {}

    return {
      student_id: studentRow.id,
      enrollment_id: enrRow.id,
      invoice_id: invRow.id,
      amount,
    };
  });
