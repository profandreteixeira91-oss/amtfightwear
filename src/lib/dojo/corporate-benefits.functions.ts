// Corporate Benefits Service — camada única de acesso a Gympass/TotalPass.
// Nenhum outro módulo deve consultar diretamente estas plataformas: sempre
// pelas funções abaixo. Toda a autenticação/credenciais fica opaca ao usuário.
//
// Multi-tenant: cada função escopa por owner_id via requireSupabaseAuth.
// O check-in importa validateCorporateBenefit() daqui — nunca ao contrário.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Tipos exportados ----------
export type CorporateProvider = "gympass" | "totalpass";
export const CORPORATE_PROVIDERS: CorporateProvider[] = ["gympass", "totalpass"];

export const providerLabel: Record<CorporateProvider, string> = {
  gympass: "Gympass / Wellhub",
  totalpass: "TotalPass",
};

const providerSchema = z.enum(["gympass", "totalpass"]);

// ---------- Helpers ----------
async function pushHistory(
  ctx: { supabase: any; userId: string },
  provider: CorporateProvider | string,
  event: string,
  details: Record<string, unknown> = {},
) {
  await ctx.supabase.from("dojo_corporate_history").insert({
    owner_id: ctx.userId,
    provider,
    event,
    details,
  });
}

async function pushSyncLog(
  ctx: { supabase: any; userId: string },
  provider: CorporateProvider,
  payload: {
    kind: string;
    status: "success" | "error" | "partial";
    message?: string;
    items_processed?: number;
    items_updated?: number;
    items_failed?: number;
    finished_at?: string;
    extra?: Record<string, unknown>;
  },
) {
  await ctx.supabase.from("dojo_corporate_sync_logs").insert({
    owner_id: ctx.userId,
    provider,
    kind: payload.kind,
    status: payload.status,
    message: payload.message ?? null,
    items_processed: payload.items_processed ?? 0,
    items_updated: payload.items_updated ?? 0,
    items_failed: payload.items_failed ?? 0,
    payload: payload.extra ?? {},
    finished_at: payload.finished_at ?? new Date().toISOString(),
  });
}

// ---------- Catálogo de plataformas ----------
export const listCorporateCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return [
    {
      id: "gympass" as const,
      name: "Gympass",
      subtitle: "Wellhub",
      description:
        "Permita que alunos com plano Gympass/Wellhub façam check-in usando o app oficial.",
      status: "available" as const,
      accent: "from-orange-500 to-red-500",
    },
    {
      id: "totalpass" as const,
      name: "TotalPass",
      subtitle: "Benefícios corporativos",
      description: "Aceite alunos com plano TotalPass e sincronize elegibilidade em tempo real.",
      status: "available" as const,
      accent: "from-blue-600 to-indigo-500",
    },
    {
      id: "wellhub-soon" as const,
      name: "Wellhub Pro",
      subtitle: "Em breve",
      description: "Suporte a Wellhub Pro para academias empresariais está a caminho.",
      status: "soon" as const,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      id: "other-soon" as const,
      name: "Outras plataformas",
      subtitle: "Em breve",
      description: "Sodexo, VR Gym e outras plataformas corporativas em breve.",
      status: "soon" as const,
      accent: "from-slate-500 to-slate-700",
    },
  ];
});

// ---------- Overview / Dashboard ----------
export const getCorporateOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: integrations } = await context.supabase
      .from("dojo_corporate_integrations")
      .select("*")
      .eq("owner_id", context.userId)
      .order("provider");

    const { data: benef } = await context.supabase
      .from("dojo_corporate_beneficiaries")
      .select("provider, status")
      .eq("owner_id", context.userId);

    const counts = { gympass: 0, totalpass: 0, active: 0, expired: 0, pending: 0 };
    for (const b of (benef ?? []) as any[]) {
      if (b.provider === "gympass") counts.gympass += 1;
      if (b.provider === "totalpass") counts.totalpass += 1;
      if (b.status === "active") counts.active += 1;
      if (b.status === "expired") counts.expired += 1;
      if (b.status === "pending") counts.pending += 1;
    }

    // Check-ins vindos das plataformas hoje / no mês (via tabela existente)
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: checkinsToday }, { count: checkinsMonth }] = await Promise.all([
      context.supabase
        .from("dojo_partner_checkins")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", context.userId)
        .in("provider", ["gympass", "totalpass"])
        .gte("created_at", startOfDay.toISOString()),
      context.supabase
        .from("dojo_partner_checkins")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", context.userId)
        .in("provider", ["gympass", "totalpass"])
        .gte("created_at", startOfMonth.toISOString()),
    ]);

    const { data: lastLog } = await context.supabase
      .from("dojo_corporate_sync_logs")
      .select("started_at, provider, status")
      .eq("owner_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      integrations: (integrations ?? []) as any[],
      counts,
      checkinsToday: checkinsToday ?? 0,
      checkinsMonth: checkinsMonth ?? 0,
      lastSyncAt: lastLog?.started_at ?? null,
      lastSyncProvider: lastLog?.provider ?? null,
      lastSyncStatus: lastLog?.status ?? null,
    };
  });

// ---------- Integrações ----------
export const listCorporateIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_corporate_integrations")
      .select("*")
      .eq("owner_id", context.userId)
      .order("provider");
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

// Etapa 1 do wizard — snapshot editável da academia
export const startCorporateConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: providerSchema,
      academySnapshot: z.object({
        name: z.string().min(2),
        cnpj: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
      }),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: existing } = await context.supabase
      .from("dojo_corporate_integrations")
      .select("id")
      .eq("owner_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();

    let id = (existing as any)?.id as string | undefined;

    if (id) {
      await context.supabase
        .from("dojo_corporate_integrations")
        .update({
          status: "pending",
          academy_snapshot: data.academySnapshot,
          updated_at: now,
        })
        .eq("id", id);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("dojo_corporate_integrations")
        .insert({
          owner_id: context.userId,
          provider: data.provider,
          status: "pending",
          academy_snapshot: data.academySnapshot,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = (inserted as any).id;
    }

    await pushHistory(context, data.provider, "wizard_started", {
      snapshot: data.academySnapshot,
    });

    return { id, status: "pending" as const };
  });

// Etapa 2 — finaliza a conexão (arquitetura pronta para OAuth futuro).
// Não pedimos API Key/Token/Webhook ao usuário: a "autorização" é registrada e
// a integração fica ativa. Quando OAuth real for plugado, este handler troca
// o auth_state pelo token retornado pelo provedor.
export const completeCorporateConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: providerSchema,
      // Handle interno opcional (código de academia na plataforma). Nunca API key.
      gymCode: z.string().max(60).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: updated, error } = await context.supabase
      .from("dojo_corporate_integrations")
      .update({
        status: "connected",
        gym_code: data.gymCode ?? null,
        connected_at: now,
        disconnected_at: null,
        auth_state: { grantedAt: now, method: "internal-broker-v1" },
        last_sync_status: null,
        last_sync_message: null,
      })
      .eq("owner_id", context.userId)
      .eq("provider", data.provider)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await pushHistory(context, data.provider, "connected", { gymCode: data.gymCode ?? null });
    return { id: (updated as any).id, status: "connected" as const };
  });

export const disconnectCorporateIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ provider: providerSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("dojo_corporate_integrations")
      .update({ status: "disconnected", disconnected_at: now, auth_state: {} })
      .eq("owner_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    await pushHistory(context, data.provider, "disconnected", {});
    return { ok: true };
  });

