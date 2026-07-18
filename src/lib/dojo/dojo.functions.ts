import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ============ UNITS ============
export const listDojoUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dojo_units").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    address: z.string().max(400).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { name: data.name, address: data.address ?? null, phone: data.phone ?? null, active: data.active ?? true };
    if (data.id) {
      const { error } = await context.supabase.from("dojo_units").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("dojo_units").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dojo_students")
      .select("*, unit:dojo_units(name), belt:dojo_belts(name,color_hex)")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDojoStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: student, error } = await context.supabase
      .from("dojo_students").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [grads, enrolls, invoices, certs] = await Promise.all([
      context.supabase.from("dojo_graduations").select("*, belt:dojo_belts(name,color_hex)").eq("student_id", data.id).order("graduation_date", { ascending: false }),
      context.supabase.from("dojo_enrollments").select("*, plan:dojo_plans(name,amount)").eq("student_id", data.id),
      context.supabase.from("dojo_invoices").select("*").eq("student_id", data.id).order("due_date", { ascending: false }).limit(50),
      context.supabase.from("dojo_certificates").select("*").eq("student_id", data.id).order("issued_at", { ascending: false }),
    ]);
    return { student, graduations: grads.data ?? [], enrollments: enrolls.data ?? [], invoices: invoices.data ?? [], certificates: certs.data ?? [] };
  });

export const saveDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    full_name: z.string().min(1).max(200),
    unit_id: z.string().uuid().optional().nullable(),
    cpf: z.string().max(20).optional().nullable(),
    birth_date: z.string().optional().nullable(),
    email: z.string().email().max(200).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    address: z.string().max(400).optional().nullable(),
    photo_url: z.string().max(1000).optional().nullable(),
    guardian_name: z.string().max(200).optional().nullable(),
    guardian_phone: z.string().max(40).optional().nullable(),
    current_belt_id: z.string().uuid().optional().nullable(),
    current_degree: z.number().int().min(0).max(10).optional(),
    status: z.enum(["active","inactive","frozen"]).optional(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const payload: any = { ...rest };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    if (id) {
      const { error } = await context.supabase.from("dojo_students").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_students").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ GRADUATIONS ============
export const addDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().uuid(),
    belt_id: z.string().uuid(),
    degree: z.number().int().min(0).max(10).default(0),
    graduation_date: z.string(),
    evaluator: z.string().max(200).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("dojo_graduations")
      .insert({
        student_id: data.student_id,
        belt_id: data.belt_id,
        degree: data.degree,
        graduation_date: data.graduation_date,
        evaluator: data.evaluator ?? null,
        notes: data.notes ?? null,
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    // update current belt/degree of student
    await context.supabase.from("dojo_students")
      .update({ current_belt_id: data.belt_id, current_degree: data.degree })
      .eq("id", data.student_id);
    return { id: row.id };
  });

export const deleteDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_graduations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PLANS ============
export const listDojoPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dojo_plans").select("*, unit:dojo_units(name)").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    amount: z.number().min(0),
    duration_days: z.number().int().min(1).max(3650),
    unit_id: z.string().uuid().optional().nullable(),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_plans").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_plans").insert(rest).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ENROLLMENTS ============
export const saveDojoEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    student_id: z.string().uuid(),
    plan_id: z.string().uuid(),
    custom_amount: z.number().min(0).optional().nullable(),
    due_day: z.number().int().min(1).max(28),
    start_date: z.string(),
    end_date: z.string().optional().nullable(),
    status: z.enum(["active","paused","cancelled"]).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_enrollments").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_enrollments").insert(rest).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
    await assertAdmin(context);
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
    id: z.string().uuid().optional(),
    student_id: z.string().uuid(),
    enrollment_id: z.string().uuid().optional().nullable(),
    unit_id: z.string().uuid().optional().nullable(),
    description: z.string().max(300).optional().nullable(),
    amount: z.number().min(0),
    due_date: z.string(),
    status: z.enum(["pending","paid","overdue","cancelled"]).optional(),
    method: z.string().max(30).optional().nullable(),
    paid_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_invoices").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_invoices").insert(rest).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const markDojoInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    method: z.string().max(30).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), method: data.method ?? "cash" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDojoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Generate next month's invoices for all active enrollments
export const generateMonthlyInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    reference_month: z.string(), // "YYYY-MM"
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
      // skip if invoice already exists for that enrollment and month
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
      });
      if (!insErr) created++;
    }
    return { created };
  });

// ============ EXPENSES ============
export const listDojoExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dojo_expenses").select("*, unit:dojo_units(name)")
      .order("due_date", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    unit_id: z.string().uuid().optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    description: z.string().min(1).max(300),
    amount: z.number().min(0),
    due_date: z.string(),
    status: z.enum(["pending","paid","overdue"]).optional(),
    paid_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_expenses").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_expenses").insert(rest).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
    await assertAdmin(context);
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
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("dojo_certificate_templates").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveCertificateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    background_url: z.string().min(1).max(2000),
    width: z.number().int().min(200).max(6000),
    height: z.number().int().min(200).max(6000),
    fields: z.array(z.object({
      key: z.string(),
      label: z.string(),
      x: z.number(),
      y: z.number(),
      fontSize: z.number().min(6).max(400),
      fontFamily: z.string().optional(),
      color: z.string().optional(),
      align: z.enum(["left","center","right"]).optional(),
      bold: z.boolean().optional(),
    })),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_certificate_templates").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("dojo_certificate_templates").insert(rest).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCertificateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_certificate_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().uuid(),
    graduation_id: z.string().uuid().optional().nullable(),
    template_id: z.string().uuid(),
    values: z.record(z.string(), z.string()),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from("dojo_certificates").insert({
      student_id: data.student_id,
      graduation_id: data.graduation_id ?? null,
      template_id: data.template_id,
      values: data.values,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });
