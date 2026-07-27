import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function randomToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// Resolve which class a check-in belongs to, validation rules included.
export async function validateAndResolveCheckin(
  supabase: any,
  studentId: string,
  ownerId: string,
  isOverride = false,
  preferredClassId?: string | null,
): Promise<{ 
  classId: string | null; 
  isValid: boolean; 
  reason?: string; 
  availableClasses?: any[];
  windowMins?: { pre: number; post: number };
}> {
  // Load settings
  const { data: settings } = await supabase
    .from("dojo_checkin_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  const preWindow = settings?.checkin_window_pre_mins ?? 10;
  const postWindow = settings?.checkin_window_post_mins ?? 30;
  const blockDuplicate = settings?.block_duplicate_checkin ?? true;

  // Student enrollments
  const { data: enrolls } = await supabase
    .from("dojo_class_students")
    .select("class_id")
    .eq("student_id", studentId)
    .eq("status", "active");
  
  const classIds = (enrolls ?? []).map((r: any) => r.class_id).filter(Boolean);
  if (classIds.length === 0) {
    return { classId: null, isValid: false, reason: "student_not_enrolled" };
  }

  // Get current time in UTC/Local server context
  const now = new Date();
  const weekday = now.getDay();
  
  // We need to check all schedules for these classes today
  const { data: schedules } = await supabase
    .from("dojo_class_schedules")
    .select("class_id, start_time, end_time, weekday, dojo_classes(name, modality)")
    .in("class_id", classIds)
    .eq("weekday", weekday);

  if (!schedules || schedules.length === 0) {
    return { classId: null, isValid: false, reason: "no_classes_today" };
  }

  const validMatches: any[] = [];
  
  for (const s of schedules) {
    // Parse HH:MM:SS to date for comparison
    const [h, m, sec] = s.start_time.split(":").map(Number);
    const start = new Date(now);
    start.setHours(h, m, sec || 0, 0);
    
    const windowStart = new Date(start.getTime() - preWindow * 60000);
    const windowEnd = new Date(start.getTime() + postWindow * 60000);

    if (now >= windowStart && now <= windowEnd) {
      validMatches.push(s);
    }
  }

  if (validMatches.length === 0) {
    return { 
      classId: null, 
      isValid: isOverride, 
      reason: "outside_window",
      windowMins: { pre: preWindow, post: postWindow }
    };
  }

  // Check for duplicates in the current window
  const classIdToUse = preferredClassId || (validMatches.length === 1 ? validMatches[0].class_id : null);
  
  if (classIdToUse && blockDuplicate) {
    const today = now.toISOString().split("T")[0];
    const { count } = await supabase
      .from("dojo_attendance")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("class_id", classIdToUse)
      .gte("checked_in_at", `${today}T00:00:00`)
      .lte("checked_in_at", `${today}T23:59:59`);
    
    if (count && count > 0) {
      return { classId: classIdToUse, isValid: false, reason: "duplicate_checkin" };
    }
  }

  if (validMatches.length > 1 && !preferredClassId) {
    return { 
      classId: null, 
      isValid: false, 
      reason: "multiple_classes", 
      availableClasses: validMatches.map(m => ({ id: m.class_id, name: m.dojo_classes?.name }))
    };
  }

  return { classId: classIdToUse, isValid: true };
}

// Keep legacy export but proxy it to avoid breaking other files temporarily
export async function resolveClassForCheckin(
  supabase: any,
  studentId: string,
): Promise<string | null> {
  const { data: student } = await supabase.from("dojo_students").select("owner_id").eq("id", studentId).single();
  const res = await validateAndResolveCheckin(supabase, studentId, student?.owner_id);
  return res.classId;
}

// ============ ATTENDANCE ============
export const listAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        unitId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
        studentId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_attendance")
      .select("*, dojo_students(id, full_name), dojo_units(id, name)")
      .order("checked_in_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.unitId) q = q.eq("unit_id", data.unitId);
    if (data.studentId) q = q.eq("student_id", data.studentId);
    if (data.from) q = q.gte("checked_in_at", data.from);
    if (data.to) q = q.lte("checked_in_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const attendanceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [d, w, m] = await Promise.all([
      context.supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).gte("checked_in_at", startDay),
      context.supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).gte("checked_in_at", startWeek),
      context.supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).gte("checked_in_at", startMonth),
    ]);
    return { today: d.count ?? 0, week: w.count ?? 0, month: m.count ?? 0 };
  });

export const manualCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        studentId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
        unitId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
        classId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
        notes: z.string().max(400).optional().nullable(),
        force: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const isTeacher = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "teacher" });
    const isOverride = isAdmin.data || isTeacher.data;

    const validation = await validateAndResolveCheckin(
      context.supabase,
      data.studentId,
      context.userId,
      isOverride,
      data.classId
    );

    if (!validation.isValid && !data.force) {
      if (validation.reason === "outside_window") {
        throw new Error("OUTSIDE_WINDOW");
      }
      if (validation.reason === "multiple_classes") {
        return { error: "MULTIPLE_CLASSES", availableClasses: validation.availableClasses };
      }
      if (validation.reason === "duplicate_checkin") {
        throw new Error("Você já realizou o check-in desta aula.");
      }
      throw new Error("Não há nenhuma aula disponível para check-in neste momento.");
    }

    const { data: row, error } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: data.studentId,
        unit_id: data.unitId ?? null,
        class_id: validation.classId,
        method: "manual",
        notes: data.notes ?? null,
        created_by: context.userId,
        owner_id: context.userId,
        validation_result: validation.isValid ? "success" : "override",
        rejection_reason: validation.isValid ? null : validation.reason,
        validation_metadata: { force: !!data.force, original_reason: validation.reason }
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const checkinByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        code: z.string().min(4).max(64),
        unitId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const code = data.code.trim();
    const { data: student, error } = await context.supabase
      .from("dojo_students")
      .select("id, full_name, unit_id")
      .or(`checkin_pin.eq.${code},qr_token.eq.${code}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!student) throw new Error("Aluno não encontrado para este código");

    const { data: att, error: e2 } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: student.id,
        unit_id: data.unitId ?? student.unit_id ?? null,
        class_id: await resolveClassForCheckin(context.supabase, student.id),
        method: /^\d+$/.test(code) ? "pin" : "qr",
        created_by: context.userId,
        owner_id: context.userId,
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    return { id: att.id, student };
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_attendance").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ STUDENT CODES ============
export const regenerateStudentCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      studentId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
      resetPin: z.boolean().optional(),
      resetQr: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch: { checkin_pin?: string; qr_token?: string } = {};
    if (data.resetPin !== false) patch.checkin_pin = randomPin();
    if (data.resetQr !== false) patch.qr_token = randomToken();
    const { error } = await context.supabase
      .from("dojo_students")
      .update(patch as any)
      .eq("id", data.studentId);

    if (error) throw new Error(error.message);
    return patch;
  });

// ============ PARTNER INTEGRATIONS ============
export const listPartnerIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_partner_integrations")
      .select("*")
      .order("provider");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePartnerIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: z.enum(["gympass", "totalpass"]),
      enabled: z.boolean().optional(),
      apiKeyHint: z.string().max(80).optional().nullable(),
      webhookSecret: z.string().max(200).optional().nullable(),
      unitId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
      config: z.record(z.string(), z.any()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      provider: data.provider,
      enabled: data.enabled ?? false,
      api_key_hint: data.apiKeyHint ?? null,
      webhook_secret: data.webhookSecret ?? null,
      unit_id: data.unitId ?? null,
      config: (data.config ?? {}) as any,
      owner_id: context.userId,
    };
    const { error } = await context.supabase
      .from("dojo_partner_integrations")
      .upsert(payload as any, { onConflict: "owner_id,provider" });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPartnerCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_partner_checkins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