// ---------- Beneficiários ----------
export const listMyCorporateBeneficiaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: providerSchema.optional(),
      studentId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_corporate_beneficiaries")
      .select(
        "id, student_id, provider, beneficiary_code, status, plan_name, plan_info, eligible, last_sync_at, last_check_at, last_check_result, updated_at, dojo_students!inner(id, full_name, email, cpf)",
      )
      .eq("owner_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (data.provider) q = q.eq("provider", data.provider);
    if (data.studentId) q = q.eq("student_id", data.studentId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const getStudentCorporateBenefits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ studentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_corporate_beneficiaries")
      .select("*")
      .eq("owner_id", context.userId)
      .eq("student_id", data.studentId)
      .order("provider");
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const upsertStudentCorporateBenefit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      studentId: z.string().uuid(),
      provider: providerSchema,
      enabled: z.boolean(),
      beneficiaryCode: z.string().max(80).optional().nullable(),
      status: z.enum(["active", "inactive", "pending", "blocked", "expired"]).optional(),
      planName: z.string().max(120).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Confirma que o aluno pertence ao dono (RLS já garante, mas confirmamos).
    const { data: student } = await context.supabase
      .from("dojo_students")
      .select("id")
      .eq("id", data.studentId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!student) throw new Error("Aluno não encontrado.");

    if (!data.enabled) {
      await context.supabase
        .from("dojo_corporate_beneficiaries")
        .delete()
        .eq("owner_id", context.userId)
        .eq("student_id", data.studentId)
        .eq("provider", data.provider);
      await pushHistory(context, data.provider, "beneficiary_removed", { studentId: data.studentId });
      return { ok: true };
    }

    const now = new Date().toISOString();
    const payload = {
      owner_id: context.userId,
      student_id: data.studentId,
      provider: data.provider,
      beneficiary_code: data.beneficiaryCode ?? null,
      status: data.status ?? "pending",
      plan_name: data.planName ?? null,
      eligible: (data.status ?? "pending") === "active",
      last_sync_at: now,
    };

    const { data: existing } = await context.supabase
      .from("dojo_corporate_beneficiaries")
      .select("id")
      .eq("owner_id", context.userId)
      .eq("student_id", data.studentId)
      .eq("provider", data.provider)
      .maybeSingle();

    if (existing) {
      await context.supabase
        .from("dojo_corporate_beneficiaries")
        .update(payload)
        .eq("id", (existing as any).id);
    } else {
      await context.supabase.from("dojo_corporate_beneficiaries").insert(payload);
    }
    await pushHistory(context, data.provider, "beneficiary_upserted", {
      studentId: data.studentId,
      status: payload.status,
    });
    return { ok: true };
  });

// ---------- Sincronização ----------
// Placeholder de sincronização: real handshake com Gympass/TotalPass será plugado
// aqui quando as credenciais OAuth estiverem disponíveis. Por ora, "toca" os
// beneficiários existentes atualizando last_sync_at e registra log/histórico.
export const syncCorporateProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ provider: providerSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: integ } = await context.supabase
      .from("dojo_corporate_integrations")
      .select("id, status")
      .eq("owner_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();

    if (!integ || (integ as any).status !== "connected") {
      await pushSyncLog(context, data.provider, {
        kind: "manual_sync",
        status: "error",
        message: "Integração não está conectada.",
      });
      throw new Error("Integração não está conectada.");
    }

    const startedAt = new Date().toISOString();
    // Real: chamar provedor. V1: refresca last_sync_at dos beneficiários.
    const { data: benef, error: benefErr } = await context.supabase
      .from("dojo_corporate_beneficiaries")
      .select("id")
      .eq("owner_id", context.userId)
      .eq("provider", data.provider);
    if (benefErr) throw new Error(benefErr.message);

    const ids = ((benef ?? []) as any[]).map((r) => r.id);
    if (ids.length) {
      await context.supabase
        .from("dojo_corporate_beneficiaries")
        .update({ last_sync_at: startedAt })
        .in("id", ids);
    }

    const finishedAt = new Date().toISOString();
    await context.supabase
      .from("dojo_corporate_integrations")
      .update({
        last_sync_at: finishedAt,
        last_sync_status: "success",
        last_sync_message: `Sincronizados ${ids.length} beneficiários.`,
      })
      .eq("id", (integ as any).id);

    await pushSyncLog(context, data.provider, {
      kind: "manual_sync",
      status: "success",
      message: `Sincronizados ${ids.length} beneficiários.`,
      items_processed: ids.length,
      items_updated: ids.length,
      finished_at: finishedAt,
      extra: { startedAt },
    });
    await pushHistory(context, data.provider, "sync_completed", { count: ids.length });

    return { ok: true, count: ids.length, finishedAt };
  });

