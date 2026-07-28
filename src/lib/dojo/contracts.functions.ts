import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyAcademyForContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });



const uuid = z.string().uuid();

const templateSchema = z.object({
  id: uuid.optional(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  content: z.string().default(""),
  header_html: z.string().default(""),
  footer_html: z.string().default(""),
  page_size: z.enum(["A4", "Letter"]).default("A4"),
  page_orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  margin_mm: z.number().int().min(5).max(40).default(18),
  show_page_numbers: z.boolean().default(true),
  is_default: z.boolean().optional(),
  category: z
    .enum(["student","affiliate","teacher","employee","partnership","event","competition","lgpd","legal","other"])
    .optional(),
});

export const listContractTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_contract_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getContractTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_contract_templates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const saveContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const q = context.supabase.from("dojo_contract_templates");
    if (data.id) {
      const { data: row, error } = await q.update(payload).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await q.insert(payload).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_contract_templates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const contractSchema = z.object({
  id: uuid.optional(),
  student_id: uuid,
  template_id: uuid.nullable().optional(),
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  status: z.enum(["draft", "active", "signed", "cancelled"]).default("draft"),
  signed_at: z.string().nullable().optional(),
  plan_name: z.string().nullable().optional(),
  monthly_value: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  due_day: z.number().int().min(1).max(31).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export const listStudentContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string }) => z.object({ student_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_student_contracts")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const getStudentContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_student_contracts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return row;
  });

export const saveStudentContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contractSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const q = context.supabase.from("dojo_student_contracts");
    if (data.id) {
      const { data: row, error } = await q.update(payload).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await q.insert(payload).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteStudentContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_student_contracts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// Central de Contratos — extended API
// ============================================================

const CONTRACT_CATEGORIES = [
  "student","affiliate","teacher","employee","partnership","event","competition","lgpd","legal","other",
] as const;

export const CONTRACT_CATEGORY_LABELS: Record<string, string> = {
  student: "Aluno",
  affiliate: "Filial / Afiliado",
  teacher: "Professor",
  employee: "Colaborador",
  partnership: "Parceria",
  event: "Evento",
  competition: "Competição",
  lgpd: "LGPD / Consentimento",
  legal: "Jurídico geral",
  other: "Outros",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  issued: "Emitido",
  sent: "Enviado",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  active: "Ativo",
  refused: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado",
  terminated: "Rescindido",
  completed: "Concluído",
};

/** List templates with filters (categoria/status/busca). Inclui modelos globais (owner_id NULL). */
export const listTemplatesAdvanced = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { category?: string; status?: string; q?: string } | undefined) =>
    z.object({
      category: z.enum(CONTRACT_CATEGORIES).optional(),
      status: z.enum(["active","inactive","review","archived"]).optional(),
      q: z.string().optional(),
    }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_contract_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (data.category) q = q.eq("category", data.category);
    if (data.status) q = q.eq("status", data.status);
    if (data.q && data.q.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/** Duplica um modelo existente (cria como propriedade do usuário). */
export const duplicateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("dojo_contract_templates").select("*").eq("id", data.id).maybeSingle();
    if (e1) throw e1;
    if (!src) throw new Error("Modelo não encontrado");
    const copy = {
      owner_id: context.userId,
      name: `${src.name} (cópia)`,
      description: src.description,
      content: src.content,
      header_html: src.header_html,
      footer_html: src.footer_html,
      page_size: src.page_size,
      page_orientation: src.page_orientation,
      margin_mm: src.margin_mm,
      show_page_numbers: src.show_page_numbers,
      category: (src as any).category ?? "student",
      status: "active",
      current_version: 1,
      variables_schema: (src as any).variables_schema ?? [],
      tags: (src as any).tags ?? [],
      is_default: false,
    };
    const { data: row, error } = await context.supabase
      .from("dojo_contract_templates").insert(copy).select("*").single();
    if (error) throw error;
    return row;
  });

/** Arquiva / reativa modelo. */
export const setTemplateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) =>
    z.object({ id: uuid, status: z.enum(["active","inactive","review","archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_contract_templates")
      .update({ status: data.status })
      .eq("id", data.id).eq("owner_id", context.userId)
      .select("*").single();
    if (error) throw error;
    return row;
  });

/** Gera número sequencial (AAAA-000XXX) via RPC. */
export const nextContractNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("dojo_next_contract_number", { _owner: context.userId });
    if (error) throw error;
    return data as string;
  });

