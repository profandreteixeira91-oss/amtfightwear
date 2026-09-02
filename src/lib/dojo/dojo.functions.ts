import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calendarISO, todayISO, utcCalendarISO } from "@/lib/dates";
import { normalizeCurrentBelts } from "@/lib/dojo/current-belts";

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

const unitPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  address: z.string().max(400).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  active: z.boolean().optional(),
  // Fiscais
  trade_name: z.string().max(160).optional().nullable(),
  legal_name: z.string().max(200).optional().nullable(),
  cnpj: z.string().max(32).optional().nullable(),
  state_registration: z.string().max(40).optional().nullable(),
  opened_at: z.string().optional().nullable(),
  // Responsável
  manager_name: z.string().max(160).optional().nullable(),
  manager_cpf: z.string().max(20).optional().nullable(),
  manager_rg: z.string().max(30).optional().nullable(),
  // Endereço
  zip: z.string().max(12).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(120).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(4).optional().nullable(),
  country: z.string().max(4).optional().nullable(),
  // Contato
  phone2: z.string().max(40).optional().nullable(),
  whatsapp: z.string().max(40).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  socials: z.record(z.string(), z.any()).optional().nullable(),
  // Mídia
  logo_url: z.string().max(600).optional().nullable(),
  banner_url: z.string().max(600).optional().nullable(),
  facade_url: z.string().max(600).optional().nullable(),
  gallery_urls: z.array(z.string()).optional().nullable(),
  // Operacional
  hours: z.record(z.string(), z.any()).optional().nullable(),
  modalities: z.array(z.string()).optional().nullable(),
  age_ranges: z.array(z.string()).optional().nullable(),
  coordinator_ids: z.array(z.string().uuid()).optional().nullable(),
  admin_ids: z.array(z.string().uuid()).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const saveDojoUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => unitPayloadSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) payload[k] = v;
    }
    if (payload.active === undefined) payload.active = true;
    if (id) {
      const { error } = await (context.supabase.from("dojo_units") as any).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await (context.supabase
      .from("dojo_units") as any).insert({ ...payload, owner_id: ownerId(context) }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDojoUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDojoUnit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_units").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ BELTS ============
export const listDojoBelts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_belts").select("*").order("modality").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDojoBelt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    modality: z.string().min(1).max(60),
    name: z.string().min(1).max(80),
    color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    stripe_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    sort_order: z.number().int().min(0).max(999),
    max_degrees: z.number().int().min(0).max(20),
    category: z.string().max(30).optional().default("adult"),
    min_months: z.number().int().min(0).max(240).nullable().optional(),
    min_classes: z.number().int().min(0).max(10000).nullable().optional(),
    criteria_mode: z.enum(["time","classes","evaluation","merit"]).optional().default("time"),
    scope: z.enum(["global", "own"]).default("own"),
    visual: z.any().optional(),
    variants: z.array(z.any()).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, scope, ...rest } = data;
    // Global belts (owner_id NULL) só podem ser gerenciadas pelo AMT admin.
    const { data: isAmtAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "amt_admin" as any,
    });
    const effectiveScope = scope === "global" && isAmtAdmin ? "global" : "own";
    const payload: any = { ...rest, owner_id: effectiveScope === "global" ? null : context.userId };
    if (id) {
      const { data: upd, error } = await context.supabase
        .from("dojo_belts").update(payload).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return upd;
    }
    const { data: ins, error } = await context.supabase
      .from("dojo_belts").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return ins;
  });

export const deleteDojoBelt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_belts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderDojoBelts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0).max(9999) })).min(1).max(500),
  }).parse(i))
  .handler(async ({ data, context }) => {
    for (const it of data.items) {
      const { error } = await context.supabase
        .from("dojo_belts").update({ sort_order: it.sort_order }).eq("id", it.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: isAmtAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "amt_admin" as any }),
    ]);
    return { isAdmin: Boolean(isAdmin), isAmtAdmin: Boolean(isAmtAdmin) };
  });

// ============ STUDENTS ============
// Compute the most recent graduation per modality for each student.
// A graduation only overrides another when they share the same modality.
async function attachCurrentBeltsByModality(
  supabase: any,
  students: any[],
): Promise<any[]> {
  if (!students || students.length === 0) return students ?? [];
  const ids = students.map((s) => s.id);
  
  const [gradsRes, classStudentsRes] = await Promise.all([
    supabase
      .from("dojo_graduations")
      .select("student_id, degree, graduation_date, belt:dojo_belts(id,name,color_hex,stripe_hex,max_degrees,modality,sort_order,visual,variants)")
      .in("student_id", ids)
      .order("graduation_date", { ascending: false }),
    supabase
      .from("dojo_class_students")
      .select("student_id, class_id, dojo_classes(modality)")
      .in("student_id", ids)
  ]);

  const grads = gradsRes.data ?? [];
  const classStudents = classStudentsRes.data ?? [];

  const byStudentGrads = new Map<string, Map<string, any>>();
  for (const g of grads) {
    if (!g.belt) continue;
    const modality = (g.belt as any).modality ?? "jiu-jitsu";
    let m = byStudentGrads.get(g.student_id);
    if (!m) { m = new Map(); byStudentGrads.set(g.student_id, m); }
    if (!m.has(modality)) {
      m.set(modality, {
        modality,
        belt: g.belt,
        degree: g.degree ?? 0,
        graduation_date: g.graduation_date,
      });
    }
  }

  const byStudentClasses = new Map<string, Map<string, string[]>>();
  for (const cs of classStudents) {
    const mod = (cs.dojo_classes as any)?.modality ?? "jiu-jitsu";
    let m = byStudentClasses.get(cs.student_id);
    if (!m) { m = new Map(); byStudentClasses.set(cs.student_id, m); }
    let cls = m.get(mod);
    if (!cls) { cls = []; m.set(mod, cls); }
    cls.push(cs.class_id);
  }

  return students.map((s) => {
    const studentGrads = byStudentGrads.get(s.id) ?? new Map();
    const studentClasses = byStudentClasses.get(s.id) ?? new Map();
    
    // We want to combine these. For every modality that has either a belt or a class, we want an entry.
    const combined = new Map<string, any>();
    
    // Fill from grads
    for (const [mod, g] of studentGrads.entries()) {
      combined.set(mod, { ...g, class_ids: studentClasses.get(mod) ?? [] });
    }
    
    // Fill remaining from classes (rare case: has class but no graduation yet)
    for (const [mod, cls] of studentClasses.entries()) {
      if (!combined.has(mod)) {
        combined.set(mod, { modality: mod, belt: null, degree: 0, class_ids: cls });
      }
    }

    return {
      ...s,
      current_belts: normalizeCurrentBelts(Array.from(combined.values())),
    };
  });
}

export const listDojoStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_students")
      .select("*, unit:dojo_units(name), belt:dojo_belts(id,name,color_hex,stripe_hex,max_degrees,modality,sort_order,visual,variants)")
      .is("cancelled_at", null)
      .order("full_name");
    if (error) throw new Error(error.message);
    return await attachCurrentBeltsByModality(context.supabase, data ?? []);
  });

export const getDojoStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: student, error } = await context.supabase
      .from("dojo_students").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [grads, enrolls, invoices, certs, photos, classStudentsRes] = await Promise.all([
      context.supabase.from("dojo_graduations").select("*, belt:dojo_belts(id,name,color_hex,stripe_hex,max_degrees,modality,sort_order,visual,variants)").eq("student_id", data.id).order("graduation_date", { ascending: false }),
      context.supabase.from("dojo_enrollments").select("*, plan:dojo_plans(name,amount)").eq("student_id", data.id),
      context.supabase.from("dojo_invoices").select("*").eq("student_id", data.id).order("due_date", { ascending: false }).limit(50),
      context.supabase.from("dojo_certificates").select("*, template:dojo_certificate_templates(*), graduation:dojo_graduations(graduation_date, degree, belt:dojo_belts(name))").eq("student_id", data.id).order("issued_at", { ascending: false }),
      context.supabase.from("dojo_student_reference_photos").select("*").eq("student_id", data.id),
      context.supabase.from("dojo_class_students").select("class_id, dojo_classes(modality)").eq("student_id", data.id),
    ]);
    
    // Classes by modality
    const classIdsByMod = new Map<string, string[]>();
    for (const cs of classStudentsRes.data ?? []) {
      const mod = (cs.dojo_classes as any)?.modality ?? "jiu-jitsu";
      let list = classIdsByMod.get(mod);
      if (!list) { list = []; classIdsByMod.set(mod, list); }
      list.push(cs.class_id);
    }

    // Derive current belt per modality from ordered graduations (latest per modality wins).
    const currentByModality = new Map<string, any>();
    for (const g of grads.data ?? []) {
      if (!g.belt) continue;
      const mod = (g.belt as any).modality ?? "jiu-jitsu";
      if (!currentByModality.has(mod)) {
        currentByModality.set(mod, { 
          modality: mod, 
          belt: g.belt, 
          degree: g.degree ?? 0, 
          graduation_date: g.graduation_date,
          class_ids: classIdsByMod.get(mod) ?? []
        });
      }
    }
    
    // Add modalities that only have classes
    for (const [mod, cls] of classIdsByMod.entries()) {
      if (!currentByModality.has(mod)) {
        currentByModality.set(mod, { modality: mod, belt: null, degree: 0, class_ids: cls });
      }
    }

    return {
      student,
      graduations: grads.data ?? [],
      enrollments: enrolls.data ?? [],
      invoices: invoices.data ?? [],
      certificates: certs.data ?? [],
      referencePhotos: photos.data ?? [],
      current_belts: normalizeCurrentBelts(Array.from(currentByModality.values())),
    };

  });

// Retorna, para todos os alunos do dojo, o progresso rumo à próxima graduação:
// - contagem de check-ins desde a última graduação (ou desde sempre, quando não há)
// - critério efetivo (override do aluno > carência/mín. aulas da faixa atual)
export const listGraduationProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [studentsRes, beltsRes, gradsRes, attRes] = await Promise.all([
      context.supabase.from("dojo_students").select("id, full_name, current_belt_id, current_degree, graduation_criteria_mode, graduation_min_classes, graduation_min_months, created_at"),
      context.supabase.from("dojo_belts").select("id, name, modality, min_months, min_classes, criteria_mode, sort_order, max_degrees, color_hex, stripe_hex"),
      context.supabase.from("dojo_graduations").select("student_id, belt_id, graduation_date, degree"),
      context.supabase.from("dojo_attendance").select("student_id, checked_in_at").not("student_id", "is", null),
    ]);
    if (studentsRes.error) throw new Error(studentsRes.error.message);
    if (beltsRes.error) throw new Error(beltsRes.error.message);
    if (gradsRes.error) throw new Error(gradsRes.error.message);
    if (attRes.error) throw new Error(attRes.error.message);

    const belts = beltsRes.data ?? [];
    const beltById = new Map(belts.map((b: any) => [b.id, b]));

    // última graduação por aluno
    const lastGradByStudent = new Map<string, any>();
    for (const g of gradsRes.data ?? []) {
      const cur = lastGradByStudent.get(g.student_id);
      if (!cur || new Date(g.graduation_date) > new Date(cur.graduation_date)) {
        lastGradByStudent.set(g.student_id, g);
      }
    }

    // presenças por aluno
    const attByStudent = new Map<string, string[]>();
    for (const a of attRes.data ?? []) {
      if (!a.student_id) continue;
      const arr = attByStudent.get(a.student_id) ?? [];
      arr.push(a.checked_in_at);
      attByStudent.set(a.student_id, arr);
    }

    return (studentsRes.data ?? []).map((s: any) => {
      const lastGrad = lastGradByStudent.get(s.id);
      const currentBelt = lastGrad ? beltById.get(lastGrad.belt_id) : (s.current_belt_id ? beltById.get(s.current_belt_id) : null);
      const sinceDate = lastGrad?.graduation_date
        ? new Date(lastGrad.graduation_date)
        : (s.created_at ? new Date(s.created_at) : new Date(0));
      const attendance_since = (attByStudent.get(s.id) ?? []).filter((d) => new Date(d) >= sinceDate).length;

      // Critério efetivo: override do aluno tem prioridade
      const criteria_mode = (s.graduation_criteria_mode ?? (currentBelt as any)?.criteria_mode ?? "time") as string;
      const min_classes = (s.graduation_min_classes ?? (currentBelt as any)?.min_classes ?? null) as number | null;
      const min_months = (s.graduation_min_months ?? (currentBelt as any)?.min_months ?? null) as number | null;

      // Meses corridos desde última graduação/matrícula
      const months_since = Math.floor(
        (Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
      );

      return {
        student_id: s.id,
        full_name: s.full_name,
        current_belt: currentBelt ?? null,
        current_degree: s.current_degree ?? lastGrad?.degree ?? 0,
        since_date: sinceDate.toISOString(),
        attendance_since,
        months_since,
        criteria_mode,
        min_classes,
        min_months,
        has_override: Boolean(
          s.graduation_criteria_mode || s.graduation_min_classes != null || s.graduation_min_months != null,
        ),
      };
    });
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
    current_belt_id: z.string().uuid().optional().nullable(),
    current_degree: z.number().int().min(0).max(20).optional().nullable(),
    status: z.enum(["active","inactive","frozen"]).optional(),
    notes: z.string().max(2000).optional().nullable(),
    anamnesis: z.record(z.string(), z.any()).optional(),
    has_medical_clearance: z.boolean().optional(),
    medical_clearance_date: z.string().optional().nullable(),
    lgpd_consent: z.boolean().optional(),
    image_rights_consent: z.boolean().optional(),
    terms_accepted: z.boolean().optional(),
    graduation_criteria_mode: z.enum(["time","classes","evaluation","merit"]).nullable().optional(),
    graduation_min_classes: z.number().int().min(0).max(10000).nullable().optional(),
    graduation_min_months: z.number().int().min(0).max(240).nullable().optional(),
    facial_recognition_consent: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: any = { ...rest };
    if (payload.email === "") payload.email = null;
    // Stamp consent timestamps when toggled true
    const now = new Date().toISOString();
    if (data.lgpd_consent) payload.lgpd_consent_at = now;
    if (data.facial_recognition_consent) payload.facial_recognition_consent_at = now;

    if (payload.lgpd_consent === true) payload.lgpd_consent_date = now;
    if (payload.terms_accepted === true) payload.terms_accepted_date = now;
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    if (id) {
      const { error } = await context.supabase.from("dojo_students").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const owner = ownerId(context);
    const { data: row, error } = await context.supabase.from("dojo_students").insert({ ...payload, owner_id: owner }).select("id, full_name").single();
    if (error) throw new Error(error.message);
    // Fire-and-forget: notifica o dono do dojo sobre nova matrícula
    try {
      const { sendPushToDojoOwner } = await import("@/lib/push/dojo-owner-push.server");
      void sendPushToDojoOwner(owner, "enrollments", {
        title: "Nova matrícula",
        body: `${row.full_name ?? "Novo aluno"} foi cadastrado(a) no dojo`,
        url: `/dojo/app/students/${row.id}`,
        tag: `dojo-student-${row.id}`,
      }).catch((e) => console.warn("[owner-push] enrollment failed", e));
    } catch (e) {
      console.warn("[owner-push] enrollment import failed", e);
    }
    return { id: row.id };
  });


