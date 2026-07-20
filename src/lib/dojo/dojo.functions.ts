import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Owner-scoped helper: every user manages their own dojo. RLS enforces
// `owner_id = auth.uid()` for reads/writes, so we only need to inject
// owner_id on inserts. Admin role bypasses via RLS.
function ownerId(context: { userId: string }) {
  return context.userId;
}

// ============ UNITS ============
export const listDojoUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_units").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    name: z.string().min(1).max(120),
    address: z.string().max(400).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const payload = { name: data.name, address: data.address ?? null, phone: data.phone ?? null, active: data.active ?? true };
    if (data.id) {
      const { error } = await context.supabase.from("dojo_units").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("dojo_units").insert({ ...payload, owner_id: ownerId(context) }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ BELTS ============
export const listDojoBelts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_belts").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ STUDENTS ============
export const listDojoStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_students")
      .select("*, unit:dojo_units(name), belt:dojo_belts(name,color_hex,stripe_hex,max_degrees)")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDojoStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: student, error } = await context.supabase
      .from("dojo_students").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [grads, enrolls, invoices, certs] = await Promise.all([
      context.supabase.from("dojo_graduations").select("*, belt:dojo_belts(name,color_hex,stripe_hex,max_degrees)").eq("student_id", data.id).order("graduation_date", { ascending: false }),
      context.supabase.from("dojo_enrollments").select("*, plan:dojo_plans(name,amount)").eq("student_id", data.id),
      context.supabase.from("dojo_invoices").select("*").eq("student_id", data.id).order("due_date", { ascending: false }).limit(50),
      context.supabase.from("dojo_certificates").select("*, template:dojo_certificate_templates(*), graduation:dojo_graduations(graduation_date, degree, belt:dojo_belts(name))").eq("student_id", data.id).order("issued_at", { ascending: false }),
    ]);
    return { student, graduations: grads.data ?? [], enrollments: enrolls.data ?? [], invoices: invoices.data ?? [], certificates: certs.data ?? [] };
  });