/** Emitir contrato de aluno a partir de um modelo. */
export const generateStudentContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    student_id: string;
    template_id: string;
    resolved_content: string;
    title: string;
    plan_name?: string | null;
    monthly_value?: number | null;
    payment_method?: string | null;
    due_day?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    expires_at?: string | null;
  }) => z.object({
    student_id: uuid, template_id: uuid,
    resolved_content: z.string(), title: z.string().min(1),
    plan_name: z.string().nullable().optional(),
    monthly_value: z.number().nullable().optional(),
    payment_method: z.string().nullable().optional(),
    due_day: z.number().int().min(1).max(31).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: numData, error: numErr } = await context.supabase
      .rpc("dojo_next_contract_number", { _owner: context.userId });
    if (numErr) throw numErr;
    const { data: tpl } = await context.supabase
      .from("dojo_contract_templates").select("*").eq("id", data.template_id).maybeSingle();
    const payload: any = {
      owner_id: context.userId,
      student_id: data.student_id,
      template_id: data.template_id,
      template_version: (tpl as any)?.current_version ?? 1,
      contract_number: numData,
      title: data.title,
      content: data.resolved_content,
      status: "issued",
      issued_by: context.userId,
      plan_name: data.plan_name ?? null,
      monthly_value: data.monthly_value ?? null,
      payment_method: data.payment_method ?? null,
      due_day: data.due_day ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      expires_at: data.expires_at ?? null,
      header_html: tpl?.header_html ?? "",
      footer_html: tpl?.footer_html ?? "",
      page_size: tpl?.page_size ?? "A4",
      page_orientation: tpl?.page_orientation ?? "portrait",
      margin_mm: tpl?.margin_mm ?? 18,
      show_page_numbers: tpl?.show_page_numbers ?? true,
    };
    const { data: row, error } = await context.supabase
      .from("dojo_student_contracts").insert(payload).select("*").single();
    if (error) throw error;
    await context.supabase.from("dojo_contract_events").insert({
      owner_id: context.userId, contract_kind: "student", contract_id: row.id,
      event_type: "created", actor_id: context.userId,
      payload: { contract_number: numData, template_id: data.template_id },
    });
    try {
      const { safeNotifyStudent } = await import("@/lib/push/push.server");
      safeNotifyStudent(data.student_id, {
        title: "Novo contrato disponível 📄",
        body: `${data.title} — toque para revisar e assinar.`,
        url: "/app/contratos",
        tag: `contract-${row.id}`,
      }, "contract");
    } catch {}
    return row;
  });

/** Atualiza status de um contrato + registra evento. */
export const updateContractStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; kind: "student"|"affiliate"|"team"; status: string; note?: string }) =>
    z.object({
      id: uuid,
      kind: z.enum(["student","affiliate","team"]),
      status: z.string().min(1),
      note: z.string().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const table =
      data.kind === "student" ? "dojo_student_contracts"
      : data.kind === "team" ? "dojo_team_contracts"
      : "dojo_affiliate_contracts";
    const statusCol = data.kind === "affiliate" ? "signature_status" : "status";
    const patch: any = { [statusCol]: data.status };
    const now = new Date().toISOString();
    if (data.status === "signed") patch.signed_at = now;
    if (data.status === "sent") patch.sent_at = now;
    if (data.status === "cancelled") patch.cancelled_at = now;
    const { data: row, error } = await context.supabase
      .from(table).update(patch).eq("id", data.id).eq("owner_id", context.userId).select("*").single();
    if (error) throw error;
    await context.supabase.from("dojo_contract_events").insert({
      owner_id: context.userId, contract_kind: data.kind, contract_id: data.id,
      event_type: `status_${data.status}`, actor_id: context.userId,
      note: data.note ?? null, payload: { status: data.status },
    });
    return row;
  });