export const deleteDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    // Cancelamento reversível (soft-delete): mantém dados por 30 dias.
    const { data: prev } = await context.supabase
      .from("dojo_students")
      .select("full_name")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("dojo_students")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), frozen_since: null, frozen_until: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    // Invariante: matrícula cancelada => recorrência encerrada. Sem isso o cron
    // continuaria gerando mensalidades para um aluno removido do sistema.
    await context.supabase
      .from("dojo_enrollments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), next_run_at: null } as never)
      .eq("student_id", data.id)
      .neq("status", "cancelled");
    try {
      const owner = ownerId(context);
      const { sendPushToDojoOwner } = await import("@/lib/push/dojo-owner-push.server");
      void sendPushToDojoOwner(owner, "enrollments", {
        title: "Matrícula cancelada",
        body: `${prev?.full_name ?? "Aluno"} teve a matrícula cancelada (dados preservados por 30 dias)`,
        url: `/dojo/app/students`,
        tag: `dojo-student-cancel-${data.id}`,
      }).catch((e) => console.warn("[owner-push] cancel enrollment failed", e));
    } catch (e) {
      console.warn("[owner-push] cancel enrollment import failed", e);
    }
    return { ok: true };
  });

export const freezeDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    frozen_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: prev } = await context.supabase
      .from("dojo_students")
      .select("full_name")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("dojo_students")
      .update({
        status: "frozen",
        frozen_since: new Date().toISOString(),
        frozen_until: data.frozen_until ?? null,
        cancelled_at: null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    try {
      const owner = ownerId(context);
      const { sendPushToDojoOwner } = await import("@/lib/push/dojo-owner-push.server");
      const untilLabel = data.frozen_until
        ? ` até ${new Date(`${data.frozen_until}T00:00:00`).toLocaleDateString("pt-BR")}`
        : " por tempo indeterminado";
      void sendPushToDojoOwner(owner, "enrollments", {
        title: "Matrícula congelada",
        body: `${prev?.full_name ?? "Aluno"} teve a matrícula congelada${untilLabel}`,
        url: `/dojo/app/students/${data.id}`,
        tag: `dojo-student-freeze-${data.id}`,
      }).catch((e) => console.warn("[owner-push] freeze enrollment failed", e));
    } catch (e) {
      console.warn("[owner-push] freeze enrollment import failed", e);
    }
    return { ok: true };
  });

export const unfreezeDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_students")
      .update({ status: "active", frozen_since: null, frozen_until: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreDojoStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_students")
      .update({ status: "active", cancelled_at: null, frozen_since: null, frozen_until: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    // Restaurar o aluno reativa a recorrência das matrículas canceladas.
    await context.supabase
      .from("dojo_enrollments")
      .update({ status: "active", cancelled_at: null } as never)
      .eq("student_id", data.id)
      .eq("status", "cancelled");
    return { ok: true };
  });

// ============ GRADUATIONS ============
export const addDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    degree: z.number().int().min(0).max(20).default(0),
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

    // Only overwrite the student's "primary" current belt when the new
    // graduation is in the same modality AND is the MOST RECENT graduation
    // for that modality. Older/back-dated graduations never override a
    // more recent one. Belts from other modalities remain in
    // dojo_graduations and are surfaced via current_belts per modality.
    const [{ data: newBelt }, { data: student }, { data: modGrads }] = await Promise.all([
      context.supabase.from("dojo_belts").select("modality").eq("id", data.belt_id).maybeSingle(),
      context.supabase.from("dojo_students").select("current_belt_id, belt:dojo_belts(modality)").eq("id", data.student_id).maybeSingle(),
      context.supabase
        .from("dojo_graduations")
        .select("graduation_date, belt:dojo_belts(modality)")
        .eq("student_id", data.student_id),
    ]);
    const newMod = (newBelt as any)?.modality ?? "jiu-jitsu";
    const currentMod = (student as any)?.belt?.modality ?? null;
    // Find the latest graduation date already recorded for this modality
    // (including the row just inserted).
    let latestForModality: string | null = null;
    for (const g of (modGrads as any[]) ?? []) {
      const mod = g?.belt?.modality ?? "jiu-jitsu";
      if (mod !== newMod) continue;
      if (!latestForModality || new Date(g.graduation_date) > new Date(latestForModality)) {
        latestForModality = g.graduation_date;
      }
    }
    const isMostRecent = !latestForModality || new Date(data.graduation_date) >= new Date(latestForModality);
    const shouldOverwrite = (!student?.current_belt_id || currentMod === null || currentMod === newMod) && isMostRecent;
    if (shouldOverwrite) {
      await context.supabase.from("dojo_students")
        .update({ current_belt_id: data.belt_id, current_degree: data.degree })
        .eq("id", data.student_id);
    }
    return { id: row.id };
  });

export const updateDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    graduation_date: z.string().min(1),
    evaluator: z.string().max(200).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: grad } = await context.supabase
      .from("dojo_graduations").select("student_id").eq("id", data.id).maybeSingle();

    const { error } = await context.supabase
      .from("dojo_graduations")
      .update({ graduation_date: data.graduation_date, evaluator: data.evaluator ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const studentId = (grad as any)?.student_id;
    if (studentId) {
      await context.supabase.rpc("dojo_recompute_current_belt", { _student_id: studentId });
    }
    return { ok: true };
  });