export const syncCorporateBeneficiary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      studentId: z.string().uuid(),
      provider: providerSchema,
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: existing } = await context.supabase
      .from("dojo_corporate_beneficiaries")
      .select("id, status")
      .eq("owner_id", context.userId)
      .eq("student_id", data.studentId)
      .eq("provider", data.provider)
      .maybeSingle();
    if (!existing) throw new Error("Beneficiário não encontrado.");

    await context.supabase
      .from("dojo_corporate_beneficiaries")
      .update({ last_sync_at: now })
      .eq("id", (existing as any).id);

    await pushHistory(context, data.provider, "beneficiary_synced", {
      studentId: data.studentId,
    });
    return { ok: true, syncedAt: now };
  });

// ---------- Histórico / Logs ----------
export const listCorporateHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: providerSchema.optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_corporate_history")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.provider) q = q.eq("provider", data.provider);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const listCorporateSyncLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: providerSchema.optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_corporate_sync_logs")
      .select("*")
      .eq("owner_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (data.provider) q = q.eq("provider", data.provider);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

// ---------- Validação para Check-in ----------
// Fonte única de decisão sobre elegibilidade corporativa. O módulo Check-in
// chama esta função e recebe autorizado/negado + motivo. Nenhum outro caminho
// pode validar entrada por benefício corporativo — este é o contrato.
export const validateCorporateBenefit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      studentId: z.string().uuid(),
      provider: providerSchema,
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: integ } = await context.supabase
      .from("dojo_corporate_integrations")
      .select("status")
      .eq("owner_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();

    if (!integ || (integ as any).status !== "connected") {
      return {
        authorized: false,
        reason: "integration_not_connected" as const,
        message: `Integração ${providerLabel[data.provider]} não está conectada.`,
      };
    }

    const { data: benef } = await context.supabase
      .from("dojo_corporate_beneficiaries")
      .select("id, status, eligible, plan_name")
      .eq("owner_id", context.userId)
      .eq("student_id", data.studentId)
      .eq("provider", data.provider)
      .maybeSingle();

    if (!benef) {
      return {
        authorized: false,
        reason: "not_a_beneficiary" as const,
        message: "Aluno não é beneficiário desta plataforma.",
      };
    }

    const b = benef as any;
    const authorized = b.eligible === true && b.status === "active";

    // Registra last_check_at
    await context.supabase
      .from("dojo_corporate_beneficiaries")
      .update({
        last_check_at: now,
        last_check_result: authorized ? "authorized" : "denied",
      })
      .eq("id", b.id);

    if (!authorized) {
      return {
        authorized: false,
        reason: (b.status === "expired"
          ? "benefit_expired"
          : b.status === "blocked"
            ? "benefit_blocked"
            : b.status === "pending"
              ? "benefit_pending"
              : "not_eligible") as
          | "benefit_expired"
          | "benefit_blocked"
          | "benefit_pending"
          | "not_eligible",
        message: `Benefício ${providerLabel[data.provider]} não elegível para check-in.`,
        planName: b.plan_name ?? null,
      };
    }

    return {
      authorized: true as const,
      reason: null,
      message: "Autorizado",
      planName: b.plan_name ?? null,
    };
  });