/** Timeline de um contrato. */
export const listContractEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "student"|"affiliate"|"team"; contract_id: string }) =>
    z.object({ kind: z.enum(["student","affiliate","team"]), contract_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_contract_events")
      .select("*")
      .eq("contract_kind", data.kind)
      .eq("contract_id", data.contract_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

/** Lista global de contratos emitidos (aluno + filial) + busca. */
export const listIssuedContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind?: "student"|"affiliate"|"team"|"all"; status?: string; q?: string } | undefined) =>
    z.object({
      kind: z.enum(["student","affiliate","team","all"]).optional().default("all"),
      status: z.string().optional(),
      q: z.string().optional(),
    }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const results: any[] = [];
    const wantAll = !data.kind || data.kind === "all";
    if (data.kind === "student" || wantAll) {
      let q = context.supabase.from("dojo_student_contracts")
        .select("id,title,contract_number,status,student_id,created_at,signed_at,monthly_value,dojo_students(full_name,photo_url)")
        .eq("owner_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (data.status) q = q.eq("status", data.status);
      if (data.q && data.q.trim()) q = q.or(`title.ilike.%${data.q}%,contract_number.ilike.%${data.q}%`);
      const { data: rows } = await q;
      (rows ?? []).forEach((r: any) => results.push({
        kind: "student", id: r.id, title: r.title, number: r.contract_number,
        status: r.status, target: r.dojo_students?.full_name, target_photo: r.dojo_students?.photo_url,
        target_id: r.student_id, created_at: r.created_at, signed_at: r.signed_at, value: r.monthly_value,
      }));
    }
    if (data.kind === "affiliate" || wantAll) {
      let q = context.supabase.from("dojo_affiliate_contracts")
        .select("id,title,contract_number,signature_status,affiliate_id,created_at,signed_at,dojo_affiliates(trade_name,legal_name)")
        .eq("owner_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (data.status) q = q.eq("signature_status", data.status);
      if (data.q && data.q.trim()) q = q.or(`title.ilike.%${data.q}%,contract_number.ilike.%${data.q}%`);
      const { data: rows } = await q;
      (rows ?? []).forEach((r: any) => results.push({
        kind: "affiliate", id: r.id, title: r.title, number: r.contract_number,
        status: r.signature_status, target: r.dojo_affiliates?.trade_name ?? r.dojo_affiliates?.legal_name,
        target_id: r.affiliate_id, created_at: r.created_at, signed_at: r.signed_at, value: null,
      }));
    }
    if (data.kind === "team" || wantAll) {
      let q = context.supabase.from("dojo_team_contracts")
        .select("id,title,contract_number,status,team_member_id,created_at,signed_at,compensation_value,dojo_team_members(full_name,photo_url,role)")
        .eq("owner_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (data.status) q = q.eq("status", data.status);
      if (data.q && data.q.trim()) q = q.or(`title.ilike.%${data.q}%,contract_number.ilike.%${data.q}%`);
      const { data: rows } = await q;
      (rows ?? []).forEach((r: any) => results.push({
        kind: "team", id: r.id, title: r.title, number: r.contract_number,
        status: r.status, target: r.dojo_team_members?.full_name, target_photo: r.dojo_team_members?.photo_url,
        target_id: r.team_member_id, created_at: r.created_at, signed_at: r.signed_at, value: r.compensation_value,
      }));
    }
    results.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return results;
  });

/** KPIs para o dashboard jurídico. */
export const contractsDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: templates }, { data: students }, { data: affiliates }, { data: monthly }] = await Promise.all([
      context.supabase.from("dojo_contract_templates").select("id,status,category").or(`owner_id.eq.${context.userId},owner_id.is.null`),
      context.supabase.from("dojo_student_contracts").select("id,status,created_at,expires_at,monthly_value").eq("owner_id", context.userId),
      context.supabase.from("dojo_affiliate_contracts").select("id,signature_status,created_at,expires_at").eq("owner_id", context.userId),
      context.supabase.from("dojo_student_contracts").select("created_at").eq("owner_id", context.userId).gte("created_at", new Date(Date.now() - 1000*60*60*24*180).toISOString()),
    ]);

    const now = Date.now();
    const in30 = now + 1000*60*60*24*30;
    const cs = students ?? [];
    const af = affiliates ?? [];

    const byStatus = (arr: any[], statusKey: string) => arr.reduce((acc: Record<string, number>, r: any) => {
      const s = r[statusKey] ?? "draft"; acc[s] = (acc[s] ?? 0) + 1; return acc;
    }, {});
    const csByStatus = byStatus(cs, "status");
    const afByStatus = byStatus(af, "signature_status");

    const expiring = [...cs, ...af].filter((r: any) => {
      if (!r.expires_at) return false;
      const t = new Date(r.expires_at).getTime();
      return t > now && t < in30;
    }).length;

    const expired = [...cs, ...af].filter((r: any) => r.expires_at && new Date(r.expires_at).getTime() < now).length;

    // Series por mês (últimos 6)
    const monthly6 = new Array(6).fill(0).map((_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); d.setDate(1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const count = (monthly ?? []).filter((r: any) => (r.created_at ?? "").startsWith(key)).length;
      return { month: d.toLocaleDateString("pt-BR", { month: "short" }), count };
    });

    const byCategory = (templates ?? []).reduce((acc: Record<string, number>, t: any) => {
      const c = t.category ?? "student"; acc[c] = (acc[c] ?? 0) + 1; return acc;
    }, {});

    return {
      templates: { total: (templates ?? []).length, active: (templates ?? []).filter((t: any) => t.status === "active").length, byCategory },
      issued: { total: cs.length + af.length, students: csByStatus, affiliates: afByStatus },
      alerts: { expiring, expired },
      monthly: monthly6,
    };
  });