export const deleteDojoGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    // Descobre o aluno antes de excluir para poder recalcular a faixa atual.
    const { data: grad } = await context.supabase
      .from("dojo_graduations").select("student_id").eq("id", data.id).maybeSingle();

    // Remove certificados emitidos a partir desta graduação — senão eles
    // continuariam aparecendo no perfil do aluno e no app do aluno.
    await context.supabase.from("dojo_certificates").delete().eq("graduation_id", data.id);

    const { error } = await context.supabase.from("dojo_graduations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    // Rede de segurança: o trigger já recalcula, mas garantimos a consistência
    // da faixa/grau atual do aluno mesmo se o trigger for desabilitado.
    const studentId = (grad as any)?.student_id;
    if (studentId) {
      await context.supabase.rpc("dojo_recompute_current_belt", { _student_id: studentId });
    }
    return { ok: true, student_id: studentId ?? null };
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
    amount: z.number().positive(),
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
    due_day: z.number().int().min(1).max(31),
    start_date: z.string(),
    end_date: z.string().optional().nullable(),
    status: z.enum(["active", "paused", "cancelled", "overdue"]).optional(),
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
      .select("*, student:dojo_students(full_name, phone, email, guardian_phone)")
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
    amount: z.number().positive(),
    due_date: z.string(),
    status: z.enum(["pending","paid","overdue","cancelled"]).optional(),
    method: z.string().max(30).optional().nullable(),
    paid_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    if (id) {
      const { data: current, error: currentError } = await context.supabase
        .from("dojo_invoices")
        .select("asaas_charge_id")
        .eq("id", id)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error("Cobrança não encontrada");

      const owner_id = ownerId(context);
      const { data: profile } = await context.supabase
        .from("dojo_academy_profile")
        .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status")
        .eq("owner_id", owner_id)
        .maybeSingle();
      const { resolveDojoAsaasCredentials, syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
      const { apiKey, split, mode } = resolveDojoAsaasCredentials((profile ?? {}) as any);
      const patch: any = { ...rest };

      // AMT Pay desativado → não toca no Asaas. Apenas atualiza a fatura local.
      if (mode !== "central") {
        if ((current as any).asaas_charge_id) {
          const { asaasUpdateCharge } = await import("@/lib/asaas/client.server");
          const charge = await asaasUpdateCharge(
            (current as any).asaas_charge_id,
            {
              billingType: "UNDEFINED",
              value: rest.amount,
              dueDate: rest.due_date,
              description: rest.description ?? "Mensalidade",
              split,
            },
            apiKey,
          );
          Object.assign(patch, {
            payment_link: charge.invoiceUrl,
            asaas_invoice_url: charge.invoiceUrl,
            split_config: split,
            provider: "asaas",
            payment_provider: "asaas",
          });
        } else {
          const asaasData = await syncInvoiceWithAsaas(context.supabase as any, {
            id,
            ...rest,
            owner_id,
          });
          Object.assign(patch, asaasData);
        }
      }


      const { error } = await context.supabase.from("dojo_invoices").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const payload: any = {
      id: crypto.randomUUID(),
      ...rest,
      status: "pending",
      owner_id: ownerId(context),
    };
    const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
    const asaasData = await syncInvoiceWithAsaas(context.supabase as any, payload);
    Object.assign(payload, asaasData);

    const { data: row, error } = await context.supabase.from("dojo_invoices").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    try {
      const { sendPushToStudent } = await import("@/lib/push/push.server");
      const amountFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
        .format(Number(payload.amount ?? 0));
      await sendPushToStudent(payload.student_id, {
        title: "Nova cobrança disponível",
        body: `${payload.description ?? "Mensalidade"} — ${amountFmt}${payload.due_date ? ` • vence em ${new Date(payload.due_date + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}`,
        url: "/app/financeiro",
        tag: `invoice-${row.id}`,
      }, "invoice_due_soon");
    } catch (err) {
      console.warn("[saveDojoInvoice] push falhou:", (err as any)?.message ?? err);
    }
    return { id: row.id };
  });

export const markDojoInvoicePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    method: z.string().max(30).optional(),
    paid_at: z.string().datetime().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: invoice, error: invoiceError } = await context.supabase
      .from("dojo_invoices")
      .select("amount, asaas_charge_id")
      .eq("id", data.id)
      .maybeSingle();
    if (invoiceError) throw new Error(invoiceError.message);
    if (!invoice) throw new Error("Cobrança não encontrada");

    // Cobrança vinculada ao AMT Pay (Asaas): dá baixa via API
    if ((invoice as any).asaas_charge_id) {
      const { data: profile } = await context.supabase
        .from("dojo_academy_profile")
        .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status")
        .eq("owner_id", ownerId(context))
        .maybeSingle();
      const { resolveDojoAsaasCredentials } = await import("@/lib/asaas/enrollment.server");
      const { apiKey } = resolveDojoAsaasCredentials((profile ?? {}) as any);
      const { asaasReceiveChargeInCash } = await import("@/lib/asaas/client.server");
      try {
        await asaasReceiveChargeInCash(
          (invoice as any).asaas_charge_id,
          Number(invoice.amount),
          apiKey,
        );
      } catch (e: any) {
        // Se a integração falhar, ainda permitimos registrar o recebimento manual
        console.warn("[markDojoInvoicePaid] Asaas receive failed, marking manually:", e?.message);
      }
    }
    // Cobrança manual (sem AMT Pay) — baixa direta no banco
    const { error } = await context.supabase.from("dojo_invoices")
      .update({ status: "paid", paid_at: data.paid_at ?? new Date().toISOString(), method: data.method ?? "cash" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDojoInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: invoice, error: invoiceError } = await context.supabase
      .from("dojo_invoices")
      .select("asaas_charge_id")
      .eq("id", data.id)
      .maybeSingle();
    if (invoiceError) throw new Error(invoiceError.message);
    if (!invoice) throw new Error("Cobrança não encontrada");

    if ((invoice as any).asaas_charge_id) {
      const { data: profile } = await context.supabase
        .from("dojo_academy_profile")
        .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status")
        .eq("owner_id", ownerId(context))
        .maybeSingle();
      const { resolveDojoAsaasCredentials } = await import("@/lib/asaas/enrollment.server");
      const { apiKey } = resolveDojoAsaasCredentials((profile ?? {}) as any);
      const { asaasCancelCharge } = await import("@/lib/asaas/client.server");
      try {
        await asaasCancelCharge((invoice as any).asaas_charge_id, apiKey);
      } catch (e: any) {
        console.warn("[deleteDojoInvoice] Asaas cancel failed, deleting locally:", e?.message);
      }
    }

    const { error } = await context.supabase.from("dojo_invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Cria matrícula e inicia a cobrança recorrente.
 *
 * Fluxo NextFit-like:
 *  - Método de pagamento do plano em (pix|boleto|credit_card|debit_card|payment_link|recurring):
 *    cria Subscription no Asaas → Asaas emite cobranças no ciclo do plano
 *    e o webhook `/api/public/hooks/asaas` sincroniza cada cobrança
 *    como `dojo_invoices`. NÃO cria fatura local (o webhook faz).
 *  - Método manual/cash: cria a primeira fatura local pendente. As faturas
 *    seguintes seguem sendo geradas pelo cron `generate-dojo-invoices`.
 */
export const enrollStudentWithPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    plan_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    due_day: z.number().int().min(1).max(31),
    start_date: z.string(),
    first_due_date: z.string().optional(),
    custom_amount: z.number().min(0).optional().nullable(),
    include_enrollment_fee: z.boolean().optional(),
    // Método selecionado no ato da matrícula (ex.: "pix", "boleto", "credit_card", "manual", "cash").
    // Deve ser um dos habilitados no plano — validado abaixo.
    payment_method: z.string().min(1).default("manual"),
  }).parse(i))
  .handler(async ({ data, context }) => {
    // 1) Carrega plano (com frequência e métodos habilitados)
    const { data: plan, error: planErr } = await context.supabase
      .from("dojo_plans")
      .select("id, name, amount, enrollment_fee, frequency, custom_months, payment_methods")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (planErr) throw new Error(planErr.message);
    if (!plan) throw new Error("Plano não encontrado");

    // 2) Aluno
    const { data: student } = await context.supabase
      .from("dojo_students")
      .select("id, unit_id, email, full_name, phone, cpf, asaas_customer_id")
      .eq("id", data.student_id)
      .maybeSingle();
    if (!student) throw new Error("Aluno não encontrado");

    // Valida método vs plano
    let methodCode = data.payment_method;
    const enabledMethods = Array.isArray((plan as any).payment_methods)
      ? ((plan as any).payment_methods as any[])
          .filter((m) => m && (m.enabled === true || m.enabled === undefined))
          .map((m) => String(m.code))
      : [];

    // Import lazy dos helpers server-only
    const {
      isGatewayPaymentMethod,
      mapPaymentMethodToBillingType,
      mapFrequencyToAsaasCycle,
      ensureAsaasCustomerForStudent,
      resolveDojoAsaasCredentials,
    } = await import("@/lib/asaas/enrollment.server");

    // AMT Pay OFF (mode = "central") → todas as cobranças do dojo são manuais,
    // independentemente do que estiver marcado no plano. Coerção para "manual"
    // antes da validação para evitar bloqueio quando o dono ainda não ajustou
    // o plano após desativar o AMT Pay.
    const { data: profileForMode } = await context.supabase
      .from("dojo_academy_profile")
      .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status, trade_name")
      .eq("owner_id", ownerId(context))
      .maybeSingle();
    const amtPayMode = resolveDojoAsaasCredentials((profileForMode ?? {}) as any).mode;
    if (amtPayMode === "central") {
      methodCode = "manual";
    } else if (enabledMethods.length > 0 && !enabledMethods.includes(methodCode)) {
      throw new Error(`Método "${methodCode}" não está habilitado no plano.`);
    }

    // 3) Cria matrícula (base)
    const baseAmount = Number(data.custom_amount ?? plan.amount ?? 0);
    const fee = data.include_enrollment_fee ? Number((plan as any).enrollment_fee ?? 0) : 0;
    const firstDueDate = data.first_due_date ?? data.start_date;

    const { data: enrollRow, error: enrErr } = await context.supabase
      .from("dojo_enrollments")
      .insert({
        student_id: data.student_id,
        plan_id: data.plan_id,
        due_day: data.due_day,
        start_date: data.start_date,
        custom_amount: data.custom_amount ?? null,
        status: "active",
        payment_method_code: methodCode,
        owner_id: ownerId(context),
      } as never)
      .select("id")
      .single();
    if (enrErr) throw new Error(enrErr.message);

    // 4a) Fluxo GATEWAY (Asaas Subscription) — só quando AMT Pay ativo.
    if (amtPayMode !== "central" && isGatewayPaymentMethod(methodCode)) {

      // Carrega profile do dojo (para chave/subconta Asaas)
      const { data: profile } = await context.supabase
        .from("dojo_academy_profile")
        .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status, trade_name")
        .eq("owner_id", ownerId(context))
        .maybeSingle();

      const { apiKey, split } = resolveDojoAsaasCredentials((profile ?? {}) as any);

      try {
        // Garante Customer no Asaas
        const customerId = await ensureAsaasCustomerForStudent(
          context.supabase as any,
          student as any,
          apiKey,
        );

        // Cria Subscription
        const { asaasCreateSubscription } = await import("@/lib/asaas/client.server");
        const cycle = mapFrequencyToAsaasCycle((plan as any).frequency);
        const billingType = mapPaymentMethodToBillingType(methodCode);
        const description = `${(profile as any)?.trade_name ?? "Dojo"} — ${plan.name}`;

        const sub = await asaasCreateSubscription(
          {
            customer: customerId,
            billingType,
            value: baseAmount,
            nextDueDate: firstDueDate,
            cycle,
            description,
            externalReference: `dojo_enrollment:${enrollRow.id}`,
            split,
          },
          apiKey,
        );

        // Atualiza matrícula com id da subscription
        await context.supabase
          .from("dojo_enrollments")
          .update({
            asaas_subscription_id: sub.id,
            billing_type: billingType,
          } as never)
          .eq("id", enrollRow.id);

        // Se há taxa de matrícula, ela é lançada como fatura local separada
        // (Subscription do Asaas só emite valor recorrente).
        if (fee > 0) {
          const feePayload: any = {
            id: crypto.randomUUID(),
            student_id: data.student_id,
            enrollment_id: enrollRow.id,
            unit_id: (student as any).unit_id ?? null,
            description: `Taxa de matrícula — ${plan.name}`,
            amount: fee,
            due_date: firstDueDate,
            status: "pending",
            owner_id: ownerId(context),
          };
          const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
          const asaasData = await syncInvoiceWithAsaas(context.supabase as any, feePayload);
          Object.assign(feePayload, asaasData);
          await context.supabase.from("dojo_invoices").insert(feePayload as never);
        }

        return {
          enrollment_id: enrollRow.id,
          asaas_subscription_id: sub.id,
          billing_type: billingType,
          amount: baseAmount,
          message: "Assinatura criada no AMT Pay. As cobranças serão emitidas automaticamente e sincronizadas via webhook.",
        };
      } catch (e: any) {
        // Rollback matrícula se falhou criar subscription
        await context.supabase.from("dojo_enrollments").delete().eq("id", enrollRow.id);
        throw new Error(`Falha ao criar assinatura AMT Pay: ${e.message}`);
      }
    }

    // 4b) Fluxo MANUAL — cria 1ª fatura local pendente
    const amount = baseAmount + fee;
    const desc = fee > 0
      ? `Matrícula + 1ª mensalidade — ${plan.name}`
      : `1ª mensalidade — ${plan.name}`;
    const invPayload: any = {
        id: crypto.randomUUID(),
        student_id: data.student_id,
        enrollment_id: enrollRow.id,
        unit_id: (student as any).unit_id ?? null,
        description: desc,
        amount,
        due_date: firstDueDate,
        status: "pending",
        owner_id: ownerId(context),
      };
    const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
    const asaasData = await syncInvoiceWithAsaas(context.supabase as any, invPayload);
    Object.assign(invPayload, asaasData);

    const { data: invRow, error: invErr } = await context.supabase
      .from("dojo_invoices")
      .insert(invPayload as never)
      .select("id")
      .single();
    if (invErr) throw new Error(invErr.message);

    return {
      enrollment_id: enrollRow.id,
      invoice_id: invRow.id,
      amount,
      payment_url: invPayload.payment_link as string,
    };
  });

/**
 * Cancela uma matrícula: cancela a Subscription no Asaas (se houver)
 * e marca `status='canceled'`, `end_date=hoje`.
 */
export const cancelEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    enrollment_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: enr } = await context.supabase
      .from("dojo_enrollments")
      .select("id, asaas_subscription_id")
      .eq("id", data.enrollment_id)
      .maybeSingle();
    if (!enr) throw new Error("Matrícula não encontrada");

    if ((enr as any).asaas_subscription_id) {
      const { data: profile } = await context.supabase
        .from("dojo_academy_profile")
        .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status")
        .eq("owner_id", ownerId(context))
        .maybeSingle();
      const { resolveDojoAsaasCredentials } = await import("@/lib/asaas/enrollment.server");
      const { apiKey } = resolveDojoAsaasCredentials((profile ?? {}) as any);
      const { asaasCancelSubscription } = await import("@/lib/asaas/client.server");
      await asaasCancelSubscription((enr as any).asaas_subscription_id, apiKey);
    }

    const today = todayISO();
    const { error } = await context.supabase
      .from("dojo_enrollments")
      .update({ status: "canceled", end_date: today } as never)
      .eq("id", data.enrollment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Troca o plano de um aluno.
 *
 * Regra: o novo valor entra em vigor a partir da PRÓXIMA cobrança. Faturas
 * já emitidas (do ciclo atual) permanecem inalteradas — o aluno honra o
 * valor que já foi cobrado. A partir do próximo ciclo, o gerador de faturas
 * usa o `custom_amount`/`plan.amount` da nova matrícula.
 */
export const changeStudentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    student_id: z.string().uuid(),
    plan_id: z.string().uuid(),
    due_day: z.number().int().min(1).max(31),
    start_date: z.string(),
    custom_amount: z.number().min(0).nullable().optional(),
    next_billing_date: z.string().optional(),
    notes: z.string().max(500).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: plan, error: planErr } = await context.supabase
      .from("dojo_plans")
      .select("id, name, amount, frequency, custom_months")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (planErr) throw new Error(planErr.message);
    if (!plan) throw new Error("Plano não encontrado");

    // Cancela matrículas ativas (preserva histórico)
    const { data: actives } = await context.supabase
      .from("dojo_enrollments")
      .select("id, asaas_subscription_id, plan_id")
      .eq("student_id", data.student_id)
      .eq("owner_id", ownerId(context))
      .in("status", ["active", "paused"]);

    const today = todayISO();
    if (actives && actives.length > 0) {
      const { data: profile } = await context.supabase
        .from("dojo_academy_profile")
        .select("asaas_subaccount_id, asaas_api_key_encrypted, asaas_wallet_id, asaas_onboarding_status")
        .eq("owner_id", ownerId(context))
        .maybeSingle();

      for (const enr of actives as any[]) {
        if (enr.plan_id === data.plan_id) {
          throw new Error("O aluno já possui uma matrícula ativa neste plano.");
        }
        if (enr.asaas_subscription_id) {
          try {
            const { resolveDojoAsaasCredentials } = await import("@/lib/asaas/enrollment.server");
            const { apiKey } = resolveDojoAsaasCredentials((profile ?? {}) as any);
            const { asaasCancelSubscription } = await import("@/lib/asaas/client.server");
            await asaasCancelSubscription(enr.asaas_subscription_id, apiKey);
          } catch (err) {
            console.warn("[changeStudentPlan] falha ao cancelar subscription AMT Pay", err);
          }
        }
        await context.supabase
          .from("dojo_enrollments")
          .update({ status: "canceled", end_date: today } as never)
          .eq("id", enr.id);
      }
    }

    // Calcula próxima data de cobrança se não informada
    const startISO = data.start_date;
    let nextRunAt = data.next_billing_date;
    if (!nextRunAt) {
      const [sy, sm] = startISO.split("-").map(Number);
      const startDay = Number(startISO.slice(8, 10));
      const daysInStartMonth = new Date(Date.UTC(sy, sm, 0)).getUTCDate();
      const dueDayThisMonth = Math.min(data.due_day, daysInStartMonth);
      const targetMonthOffset = startDay > dueDayThisMonth ? 1 : 0;
      const targetMonthIndex = (sm - 1) + targetMonthOffset;
      const daysInTargetMonth = new Date(Date.UTC(sy, targetMonthIndex + 1, 0)).getUTCDate();
      const dueDay = Math.min(data.due_day, daysInTargetMonth);
      const dt = new Date(Date.UTC(sy, targetMonthIndex, dueDay));
      nextRunAt = dt.toISOString().slice(0, 10);
    }

    const freqMap: Record<string, string> = {
      monthly: "monthly",
      bimonthly: "bimonthly",
      quarterly: "quarterly",
      quadrimestral: "custom",
      semiannual: "semiannual",
      annual: "annual",
      custom: "custom",
    };
    const enrollFrequency = freqMap[(plan as any).frequency ?? "monthly"] ?? "monthly";
    const customDays = enrollFrequency === "custom"
      ? Math.max(30, Number((plan as any).custom_months ?? 1) * 30)
      : null;

    const { data: row, error } = await context.supabase
      .from("dojo_enrollments")
      .insert({
        student_id: data.student_id,
        plan_id: data.plan_id,
        custom_amount: data.custom_amount ?? null,
        due_day: data.due_day,
        start_date: startISO,
        status: "active",
        frequency: enrollFrequency,
        custom_days: customDays,
        next_run_at: nextRunAt,
        notes: data.notes ?? null,
        owner_id: ownerId(context),
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Notifica o aluno da alteração de plano
    try {
      const { safeNotifyStudent } = await import("@/lib/push/push.server");
      safeNotifyStudent(data.student_id, {
        title: "Plano alterado",
        body: `Seu plano foi atualizado para ${(plan as any).name}. Novo valor entra em vigor na próxima cobrança.`,
        url: "/app/plan",
        tag: `plan-change-${(row as any).id}`,
        data: { enrollmentId: (row as any).id, type: "plan_change" },
      }, "plan_change");
    } catch (e) {
      console.warn("[changeStudentPlan] push falhou", e);
    }

    return {
      enrollment_id: (row as any).id,
      next_billing_date: nextRunAt,
      amount: data.custom_amount ?? Number((plan as any).amount ?? 0),
      message: "Plano alterado. O novo valor entrará em vigor na próxima cobrança.",
    };
  });





export const generateMonthlyInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    reference_month: z.string(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: enrolls, error } = await context.supabase
      .from("dojo_enrollments")
      .select("id, student_id, due_day, custom_amount, asaas_subscription_id, plan:dojo_plans(amount), student:dojo_students(unit_id)")
      .eq("status", "active")
      .is("asaas_subscription_id", null);
    if (error) throw new Error(error.message);
    const [y, m] = data.reference_month.split("-").map(Number);
    let created = 0;
    for (const e of (enrolls ?? []) as any[]) {
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const dueDay = Math.min(e.due_day ?? 5, daysInMonth);
      const dueDate = utcCalendarISO(new Date(Date.UTC(y, m - 1, dueDay)));
      const amount = e.custom_amount ?? e.plan?.amount ?? 0;
      const monthStart = `${data.reference_month}-01`;
      const nextMonth = utcCalendarISO(new Date(Date.UTC(y, m, 1)));
      const { data: existing } = await context.supabase.from("dojo_invoices")
        .select("id").eq("enrollment_id", e.id).gte("due_date", monthStart).lt("due_date", nextMonth).maybeSingle();
      if (existing) continue;
      const invPayload: any = {
        id: crypto.randomUUID(),
        student_id: e.student_id,
        enrollment_id: e.id,
        unit_id: e.student?.unit_id ?? null,
        description: `Mensalidade ${data.reference_month}`,
        amount,
        due_date: dueDate,
        status: "pending",
        owner_id: ownerId(context),
      };
      const { syncInvoiceWithAsaas } = await import("@/lib/asaas/enrollment.server");
      const asaasData = await syncInvoiceWithAsaas(context.supabase as any, invPayload);
      Object.assign(invPayload, asaasData);
      const { error: insErr } = await context.supabase.from("dojo_invoices").insert(invPayload);
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
    recurrence: z.enum(["none","monthly","quarterly","yearly"]).optional(),
    installments: z.number().int().min(1).max(60).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, recurrence, installments, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("dojo_expenses").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const rec = recurrence ?? "none";
    const count = rec === "none" ? 1 : Math.max(1, installments ?? 12);
    if (count <= 1) {
      const { data: row, error } = await context.supabase.from("dojo_expenses").insert({ ...rest, owner_id: ownerId(context) }).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id, created: 1 };
    }
    const monthsStep = rec === "monthly" ? 1 : rec === "quarterly" ? 3 : 12;
    // Meio-dia UTC + métodos UTC evitam qualquer deslocamento de fuso ao repetir a data.
    const base = new Date(rest.due_date + "T12:00:00Z");
    const rows = Array.from({ length: count }, (_, idx) => {
      const d = new Date(base);
      d.setUTCMonth(d.getUTCMonth() + monthsStep * idx);
      return { ...rest, due_date: d.toISOString().slice(0, 10), owner_id: ownerId(context) };
    });

    const { error } = await context.supabase.from("dojo_expenses").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
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
    const from = data.from ?? calendarISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = data.to ?? calendarISO(new Date(now.getFullYear(), now.getMonth()+1, 0));
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
    pdf_url: z.string().url().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("dojo_certificates").insert({
      student_id: data.student_id,
      graduation_id: data.graduation_id ?? null,
      template_id: data.template_id,
      values: data.values,
      pdf_url: data.pdf_url ?? null,
      owner_id: ownerId(context),
    }).select("*").single();
    if (error) throw new Error(error.message);
    try {
      const { safeNotifyStudent } = await import("@/lib/push/push.server");
      safeNotifyStudent(data.student_id, {
        title: "Certificado disponível 🎓",
        body: "Seu novo certificado foi emitido. Toque para visualizar e baixar.",
        url: "/app/certificados",
        tag: `certificate-${row.id}`,
      }, "contract");
    } catch {}
    return row;
  });

// ============ ISSUED CERTIFICATES (Phase 2) ============
const uuidRx = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const listIssuedCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_certificates")
      .select("*, student:dojo_students(id, full_name, photo_url), template:dojo_certificate_templates(id, name, category), graduation:dojo_graduations(graduation_date, degree, belt:dojo_belts(name, modality))")
      .order("issued_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteIssuedCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(uuidRx, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_certificates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateIssuedCertificatePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(uuidRx, "UUID inválido"),
    pdf_url: z.string().url().max(2000),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_certificates")
      .update({ pdf_url: data.pdf_url })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCertificateIssueContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().regex(uuidRx, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const [s, a, g] = await Promise.all([
      context.supabase.from("dojo_students")
        .select("*, belt:dojo_belts(name,modality,color_hex,stripe_hex,max_degrees,visual,variants)")
        .eq("id", data.student_id).maybeSingle(),
      context.supabase.from("dojo_academy_profile").select("*").eq("owner_id", context.userId).maybeSingle(),
      context.supabase.from("dojo_graduations")
        .select("*, belt:dojo_belts(name,modality,color_hex,stripe_hex,max_degrees,visual,variants)")
        .eq("student_id", data.student_id)
        .order("graduation_date", { ascending: false })
        .limit(1).maybeSingle(),
    ]);
    return { student: s.data, academy: a.data, latest_graduation: g.data };
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
      price_by_belt: {},
    };
  });

export const saveGraduationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    system: z.enum(["merit", "classes", "period"]),
    classes_by_belt: z.record(z.string(), z.number()).optional(),
    period_months_by_belt: z.record(z.string(), z.number()).optional(),
    price_by_belt: z.record(z.string(), z.number().min(0).max(1_000_000)).optional(),
    default_classes: z.number().int().min(0).max(10000).optional(),
    default_period_months: z.number().int().min(0).max(240).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      owner_id: ownerId(context),
      system: data.system,
      classes_by_belt: data.classes_by_belt ?? {},
      period_months_by_belt: data.period_months_by_belt ?? {},
      price_by_belt: data.price_by_belt ?? {},
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
  .inputValidator((i: unknown) => {
    const uuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido");
    return z.object({
      // Legado: mesma faixa/grau para todos
      student_ids: z.array(uuid).min(1).optional(),
      belt_id: uuid.optional(),
      degree: z.number().int().min(0).max(10).optional(),
      // Novo: graduação individual por aluno
      items: z.array(z.object({
        student_id: uuid,
        belt_id: uuid,
        degree: z.number().int().min(0).max(10).default(0),
        fee_amount: z.number().min(0).max(1_000_000).optional().nullable(),
        paid: z.boolean().optional(),
      })).optional(),
      graduation_date: z.string(),
      evaluator: z.string().max(200).optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
    }).refine(v => (v.items && v.items.length > 0) || (v.student_ids && v.belt_id), {
      message: "Informe items[] ou student_ids + belt_id",
    }).parse(i);
  })
  .handler(async ({ data, context }) => {
    const items = data.items && data.items.length > 0
      ? data.items
      : (data.student_ids ?? []).map(sid => ({
          student_id: sid,
          belt_id: data.belt_id!,
          degree: data.degree ?? 0,
          fee_amount: null as number | null | undefined,
          paid: false as boolean | undefined,
        }));

    // Buscar preços padrão por faixa
    const { data: settingsRow } = await context.supabase
      .from("dojo_graduation_settings")
      .select("price_by_belt")
      .eq("owner_id", ownerId(context))
      .maybeSingle();
    const priceByBelt: Record<string, number> = ((settingsRow as any)?.price_by_belt ?? {}) as Record<string, number>;

    // Data da cerimônia no futuro => graduação AGENDADA: a faixa do aluno só
    // muda e o push de parabéns só é enviado no dia selecionado (cron horário
    // em /api/public/hooks/apply-scheduled-graduations).
    const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const isScheduled = String(data.graduation_date).slice(0, 10) > todayISO;

    const rows = items.map(it => {
      const fee = it.fee_amount != null ? Number(it.fee_amount) : Number(priceByBelt[it.belt_id] ?? 0);
      return {
        student_id: it.student_id,
        belt_id: it.belt_id,
        degree: it.degree,
        graduation_date: data.graduation_date,
        evaluator: data.evaluator ?? null,
        notes: data.notes ?? null,
        owner_id: ownerId(context),
        fee_amount: fee > 0 ? fee : null,
        applied_at: isScheduled ? null : new Date().toISOString(),
      };
    });
    const { data: inserted, error } = await context.supabase
      .from("dojo_graduations").insert(rows).select("id, student_id, belt_id, degree, fee_amount");
    if (error) throw new Error(error.message);


    // Modality-aware overwrite por aluno + info da faixa (para descrição da cobrança).
    const beltIds = Array.from(new Set(items.map(i => i.belt_id)));
    const studentIds = Array.from(new Set(items.map(i => i.student_id)));
    const [{ data: beltRows }, { data: studentsRows }] = await Promise.all([
      context.supabase.from("dojo_belts").select("id, name, modality").in("id", beltIds),
      context.supabase
        .from("dojo_students")
        .select("id, full_name, current_belt_id, belt:dojo_belts(modality)")
        .in("id", studentIds),
    ]);
    const beltById = new Map<string, any>();
    for (const b of (beltRows ?? []) as any[]) beltById.set(b.id, b);
    const studentById = new Map<string, any>();
    for (const s of (studentsRows ?? []) as any[]) studentById.set(s.id, s);

    // Pré-carrega a última graduação por modalidade de cada aluno para
    // garantir que somente a graduação MAIS RECENTE substitui a faixa atual.
    const { data: existingGrads } = await context.supabase
      .from("dojo_graduations")
      .select("student_id, graduation_date, belt:dojo_belts(modality)")
      .in("student_id", studentIds);
    const latestByStudentMod = new Map<string, string>();
    for (const g of (existingGrads as any[]) ?? []) {
      const mod = g?.belt?.modality ?? "jiu-jitsu";
      const key = `${g.student_id}::${mod}`;
      const cur = latestByStudentMod.get(key);
      if (!cur || new Date(g.graduation_date) > new Date(cur)) {
        latestByStudentMod.set(key, g.graduation_date);
      }
    }

    if (!isScheduled) {
      for (const it of items) {
        const s = studentById.get(it.student_id);
        if (!s) continue;
        const currentMod = (s as any).belt?.modality ?? null;
        const newMod = beltById.get(it.belt_id)?.modality ?? "jiu-jitsu";
        const latest = latestByStudentMod.get(`${it.student_id}::${newMod}`) ?? null;
        const isMostRecent = !latest || new Date(data.graduation_date) >= new Date(latest);
        if ((!s.current_belt_id || currentMod === null || currentMod === newMod) && isMostRecent) {
          await context.supabase
            .from("dojo_students")
            .update({ current_belt_id: it.belt_id, current_degree: it.degree })
            .eq("id", it.student_id);
        }
      }
    }


    // Gera contas a receber (dojo_invoices) para graduações com valor > 0.
    const paidByStudent = new Map<string, boolean>();
    for (const it of items) paidByStudent.set(it.student_id, !!it.paid);

    const invoicesCreated: Array<{ graduation_id: string; invoice_id: string; amount: number; status: string }> = [];
    for (const g of (inserted ?? []) as any[]) {
      const fee = Number(g.fee_amount ?? 0);
      if (!fee || fee <= 0) continue;
      const belt = beltById.get(g.belt_id);
      const isPaid = paidByStudent.get(g.student_id) === true;
      const { data: inv, error: invErr } = await context.supabase
        .from("dojo_invoices")
        .insert({
          student_id: g.student_id,
          owner_id: ownerId(context),
          amount: fee,
          due_date: data.graduation_date,
          description: `Taxa de graduação — ${belt?.name ?? "Faixa"}`,
          status: isPaid ? "paid" : "pending",
          paid_at: isPaid ? new Date().toISOString() : null,
          source: "other",
        })
        .select("id, status")
        .single();
      if (invErr) throw new Error(invErr.message);
      await context.supabase
        .from("dojo_graduations")
        .update({ invoice_id: inv.id })
        .eq("id", g.id);
      invoicesCreated.push({ graduation_id: g.id, invoice_id: inv.id, amount: fee, status: inv.status });
    }

    // Notifica cada aluno graduado (push) — graduação + cobrança.
    // IMPORTANTE: aguardamos o envio antes de retornar. Em runtime serverless
    // (Cloudflare Workers) promessas fire-and-forget são canceladas ao final
    // da requisição, o que fazia a push nunca sair.
    try {
      const { sendPushToStudent } = await import("@/lib/push/push.server");
      const amountFmt = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
      const invoiceByGrad = new Map(invoicesCreated.map(i => [i.graduation_id, i]));
      const tasks: Promise<unknown>[] = [];
      for (const g of (inserted ?? []) as any[]) {
        const belt = beltById.get(g.belt_id);
        const degreeTxt = typeof g.degree === "number" && g.degree > 0 ? ` — ${g.degree}º grau` : "";
        // Graduação agendada: o push de parabéns sai somente na data da cerimônia.
        if (!isScheduled) {
          tasks.push(sendPushToStudent(g.student_id, {
            title: "Parabéns pela graduação! 🥋",
            body: `Você foi graduado(a): ${belt?.name ?? "Nova faixa"}${degreeTxt}.`,
            url: "/app/graduacoes",
            tag: `graduation-${g.id}`,
          }, "graduation"));
        }


        const inv = invoiceByGrad.get(g.id);
        if (inv && inv.status !== "paid") {
          tasks.push(sendPushToStudent(g.student_id, {
            title: "Nova cobrança disponível",
            body: `Taxa de graduação — ${belt?.name ?? "Faixa"} • ${amountFmt(inv.amount)}${data.graduation_date ? ` • vence em ${new Date(data.graduation_date + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}`,
            url: "/app/financeiro",
            tag: `invoice-${inv.invoice_id}`,
          }, "invoice_due_soon"));
        }
      }
      await Promise.allSettled(tasks);
    } catch (err) {
      console.warn("[bulkAddDojoGraduations] push falhou:", (err as any)?.message ?? err);
    }

    return { count: inserted?.length ?? 0, graduations: inserted ?? [], invoices: invoicesCreated };
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
      .select("*, belt:dojo_belts!dojo_evaluations_belt_id_fkey(name,color_hex,stripe_hex,max_degrees,modality,visual,variants)")
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

// ============ BULK IMPORT STUDENTS ============
const bulkStudentRow = z.object({
  full_name: z.string().min(1).max(200),
  cpf: z.string().max(20).optional().nullable(),
  rg: z.string().max(30).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  gender: z.string().max(30).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  address_number: z.string().max(20).optional().nullable(),
  neighborhood: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  guardian_name: z.string().max(200).optional().nullable(),
  guardian_phone: z.string().max(40).optional().nullable(),
  emergency_contact_name: z.string().max(200).optional().nullable(),
  emergency_contact_phone: z.string().max(40).optional().nullable(),
  emergency_contact_relationship: z.string().max(60).optional().nullable(),
  blood_type: z.string().max(10).optional().nullable(),
  profession: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["active", "inactive", "frozen"]).optional(),
});

export const bulkImportDojoStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ rows: z.array(bulkStudentRow).min(1).max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const owner = ownerId(context);
    const results: { inserted: number; errors: Array<{ index: number; full_name: string; message: string }> } = {
      inserted: 0,
      errors: [],
    };
    for (let idx = 0; idx < data.rows.length; idx++) {
      const raw = data.rows[idx];
      const payload: any = { ...raw, owner_id: owner, status: raw.status ?? "active" };
      if (payload.email === "") payload.email = null;
      if (payload.birth_date === "") payload.birth_date = null;
      Object.keys(payload).forEach((k) => (payload[k] === undefined || payload[k] === "") && delete payload[k]);
      const { error } = await context.supabase.from("dojo_students").insert(payload);
      if (error) {
        results.errors.push({ index: idx + 2, full_name: raw.full_name, message: error.message });
      } else {
        results.inserted++;
      }
    }
    return results;
  });

export const addStudentReferencePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    studentId: z.string().uuid(),
    photoUrl: z.string().url()
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_student_reference_photos")
      .insert({
        student_id: data.studentId,
        photo_url: data.photoUrl,
        owner_id: context.userId
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStudentReferencePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_student_reference_photos")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