export const saveDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    full_name: z.string().min(1).max(200),
    unit_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    cpf: z.string().max(20).optional().nullable(),
    rg: z.string().max(30).optional().nullable(),
    birth_date: z.string().optional().nullable(),
    gender: z.string().max(30).optional().nullable(),
    nationality: z.string().max(60).optional().nullable(),
    marital_status: z.string().max(30).optional().nullable(),
    profession: z.string().max(120).optional().nullable(),
    blood_type: z.string().max(10).optional().nullable(),
    health_insurance: z.string().max(200).optional().nullable(),
    email: z.string().email().max(200).optional().nullable().or(z.literal("")),
    phone: z.string().max(40).optional().nullable(),
    address: z.string().max(400).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    street: z.string().max(200).optional().nullable(),
    address_number: z.string().max(20).optional().nullable(),
    address_complement: z.string().max(120).optional().nullable(),
    neighborhood: z.string().max(120).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    state: z.string().max(2).optional().nullable(),
    photo_url: z.string().max(1000).optional().nullable(),
    guardian_name: z.string().max(200).optional().nullable(),
    guardian_phone: z.string().max(40).optional().nullable(),
    emergency_contact_name: z.string().max(200).optional().nullable(),
    emergency_contact_phone: z.string().max(40).optional().nullable(),
    emergency_contact_relationship: z.string().max(60).optional().nullable(),
    current_belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    current_degree: z.number().int().min(0).max(10).optional(),
    status: z.enum(["active","inactive","frozen"]).optional(),
    notes: z.string().max(2000).optional().nullable(),
    anamnesis: z.record(z.string(), z.any()).optional(),
    has_medical_clearance: z.boolean().optional(),
    medical_clearance_date: z.string().optional().nullable(),
    lgpd_consent: z.boolean().optional(),
    image_rights_consent: z.boolean().optional(),
    terms_accepted: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: any = { ...rest };
    if (payload.email === "") payload.email = null;
    // Stamp consent timestamps when toggled true
    const now = new Date().toISOString();
    if (payload.lgpd_consent === true) payload.lgpd_consent_date = now;
    if (payload.terms_accepted === true) payload.terms_accepted_date = now;
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    if (id) {
      const { error } = await context.supabase.from("dojo_students").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_students").insert({ ...payload, owner_id: ownerId(context) }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });


export const deleteDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ GRADUATIONS ============
export const addDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    degree: z.number().int().min(0).max(10).default(0),
    graduation_date: z.string(),
    evaluator: z.string().max(200).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_graduations")
      .insert({
        student_id: data.student_id,
        belt_id: data.belt_id,
        degree: data.degree,
        graduation_date: data.graduation_date,
        evaluator: data.evaluator ?? null,
        notes: data.notes ?? null,
        owner_id: ownerId(context),
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_students")
      .update({ current_belt_id: data.belt_id, current_degree: data.degree })
      .eq("id", data.student_id);
    return { id: row.id };
  });

export const deleteDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_graduations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PLANS ============
export const listDojoPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_plans")
      .select("*, unit:dojo_units(name)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });


export const saveDojoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
    amount: z.number().min(0),
    enrollment_fee: z.number().min(0).optional(),
    duration_days: z.number().int().min(1).max(3650).optional(),
    frequency: z.enum(["monthly","bimonthly","quarterly","quadrimestral","semiannual","annual","custom"]).optional(),
    custom_months: z.number().int().min(1).max(60).optional().nullable(),
    installments: z.number().int().min(1).max(60).optional(),
    unit_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
    payment_methods: z.array(z.object({
      code: z.string(),
      enabled: z.boolean(),
      gateway: z.string().optional(),
      config: z.record(z.string(), z.any()).optional(),
    })).optional(),
    rules: z.record(z.string(), z.any()).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_plans").update(rest as any).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase
      .from("dojo_plans")
      .insert({ ...(rest as any), owner_id: ownerId(context) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Retorna as formas de pagamento habilitadas para o aluno,
 * lidas a partir do plano da matrícula ativa. Se não houver
 * plano ativo, devolve lista vazia. Fonte única de verdade
 * usada pelo Financeiro, Cobranças e Renovações.
 */
export const getStudentAllowedPaymentMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: enroll } = await context.supabase
      .from("dojo_enrollments")
      .select("plan_id, plan:dojo_plans(id, name, payment_methods, rules, amount, enrollment_fee, installments, frequency, custom_months)")
      .eq("student_id", data.student_id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const plan: any = (enroll as any)?.plan ?? null;
    if (!plan) return { plan: null, methods: [] };
    const methods = Array.isArray(plan.payment_methods)
      ? plan.payment_methods.filter((m: any) => m?.enabled)
      : [];
    return { plan, methods };
  });


// ============ ENROLLMENTS ============
export const saveDojoEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    plan_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    custom_amount: z.number().min(0).optional().nullable(),
    due_day: z.number().int().min(1).max(28),
    start_date: z.string(),
    end_date: z.string().optional().nullable(),
    status: z.enum(["active","paused","cancelled"]).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_enrollments").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_enrollments").insert({ ...rest, owner_id: ownerId(context) }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_enrollments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ INVOICES ============
export const listDojoInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    status: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("dojo_invoices")
      .select("*, student:dojo_students(full_name)")
      .order("due_date", { ascending: false }).limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.from) q = q.gte("due_date", data.from);
    if (data.to) q = q.lte("due_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveDojoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    enrollment_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    unit_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    description: z.string().max(300).optional().nullable(),
    amount: z.number().min(0),
    due_date: z.string(),
    status: z.enum(["pending","paid","overdue","cancelled"]).optional(),
    method: z.string().max(30).optional().nullable(),
    paid_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_invoices").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_invoices").insert({ ...rest, owner_id: ownerId(context) }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const markDojoInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    method: z.string().max(30).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), method: data.method ?? "cash" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDojoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateMonthlyInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    reference_month: z.string(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: enrolls, error } = await context.supabase
      .from("dojo_enrollments")
      .select("id, student_id, due_day, custom_amount, plan:dojo_plans(amount), student:dojo_students(unit_id)")
      .eq("status", "active");
    if (error) throw new Error(error.message);
    const [y, m] = data.reference_month.split("-").map(Number);
    let created = 0;
    for (const e of (enrolls ?? []) as any[]) {
      const dueDay = Math.min(e.due_day ?? 5, 28);
      const dueDate = new Date(Date.UTC(y, m - 1, dueDay)).toISOString().slice(0, 10);
      const amount = e.custom_amount ?? e.plan?.amount ?? 0;
      const monthStart = `${data.reference_month}-01`;
      const nextMonth = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      const { data: existing } = await context.supabase.from("dojo_invoices")
        .select("id").eq("enrollment_id", e.id).gte("due_date", monthStart).lt("due_date", nextMonth).maybeSingle();
      if (existing) continue;
      const { error: insErr } = await context.supabase.from("dojo_invoices").insert({
        student_id: e.student_id,
        enrollment_id: e.id,
        unit_id: e.student?.unit_id ?? null,
        description: `Mensalidade ${data.reference_month}`,
        amount,
        due_date: dueDate,
        status: "pending",
        owner_id: ownerId(context),
      });
      if (!insErr) created++;
    }
    return { created };
  });

// ============ EXPENSES ============
export const listDojoExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_expenses").select("*, unit:dojo_units(name)")
      .order("due_date", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    unit_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    description: z.string().min(1).max(300),
    amount: z.number().min(0),
    due_date: z.string(),
    status: z.enum(["pending","paid","overdue"]).optional(),
    paid_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_expenses").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_expenses").insert({ ...rest, owner_id: ownerId(context) }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ FINANCE OVERVIEW ============
export const dojoFinanceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const from = data.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const to = data.to ?? new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
    const [inv, exp] = await Promise.all([
      context.supabase.from("dojo_invoices").select("amount,status").gte("due_date", from).lte("due_date", to),
      context.supabase.from("dojo_expenses").select("amount,status").gte("due_date", from).lte("due_date", to),
    ]);
    const invoices = (inv.data ?? []) as any[];
    const expenses = (exp.data ?? []) as any[];
    const received = invoices.filter(i => i.status === "paid").reduce((s,i)=>s+Number(i.amount||0),0);
    const receivable = invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s,i)=>s+Number(i.amount||0),0);
    const paid = expenses.filter(e => e.status === "paid").reduce((s,e)=>s+Number(e.amount||0),0);
    const payable = expenses.filter(e => e.status !== "paid").reduce((s,e)=>s+Number(e.amount||0),0);
    return { from, to, received, receivable, paid, payable, balance: received - paid };
  });

