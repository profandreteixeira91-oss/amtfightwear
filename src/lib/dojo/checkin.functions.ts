import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Search students ----------
export const searchStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ q: z.string().min(1).max(80), limit: z.number().int().min(1).max(30).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    const like = `%${q}%`;
    const { data: rows, error } = await context.supabase
      .from("dojo_students")
      .select("id, full_name, cpf, phone, email, photo_url, status, checkin_pin, qr_token, current_degree, current_belt_id, unit_id")
      .or(
        `full_name.ilike.${like},cpf.ilike.${like},phone.ilike.${like},email.ilike.${like},checkin_pin.eq.${q.replace(/\D/g, "") || "0"}`,
      )
      .limit(data.limit ?? 15);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Extended dashboard KPIs ----------
export const checkinDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const supa = context.supabase;

    const [today, week, month, presentNow, checkouts, gympass, totalpass, pendingPartner] = await Promise.all([
      supa.from("dojo_attendance").select("id", { count: "exact", head: true }).gte("checked_in_at", startDay),
      supa.from("dojo_attendance").select("id", { count: "exact", head: true }).gte("checked_in_at", startWeek),
      supa.from("dojo_attendance").select("id", { count: "exact", head: true }).gte("checked_in_at", startMonth),
      supa
        .from("dojo_attendance")
        .select("id", { count: "exact", head: true })
        .gte("checked_in_at", startDay)
        .is("checked_out_at", null),
      supa
        .from("dojo_attendance")
        .select("id", { count: "exact", head: true })
        .gte("checked_out_at", startDay),
      supa
        .from("dojo_attendance")
        .select("id", { count: "exact", head: true })
        .eq("method", "gympass")
        .gte("checked_in_at", startDay),
      supa
        .from("dojo_attendance")
        .select("id", { count: "exact", head: true })
        .eq("method", "totalpass")
        .gte("checked_in_at", startDay),
      supa
        .from("dojo_partner_checkins")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    // hourly distribution today
    const { data: todays } = await supa
      .from("dojo_attendance")
      .select("checked_in_at, method")
      .gte("checked_in_at", startDay)
      .limit(500);
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    (todays ?? []).forEach((r: any) => {
      const h = new Date(r.checked_in_at).getHours();
      hourly[h].count++;
    });
    const peak = hourly.reduce((a, b) => (b.count > a.count ? b : a), hourly[0]);

    // 30d average
    const start30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const { count: last30 } = await supa
      .from("dojo_attendance")
      .select("id", { count: "exact", head: true })
      .gte("checked_in_at", start30);
    const dailyAvg = Math.round(((last30 ?? 0) / 30) * 10) / 10;

    return {
      today: today.count ?? 0,
      week: week.count ?? 0,
      month: month.count ?? 0,
      presentNow: presentNow.count ?? 0,
      checkouts: checkouts.count ?? 0,
      gympass: gympass.count ?? 0,
      totalpass: totalpass.count ?? 0,
      pendingPartner: pendingPartner.count ?? 0,
      dailyAvg,
      peakHour: peak.hour,
      peakCount: peak.count,
      hourly,
    };
  });