/** Detalhe de contrato emitido (student, affiliate ou team) + academia. */
export const getIssuedContract = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "student"|"affiliate"|"team"; id: string }) =>
    z.object({ kind: z.enum(["student","affiliate","team"]), id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.kind === "student") {
      const { data: row, error } = await context.supabase
        .from("dojo_student_contracts")
        .select("*, dojo_students(id,full_name,photo_url,email,phone,cpf,rg)")
        .eq("id", data.id).eq("owner_id", context.userId).maybeSingle();
      if (error) throw error;
      return { kind: "student", contract: row };
    } else if (data.kind === "team") {
      const { data: row, error } = await context.supabase
        .from("dojo_team_contracts")
        .select("*, dojo_team_members(id,full_name,photo_url,email,phone,cpf,role)")
        .eq("id", data.id).eq("owner_id", context.userId).maybeSingle();
      if (error) throw error;
      return { kind: "team", contract: row };
    } else {
      const { data: row, error } = await context.supabase
        .from("dojo_affiliate_contracts")
        .select("*, dojo_affiliates(id,trade_name,legal_name,logo_url,cnpj,city,state)")
        .eq("id", data.id).eq("owner_id", context.userId).maybeSingle();
      if (error) throw error;
      return { kind: "affiliate", contract: row };
    }
  });

// ============================================================
// Team contracts — CRUD
// ============================================================

const teamContractSchema = z.object({
  id: uuid.optional(),
  team_member_id: uuid,
  template_id: uuid.nullable().optional(),
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  status: z.enum(["draft","issued","sent","pending_signature","signed","active","refused","cancelled","expired","terminated","completed"]).default("draft"),
  signed_at: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  compensation_type: z.string().nullable().optional(),
  compensation_value: z.number().nullable().optional(),
  weekly_hours: z.number().int().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export const listTeamContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { team_member_id: string }) => z.object({ team_member_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_team_contracts")
      .select("*")
      .eq("team_member_id", data.team_member_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const saveTeamContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => teamContractSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const q = context.supabase.from("dojo_team_contracts");
    if (data.id) {
      const { data: row, error } = await q.update(payload).eq("id", data.id).select("*").single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await q.insert(payload).select("*").single();
    if (error) throw error;
    return row;
  });

export const deleteTeamContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_contracts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });


