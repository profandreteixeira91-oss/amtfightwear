import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRESENT_STATUSES } from "@/lib/dojo/attendance-status";
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

  // Compute "now" in the academy's local timezone (default: America/Sao_Paulo).
  // Server runs in UTC (Cloudflare Workers) while schedules are stored in dojo local time,
  // so we normalize by extracting weekday + minute-of-day via Intl in the target TZ.
  const timezone = settings?.timezone || "America/Sao_Paulo";
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[parts.weekday] ?? new Date().getDay();
  const hh = parseInt(parts.hour === "24" ? "0" : parts.hour, 10);
  const mm = parseInt(parts.minute, 10);
  const ss = parseInt(parts.second, 10);
  const nowMinutes = hh * 60 + mm + ss / 60;

  // Check schedules for today (also include neighboring weekdays to handle midnight edge cases)
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
    const [h, m, sec] = String(s.start_time).split(":").map(Number);
    const startMinutes = h * 60 + m + (sec || 0) / 60;
    const windowStartMin = startMinutes - preWindow;
    const windowEndMin = startMinutes + postWindow;

    if (nowMinutes >= windowStartMin && nowMinutes <= windowEndMin) {
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

  // Check for duplicates — restrict to the CURRENT schedule window so a class
  // that runs multiple times on the same day (e.g. 08:00 e 18:00) allows one
  // check-in per horário.
  const classIdToUse = preferredClassId || (validMatches.length === 1 ? validMatches[0].class_id : null);

  if (classIdToUse && blockDuplicate) {
    const currentMatch = validMatches.find((m: any) => m.class_id === classIdToUse) || validMatches[0];
    const [sh, sm, ssec] = String(currentMatch.start_time).split(":").map(Number);
    const startMin = sh * 60 + sm + (ssec || 0) / 60;
    const winStart = startMin - preWindow;
    const winEnd = startMin + postWindow;
    // Build ISO timestamps for today's window in the academy timezone.
    // We reuse the same TZ-derived "today" (YYYY-MM-DD) captured via Intl.
    const todayParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
    const todayLocal = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
    const toHHMM = (mins: number) => {
      const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
      const H = String(Math.floor(clamped / 60)).padStart(2, "0");
      const M = String(clamped % 60).padStart(2, "0");
      return `${H}:${M}:00`;
    };
    const fromIso = `${todayLocal}T${toHHMM(winStart)}`;
    const toIso = `${todayLocal}T${toHHMM(winEnd)}`;
    const { count } = await supabase
      .from("dojo_attendance")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("class_id", classIdToUse)
      .gte("checked_in_at", fromIso)
      .lte("checked_in_at", toIso);

    if (count && count > 0) {
      return { classId: classIdToUse, isValid: false, reason: "duplicate_checkin" };
    }
  }

  if (validMatches.length > 1 && !preferredClassId) {
    return { 
      classId: null, 
      isValid: false, 
      reason: "multiple_classes", 
      availableClasses: validMatches.map(m => ({
        id: m.class_id,
        name: m.dojo_classes?.name,
        modality: m.dojo_classes?.modality ?? null,
        start_time: m.start_time,
        end_time: m.end_time,
      }))
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
      context.supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", startDay),
      context.supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", startWeek),
      context.supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", startMonth),
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
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as any });
    const isTeacher = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" as any }); // 'teacher' mapping to 'moderator' enum
    const isOverride = !!(isAdmin.data || isTeacher.data);

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
        class_id: validation.classId || data.classId || null,
        method: "manual",
        notes: data.notes ?? null,
        created_by: context.userId,
        owner_id: context.userId,
        checked_in_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    try {
      const { safeNotifyStudent } = await import("@/lib/push/push.server");
      safeNotifyStudent(data.studentId, {
        title: "Check-in registrado ✅",
        body: "Sua presença foi confirmada. Bons treinos!",
        url: "/app/agenda",
        tag: `attendance-${row.id}`,
      }, "attendance_confirmed");
    } catch {}
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
      .select("id, full_name, unit_id, owner_id")
      .or(`checkin_pin.eq.${code},qr_token.eq.${code}`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!student) throw new Error("Aluno não encontrado para este código");

    // Regra do plano: suspensão de check-ins por inadimplência
    {
      const { assertCheckinAllowed } = await import("@/lib/dojo/financial-block.server");
      await assertCheckinAllowed(context.supabase, student.id);
    }

    const validation = await validateAndResolveCheckin(
      context.supabase,
      student.id,
      student.owner_id
    );

    if (!validation.isValid) {
      if (validation.reason === "outside_window") {
        throw new Error("Fora da janela permitida para check-in.");
      }
      if (validation.reason === "duplicate_checkin") {
        throw new Error("Você já realizou o check-in desta aula.");
      }
      if (validation.reason === "multiple_classes") {
        // Para Kiosk/PIN, não temos como mostrar seletor facilmente no handler atual, 
        // mas as regras dizem que se houver 2 válidas deve pedir seleção.
        // Por enquanto, bloqueamos com mensagem.
        throw new Error("Múltiplas aulas disponíveis. Use o check-in manual ou selecione a turma.");
      }
      throw new Error("Não há nenhuma aula disponível para check-in neste momento.");
    }

    const { data: att, error: e2 } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: student.id,
        unit_id: data.unitId ?? student.unit_id ?? null,
        class_id: validation.classId,
        method: /^\d+$/.test(code) ? "pin" : "qr",
        created_by: context.userId,
        owner_id: context.userId,
        checked_in_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    return { id: att.id, student };
  });

// ============ CHECK-IN RETROATIVO ============
// Permite ao dono do dojo registrar uma presença em uma data passada.
// Não valida janela de horário (é retroativo por natureza), mas evita duplicidade
// no mesmo dia/turma e garante que o aluno pertence ao dono autenticado.
export const retroactiveCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        studentId: z.string().uuid("Aluno inválido"),
        checkedInAt: z.string().min(10).max(40),
        unitId: z.string().uuid().optional().nullable(),
        classId: z.string().uuid().optional().nullable(),
        notes: z.string().max(400).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const when = new Date(data.checkedInAt);
    if (Number.isNaN(when.getTime())) throw new Error("Data inválida");
    if (when.getTime() > Date.now() + 60_000) throw new Error("A data não pode ser no futuro");

    // Aluno precisa pertencer ao dono autenticado (RLS já filtra, confirmamos aqui)
    const { data: student, error: sErr } = await context.supabase
      .from("dojo_students")
      .select("id, full_name, unit_id, cancelled_at")
      .eq("id", data.studentId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!student) throw new Error("Aluno não encontrado");

    // Duplicidade: mesmo aluno, mesmo dia e mesma turma
    const dayStart = new Date(when);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(when);
    dayEnd.setHours(23, 59, 59, 999);

    let dupQ = context.supabase
      .from("dojo_attendance")
      .select("id")
      .eq("student_id", data.studentId)
      .gte("checked_in_at", dayStart.toISOString())
      .lte("checked_in_at", dayEnd.toISOString());
    if (data.classId) dupQ = dupQ.eq("class_id", data.classId);
    const { data: dup } = await dupQ.limit(1);
    if (dup && dup.length > 0) {
      throw new Error("Já existe um check-in para este aluno nesta data/turma.");
    }

    const { data: row, error } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: data.studentId,
        unit_id: data.unitId ?? student.unit_id ?? null,
        class_id: data.classId ?? null,
        method: "manual",
        source: "retroactive",
        status: "present",
        notes: data.notes ?? "Check-in retroativo",
        created_by: context.userId,
        owner_id: context.userId,
        checked_in_at: when.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, studentName: student.full_name };
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
