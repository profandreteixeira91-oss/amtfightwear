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

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function randomToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// ============ ATTENDANCE ============
export const listAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        unitId: z.string().uuid().optional(),
        studentId: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
    await assertAdmin(context);
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
        studentId: z.string().uuid(),
        unitId: z.string().uuid().optional().nullable(),
        notes: z.string().max(400).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: data.studentId,
        unit_id: data.unitId ?? null,
        method: "manual",
        notes: data.notes ?? null,
        created_by: context.userId,
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
        unitId: z.string().uuid().optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
        method: /^\d+$/.test(code) ? "pin" : "qr",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    return { id: att.id, student };
  });

export const deleteAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("dojo_attendance").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ STUDENT CODES ============
export const regenerateStudentCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      studentId: z.string().uuid(),
      resetPin: z.boolean().optional(),
      resetQr: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
    await assertAdmin(context);
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
      unitId: z.string().uuid().optional().nullable(),
      config: z.record(z.any()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      provider: data.provider,
      enabled: data.enabled ?? false,
      api_key_hint: data.apiKeyHint ?? null,
      webhook_secret: data.webhookSecret ?? null,
      unit_id: data.unitId ?? null,
      config: data.config ?? {},
    };
    const { error } = await context.supabase
      .from("dojo_partner_integrations")
      .upsert(payload, { onConflict: "provider" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPartnerCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("dojo_partner_checkins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