// ---------- Present now list ----------
export const presentNowList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const startDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const { data, error } = await context.supabase
      .from("dojo_attendance")
      .select("id, checked_in_at, method, dojo_students(id, full_name, photo_url)")
      .gte("checked_in_at", startDay)
      .is("checked_out_at", null)
      .order("checked_in_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Check-out ----------
export const checkoutAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_attendance")
      .update({ checked_out_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Register visitor ----------
export const registerVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      name: z.string().min(2).max(120),
      phone: z.string().max(40).optional().nullable(),
      origin: z.string().max(80).optional().nullable(),
      notes: z.string().max(400).optional().nullable(),
      unitId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: null as any,
        unit_id: data.unitId ?? null,
        method: "visitor",
        visitor_name: data.name,
        visitor_phone: data.phone ?? null,
        visitor_origin: data.origin ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
        owner_id: context.userId,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- Settings ----------
const settingsSchema = z.object({
  minIntervalMinutes: z.number().int().min(0).max(1440).optional(),
  allowMultipleDaily: z.boolean().optional(),
  requireCheckout: z.boolean().optional(),
  welcomeMessage: z.string().max(400).optional(),
  blockOnOverdue: z.boolean().optional(),
  warnOnOverdue: z.boolean().optional(),
  warnOnMedical: z.boolean().optional(),
  requirePartnerValidation: z.boolean().optional(),
  kioskPin: z.string().max(20).optional().nullable(),
  geoRequired: z.boolean().optional(),
  geoLat: z.number().min(-90).max(90).optional().nullable(),
  geoLng: z.number().min(-180).max(180).optional().nullable(),
  geoRadiusM: z.number().int().min(10).max(5000).optional(),
  geoAddress: z.string().max(300).optional().nullable(),
  checkinWindowPreMins: z.number().int().min(0).max(1440).optional(),
  checkinWindowPostMins: z.number().int().min(0).max(1440).optional(),
  allowAdminException: z.boolean().optional(),
  allowTeacherException: z.boolean().optional(),
  blockDuplicateCheckin: z.boolean().optional(),
  allowGpsCheckin: z.boolean().optional(),
  allowPinCheckin: z.boolean().optional(),
  allowQrCheckin: z.boolean().optional(),
  allowFixedQrCheckin: z.boolean().optional(),
  allowPhotoCheckin: z.boolean().optional(),
});

export const getCheckinSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_checkin_settings")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const saveCheckinSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => settingsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload: any = { owner_id: context.userId };
    if (data.minIntervalMinutes !== undefined) payload.min_interval_minutes = data.minIntervalMinutes;
    if (data.allowMultipleDaily !== undefined) payload.allow_multiple_daily = data.allowMultipleDaily;
    if (data.requireCheckout !== undefined) payload.require_checkout = data.requireCheckout;
    if (data.welcomeMessage !== undefined) payload.welcome_message = data.welcomeMessage;
    if (data.blockOnOverdue !== undefined) payload.block_on_overdue = data.blockOnOverdue;
    if (data.warnOnOverdue !== undefined) payload.warn_on_overdue = data.warnOnOverdue;
    if (data.warnOnMedical !== undefined) payload.warn_on_medical = data.warnOnMedical;
    if (data.requirePartnerValidation !== undefined) payload.require_partner_validation = data.requirePartnerValidation;
    if (data.kioskPin !== undefined) payload.kiosk_pin = data.kioskPin;
    if (data.geoRequired !== undefined) payload.geo_required = data.geoRequired;
    if (data.geoLat !== undefined) payload.geo_lat = data.geoLat;
    if (data.geoLng !== undefined) payload.geo_lng = data.geoLng;
    if (data.geoRadiusM !== undefined) payload.geo_radius_m = data.geoRadiusM;
    if (data.geoAddress !== undefined) payload.geo_address = data.geoAddress;
    if (data.checkinWindowPreMins !== undefined) payload.checkin_window_pre_mins = data.checkinWindowPreMins;
    if (data.checkinWindowPostMins !== undefined) payload.checkin_window_post_mins = data.checkinWindowPostMins;
    if (data.allowAdminException !== undefined) payload.allow_admin_exception = data.allowAdminException;
    if (data.allowTeacherException !== undefined) payload.allow_teacher_exception = data.allowTeacherException;
    if (data.blockDuplicateCheckin !== undefined) payload.block_duplicate_checkin = data.blockDuplicateCheckin;
    if (data.allowGpsCheckin !== undefined) payload.allow_gps_checkin = data.allowGpsCheckin;
    if (data.allowPinCheckin !== undefined) payload.allow_pin_checkin = data.allowPinCheckin;
    if (data.allowQrCheckin !== undefined) payload.allow_qr_checkin = data.allowQrCheckin;
    if (data.allowFixedQrCheckin !== undefined) payload.allow_fixed_qr_checkin = data.allowFixedQrCheckin;
    if (data.allowPhotoCheckin !== undefined) payload.allow_photo_checkin = data.allowPhotoCheckin;
    const { error } = await context.supabase
      .from("dojo_checkin_settings")
      .upsert(payload, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Public method availability for logged-in student ----------
export const getMyCheckinMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("dojo_students")
      .select("owner_id")
      .limit(1)
      .maybeSingle();
    if (!me) {
      return {
        allowGps: true, allowPin: true, allowQr: true, allowFixedQr: true, allowPhoto: false,
        welcomeMessage: null as string | null, geoRequired: false,
      };
    }
    const { data: s } = await context.supabase
      .from("dojo_checkin_settings")
      .select(
        "allow_gps_checkin, allow_pin_checkin, allow_qr_checkin, allow_fixed_qr_checkin, allow_photo_checkin, welcome_message, geo_required",
      )
      .eq("owner_id", me.owner_id)
      .maybeSingle();
    const d = (s ?? {}) as any;
    return {
      allowGps: d.allow_gps_checkin ?? true,
      allowPin: d.allow_pin_checkin ?? true,
      allowQr: d.allow_qr_checkin ?? true,
      allowFixedQr: d.allow_fixed_qr_checkin ?? true,
      allowPhoto: d.allow_photo_checkin ?? false,
      welcomeMessage: d.welcome_message ?? null,
      geoRequired: !!d.geo_required,
    };
  });

// ---------- Simulate partner validation (until real API is contracted) ----------
export const simulatePartnerCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      provider: z.enum(["gympass", "totalpass"]),
      identifier: z.string().min(3).max(120),
      token: z.string().max(120).optional().nullable(),
      unitId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Check integration is enabled
    const { data: cfg } = await context.supabase
      .from("dojo_partner_integrations")
      .select("*")
      .eq("provider", data.provider)
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (!cfg || !cfg.enabled) {
      const { data: rec } = await context.supabase
        .from("dojo_partner_checkins")
        .insert({
          provider: data.provider,
          external_user: data.identifier,
          token: data.token ?? null,
          status: "denied",
          reason: "integration_disabled",
          payload: { manual: true } as any,
          unit_id: data.unitId ?? null,
          owner_id: context.userId,
        } as any)
        .select("id")
        .single();
      throw new Error(`Integração ${data.provider} não está ativa. Configure em Configurações → Integrações.`);
    }

    // Find student by identifier
    const { data: student } = await context.supabase
      .from("dojo_students")
      .select("id, full_name")
      .or(`email.eq.${data.identifier},cpf.eq.${data.identifier}`)
      .maybeSingle();

    if (!student) {
      await context.supabase.from("dojo_partner_checkins").insert({
        provider: data.provider,
        external_user: data.identifier,
        token: data.token ?? null,
        status: "denied",
        reason: "student_not_found",
        payload: { manual: true } as any,
        unit_id: data.unitId ?? cfg.unit_id ?? null,
        owner_id: context.userId,
      } as any);
      throw new Error("Aluno não encontrado com este identificador (email ou CPF).");
    }

    // === Corporate Benefits Service (fonte única para elegibilidade Gympass/TotalPass) ===
    // Se houver integração ativa no novo módulo, esta é a fonte da verdade.
    // Nenhuma validação de benefício acontece fora daqui; o módulo Benefícios Corporativos
    // apenas expõe os dados — a decisão final é registrada em dojo_partner_checkins.
    const { data: corpIntegration } = await context.supabase
      .from("dojo_corporate_integrations")
      .select("status")
      .eq("owner_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();

    if (corpIntegration && (corpIntegration as any).status === "connected") {
      const { data: benef } = await context.supabase
        .from("dojo_corporate_beneficiaries")
        .select("id, status, eligible, plan_name")
        .eq("owner_id", context.userId)
        .eq("student_id", student.id)
        .eq("provider", data.provider)
        .maybeSingle();

      const now = new Date().toISOString();
      const b = benef as any;
      const authorized = b && b.eligible === true && b.status === "active";

      if (b) {
        await context.supabase
          .from("dojo_corporate_beneficiaries")
          .update({ last_check_at: now, last_check_result: authorized ? "authorized" : "denied" })
          .eq("id", b.id);
      }
      await context.supabase.from("dojo_corporate_history").insert({
        owner_id: context.userId,
        provider: data.provider,
        event: authorized ? "checkin_authorized" : "checkin_denied",
        details: { studentId: student.id, reason: !b ? "not_a_beneficiary" : b.status },
      });

      if (!authorized) {
        const reason = !b
          ? "not_a_beneficiary"
          : b.status === "expired"
            ? "benefit_expired"
            : b.status === "blocked"
              ? "benefit_blocked"
              : b.status === "pending"
                ? "benefit_pending"
                : "not_eligible";
        await context.supabase.from("dojo_partner_checkins").insert({
          provider: data.provider,
          external_user: data.identifier,
          token: data.token ?? null,
          status: "denied",
          reason,
          payload: { corporate_benefits: true, plan: b?.plan_name ?? null } as any,
          unit_id: data.unitId ?? cfg.unit_id ?? null,
          owner_id: context.userId,
        } as any);
        throw new Error(
          !b
            ? "Aluno não é beneficiário desta plataforma."
            : `Benefício ${data.provider} não elegível (${b.status}).`,
        );
      }
    }


    const { data: att, error: attErr } = await context.supabase
      .from("dojo_attendance")
      .insert({
        student_id: student.id,
        unit_id: data.unitId ?? cfg.unit_id ?? null,
        method: data.provider,
        source: data.token ?? null,
        external_user: data.identifier,
        created_by: context.userId,
        owner_id: context.userId,
      })
      .select("id")
      .single();
    if (attErr) throw new Error(attErr.message);

    await context.supabase.from("dojo_partner_checkins").insert({
      provider: data.provider,
      external_user: data.identifier,
      token: data.token ?? null,
      status: "approved",
      reason: "manual_validation",
      payload: { manual: true } as any,
      attendance_id: att.id,
      unit_id: data.unitId ?? cfg.unit_id ?? null,
      owner_id: context.userId,
    } as any);

    return { ok: true, student, attendanceId: att.id };
  });

// ---------- Reports (aggregations) ----------
export const attendanceReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      from: z.string(),
      to: z.string(),
      groupBy: z.enum(["day", "student", "method"]).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_attendance")
      .select("id, checked_in_at, method, student_id, dojo_students(full_name)")
      .gte("checked_in_at", data.from)
      .lte("checked_in_at", data.to)
      .limit(5000);
    if (error) throw new Error(error.message);

    const groupBy = data.groupBy ?? "day";
    const buckets = new Map<string, number>();
    (rows ?? []).forEach((r: any) => {
      let key: string;
      if (groupBy === "day") key = new Date(r.checked_in_at).toISOString().slice(0, 10);
      else if (groupBy === "method") key = r.method || "manual";
      else key = r.dojo_students?.full_name ?? "—";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    const items = Array.from(buckets.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => (groupBy === "day" ? a.label.localeCompare(b.label) : b.count - a.count));
    return { total: rows?.length ?? 0, items };
  });
