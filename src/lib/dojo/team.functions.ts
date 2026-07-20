import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// ============ MEMBERS ============

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_team_members")
      .select("*")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTeamMember = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: member, error } = await context.supabase
      .from("dojo_team_members").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);

    const [payroll, signature] = await Promise.all([
      context.supabase.from("dojo_team_payroll_config").select("*").eq("member_id", data.id).maybeSingle(),
      context.supabase.from("dojo_team_signatures").select("*").eq("member_id", data.id).maybeSingle(),
    ]);

    return {
      member,
      payroll: payroll.data,
      signature: signature.data,
    };
  });

const memberSchema = z.object({
  id: uuid.optional(),
  full_name: z.string().min(1).max(200),
  photo_url: z.string().url().nullable().optional(),
  cpf: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  marital_status: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address_street: z.string().nullable().optional(),
  address_number: z.string().nullable().optional(),
  address_complement: z.string().nullable().optional(),
  address_neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  role: z.enum(["teacher", "instructor", "assistant", "receptionist", "finance", "admin", "manager", "other"]).optional(),
  admission_date: z.string().nullable().optional(),
  termination_date: z.string().nullable().optional(),
  professional_registry: z.string().nullable().optional(),
  belt_id: uuid.nullable().optional(),
  belt_grade: z.number().int().min(0).max(10).nullable().optional(),
  modalities: z.array(z.string()).optional(),
  specialties: z.string().nullable().optional(),
  biography: z.string().nullable().optional(),
  mini_resume: z.string().nullable().optional(),
  professional_photo_url: z.string().url().nullable().optional(),
  status: z.enum(["active", "inactive", "leave", "vacation", "terminated"]).optional(),
});

export const upsertTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => memberSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = { ...rest, email: rest.email === "" ? null : rest.email } as typeof rest;

    if (id) {
      const before = await context.supabase.from("dojo_team_members").select("*").eq("id", id).maybeSingle();
      const { error } = await context.supabase.from("dojo_team_members").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await context.supabase.from("dojo_team_history").insert({
        owner_id: context.userId, member_id: id,
        event_type: "profile_change", description: "Cadastro atualizado",
        before_data: (before.data ?? null) as never,
        after_data: payload as never,
        actor_user_id: context.userId,
      });
      return { id };
    }

    const insertPayload = { ...payload, owner_id: context.userId, full_name: payload.full_name };
    const { data: row, error } = await context.supabase
      .from("dojo_team_members")
      .insert(insertPayload)
      .select("id").single();
    if (error) throw new Error(error.message);

    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: row.id,
      event_type: "log", description: "Colaborador criado",
      after_data: payload as never, actor_user_id: context.userId,
    });
    return { id: row.id };
  });

export const updateTeamMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: uuid,
    status: z.enum(["active", "inactive", "leave", "vacation", "terminated"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_members")
      .update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: data.id,
      event_type: "profile_change", description: `Status: ${data.status}`,
      actor_user_id: context.userId,
    });
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    // Archive: set status = terminated, keep history intact
    const { error } = await context.supabase.from("dojo_team_members")
      .update({ status: "terminated", termination_date: new Date().toISOString().slice(0, 10) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PAYROLL CONFIG ============

const payrollSchema = z.object({
  member_id: uuid,
  payment_type: z.enum(["fixed", "hourly", "per_class", "percentage", "commission", "contractor", "mei", "autonomous", "other"]),
  base_salary: z.number().nullable().optional(),
  hourly_rate: z.number().nullable().optional(),
  per_class_rate: z.number().nullable().optional(),
  commission_percent: z.number().nullable().optional(),
  commission_on_enrollment: z.number().nullable().optional(),
  commission_on_renewal: z.number().nullable().optional(),
  commission_on_sale: z.number().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  bank_agency: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  pix_key: z.string().nullable().optional(),
  pix_key_type: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const upsertPayrollConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => payrollSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_payroll_config")
      .upsert({ ...data, owner_id: context.userId }, { onConflict: "member_id" });
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: data.member_id,
      event_type: "salary_change", description: "Configuração financeira atualizada",
      after_data: data as never, actor_user_id: context.userId,
    });
    return { ok: true };
  });

// ============ PAYMENTS ============

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid.optional(),
    month: z.string().optional(), // YYYY-MM
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("dojo_team_payments").select("*, dojo_team_members(full_name, role)").order("created_at", { ascending: false });
    if (data.member_id) q = q.eq("member_id", data.member_id);
    if (data.month) {
      const first = `${data.month}-01`;
      q = q.eq("reference_month", first);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const paymentSchema = z.object({
  id: uuid.optional(),
  member_id: uuid,
  kind: z.enum(["salary", "advance", "discount", "bonus", "commission", "overtime", "reimbursement", "other"]),
  reference_month: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  hours_worked: z.number().nullable().optional(),
  classes_count: z.number().int().nullable().optional(),
  status: z.enum(["pending", "paid", "canceled"]).optional(),
  due_date: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const upsertPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => paymentSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_team_payments").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_team_payments")
      .insert({ ...rest, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_team_history").insert({
      owner_id: context.userId, member_id: rest.member_id,
      event_type: "payment", description: `Pagamento registrado: ${rest.kind} R$ ${rest.amount}`,
      after_data: rest as never, actor_user_id: context.userId,
    });
    return { id: row.id };
  });

export const markPaymentPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_payments")
      .update({ status: "canceled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ATTENDANCE ============

export const listTeamAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid.optional(),
    month: z.string().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("dojo_team_attendance").select("*, dojo_team_members(full_name)").order("work_date", { ascending: false });
    if (data.member_id) q = q.eq("member_id", data.member_id);
    if (data.month) {
      const [y, m] = data.month.split("-").map(Number);
      const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      const end = new Date(y, m, 1).toISOString().slice(0, 10);
      q = q.gte("work_date", start).lt("work_date", end);
    }
    const { data: rows, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const recordAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: uuid.optional(),
    member_id: uuid,
    work_date: z.string(),
    clock_in: z.string().nullable().optional(),
    clock_out: z.string().nullable().optional(),
    break_minutes: z.number().int().min(0).optional(),
    hours_worked: z.number().nullable().optional(),
    justification: z.string().nullable().optional(),
    status: z.enum(["present", "absent", "late", "justified", "leave", "holiday"]).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_team_attendance").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_team_attendance")
      .insert({ ...rest, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ============ DOCUMENTS ============

export const listTeamDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ member_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("dojo_team_documents")
      .select("*").eq("member_id", data.member_id).is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addTeamDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid,
    kind: z.enum(["contract", "rg", "cpf", "proof", "certificate", "course", "diploma", "other"]),
    title: z.string().min(1),
    file_url: z.string().url(),
    file_size: z.number().optional(),
    mime_type: z.string().optional(),
    notes: z.string().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("dojo_team_documents")
      .insert({ ...data, owner_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const archiveTeamDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_documents")
      .update({ archived_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SIGNATURES (for certificates integration) ============

export const upsertSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    member_id: uuid,
    signature_url: z.string().url(),
    display_name: z.string().min(1),
    role_label: z.string().nullable().optional(),
    belt_label: z.string().nullable().optional(),
    can_sign_certificates: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_team_signatures")
      .upsert({ ...data, owner_id: context.userId }, { onConflict: "member_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCertificateSigners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_team_signatures")
      .select("*, dojo_team_members(full_name, role, status)")
      .eq("can_sign_certificates", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ HISTORY ============

export const listTeamHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ member_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("dojo_team_history")
      .select("*").eq("member_id", data.member_id).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ DASHBOARD ============

export const getTeamDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: members } = await context.supabase
      .from("dojo_team_members").select("id, role, status, birth_date, full_name, photo_url");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

    const { data: payments } = await context.supabase
      .from("dojo_team_payments").select("amount, status, kind")
      .gte("reference_month", monthStart).lt("reference_month", nextMonth);

    const list = members ?? [];
    const active = list.filter((m) => m.status === "active");
    const byRole = (r: string) => active.filter((m) => m.role === r).length;

    const currentMonth = now.getMonth() + 1;
    const birthdays = list.filter((m) => {
      if (!m.birth_date) return false;
      return new Date(m.birth_date).getMonth() + 1 === currentMonth;
    });

    const payroll = (payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payrollPaid = (payments ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);
    const payrollPending = payroll - payrollPaid;

    return {
      total: list.length,
      active_total: active.length,
      teachers: byRole("teacher"),
      instructors: byRole("instructor"),
      receptionists: byRole("receptionist"),
      admins: byRole("admin") + byRole("manager"),
      birthdays,
      payroll_month_total: payroll,
      payroll_month_paid: payrollPaid,
      payroll_month_pending: payrollPending,
    };
  });