// ============ CERTIFICATE TEMPLATES ============
export const listCertificateTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_certificate_templates").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveCertificateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    name: z.string().min(1).max(200),
    background_url: z.string().max(2000).optional().default(""),
    width: z.number().int().min(200).max(6000),
    height: z.number().int().min(200).max(6000),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string().optional().default(""),
      x: z.number(),
      y: z.number(),
      fontSize: z.number().min(6).max(400).optional().default(24),
      fontFamily: z.string().optional(),
      color: z.string().optional(),
      align: z.enum(["left","center","right"]).optional(),
      bold: z.boolean().optional(),
      kind: z.enum(["variable","static","signature"]).optional(),
      text: z.string().optional(),
      imageUrl: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })),
    variables: z.record(z.string(), z.any()).optional(),
    category: z.string().max(50).optional(),
    is_default: z.boolean().optional(),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = rest as any;
    if (id) {
      const { error } = await context.supabase.from("dojo_certificate_templates").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_certificate_templates").insert({ ...payload, owner_id: ownerId(context) } as any).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCertificateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_certificate_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    graduation_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    template_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    values: z.record(z.string(), z.string()),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("dojo_certificates").insert({
      student_id: data.student_id,
      graduation_id: data.graduation_id ?? null,
      template_id: data.template_id,
      values: data.values,
      owner_id: ownerId(context),
    }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ GRADUATION SETTINGS ============
export const getGraduationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_graduation_settings")
      .select("*")
      .eq("owner_id", ownerId(context))
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? {
      system: "merit",
      classes_by_belt: {},
      period_months_by_belt: {},
      default_classes: 60,
      default_period_months: 12,
    };
  });

export const saveGraduationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    system: z.enum(["merit", "classes", "period"]),
    classes_by_belt: z.record(z.string(), z.number()).optional(),
    period_months_by_belt: z.record(z.string(), z.number()).optional(),
    default_classes: z.number().int().min(0).max(10000).optional(),
    default_period_months: z.number().int().min(0).max(240).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      owner_id: ownerId(context),
      system: data.system,
      classes_by_belt: data.classes_by_belt ?? {},
      period_months_by_belt: data.period_months_by_belt ?? {},
      default_classes: data.default_classes ?? 60,
      default_period_months: data.default_period_months ?? 12,
    };
    const { error } = await context.supabase
      .from("dojo_graduation_settings")
      .upsert(payload, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ BULK GRADUATION ============
export const addBulkGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_ids: z.array(z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido")).min(1),
    belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    degree: z.number().int().min(0).max(10).default(0),
    graduation_date: z.string(),
    evaluator: z.string().max(200).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const rows = data.student_ids.map(sid => ({
      student_id: sid,
      belt_id: data.belt_id,
      degree: data.degree,
      graduation_date: data.graduation_date,
      evaluator: data.evaluator ?? null,
      notes: data.notes ?? null,
      owner_id: ownerId(context),
    }));
    const { data: inserted, error } = await context.supabase
      .from("dojo_graduations").insert(rows).select("id, student_id");
    if (error) throw new Error(error.message);
    await context.supabase
      .from("dojo_students")
      .update({ current_belt_id: data.belt_id, current_degree: data.degree })
      .in("id", data.student_ids);
    return { count: inserted?.length ?? 0, graduations: inserted ?? [] };
  });

// ============ EVALUATIONS ============
const evalItemSchema = z.object({
  type: z.enum(["teorica", "pratica"]),
  question: z.string().min(1).max(1000),
  max_score: z.number().min(0).max(1000),
  notes: z.string().max(1000).optional().nullable(),
});

export const listDojoEvaluations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_evaluations")
      .select("*, belt:dojo_belts(name,color_hex,stripe_hex,max_degrees)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    degree: z.number().int().min(0).max(10).default(0),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    items: z.array(evalItemSchema),
    passing_score: z.number().min(0).optional().nullable(),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const total = data.items.reduce((s, it) => s + Number(it.max_score || 0), 0);
    const payload = {
      belt_id: data.belt_id ?? null,
      degree: data.degree,
      title: data.title,
      description: data.description ?? null,
      items: data.items,
      total_score: total,
      passing_score: data.passing_score ?? null,
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("dojo_evaluations").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("dojo_evaluations")
      .insert({ ...payload, owner_id: ownerId(context) })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_evaluations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
