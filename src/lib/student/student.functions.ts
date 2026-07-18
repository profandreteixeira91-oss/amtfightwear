import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ Perfil / branding ============

export const getMyStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_students")
      .select(
        "id, owner_id, full_name, email, phone, photo_url, current_belt_id, current_degree, checkin_pin, qr_token, birth_date, cpf, address, street, address_number, address_complement, neighborhood, city, state, zip, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, notes",
      )
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const getMyBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_academy_profile")
      .select("trade_name, legal_name, logo_url, brand_primary, brand_secondary, phone, whatsapp, email, city, state")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const profileUpdateSchema = z.object({
  phone: z.string().max(30).optional().nullable(),
  photo_url: z.string().url().max(1000).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  address_number: z.string().max(20).optional().nullable(),
  address_complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  emergency_contact_name: z.string().max(120).optional().nullable(),
  emergency_contact_phone: z.string().max(30).optional().nullable(),
  emergency_contact_relationship: z.string().max(60).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => profileUpdateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: me, error: e1 } = await context.supabase
      .from("dojo_students")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (e1 || !me) throw new Error(e1?.message ?? "Aluno não encontrado");
    const { error } = await context.supabase.from("dojo_students").update(data).eq("id", me.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Home / dashboard ============

export const getMyHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: student } = await context.supabase
      .from("dojo_students")
      .select("id, owner_id, full_name, photo_url, current_belt_id, current_degree")
      .limit(1)
      .maybeSingle();
    if (!student) return null;

    const [{ data: belt }, { data: lastCheckin }, { data: lastGrad }, { data: openInvoices }, { data: unread }] =
      await Promise.all([
        student.current_belt_id
          ? context.supabase.from("dojo_belts").select("name, color_hex, stripe_hex").eq("id", student.current_belt_id).maybeSingle()
          : Promise.resolve({ data: null }),
        context.supabase
          .from("dojo_attendance")
          .select("checked_in_at, method")
          .eq("student_id", student.id)
          .order("checked_in_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        context.supabase
          .from("dojo_graduations")
          .select("graduation_date, degree, dojo_belts(name, color_hex)")
          .eq("student_id", student.id)
          .order("graduation_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        context.supabase
          .from("dojo_invoices")
          .select("id, amount, due_date, status")
          .eq("student_id", student.id)
          .in("status", ["pending", "overdue"])
          .order("due_date", { ascending: true })
          .limit(3),
        context.supabase
          .from("dojo_student_notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null),
      ]);

    return {
      student,
      belt,
      lastCheckin,
      lastGraduation: lastGrad,
      openInvoices: openInvoices ?? [],
      unreadNotifications: (unread as { count?: number } | null)?.count ?? 0,
    };
  });

// ============ Agenda ============

export const getMyAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ from: z.string().optional(), to: z.string().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase.from("dojo_students").select("id").limit(1).maybeSingle();
    if (!me) return [];
    const { data: enrolls } = await context.supabase
      .from("dojo_class_students")
      .select("class_id")
      .eq("student_id", me.id)
      .eq("status", "active");
    const classIds = (enrolls ?? []).map((e) => e.class_id);
    if (classIds.length === 0) return [];

    const from = data.from ?? new Date().toISOString().slice(0, 10);
    const to = data.to ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const { data: occ } = await context.supabase
      .from("dojo_class_occurrences")
      .select("id, class_id, occurrence_date, start_time, end_time, status, dojo_classes(name, modality, teacher_name, color, space_id, unit_id)")
      .in("class_id", classIds)
      .gte("occurrence_date", from)
      .lte("occurrence_date", to)
      .order("occurrence_date", { ascending: true });
    return occ ?? [];
  });

// ============ Check-in ============

export const selfCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ method: z.enum(["app", "qr", "pin"]).default("app") }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("dojo_students")
      .select("id, owner_id, unit_id")
      .limit(1)
      .maybeSingle();
    if (!me) throw new Error("Aluno não encontrado");

    const { data: settings } = await context.supabase
      .from("dojo_checkin_settings")
      .select("min_interval_minutes, allow_multiple_daily")
      .limit(1)
      .maybeSingle();
    const minInterval = settings?.min_interval_minutes ?? 30;
    const { data: last } = await context.supabase
      .from("dojo_attendance")
      .select("checked_in_at")
      .eq("student_id", me.id)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.checked_in_at) {
      const diffMin = (Date.now() - new Date(last.checked_in_at).getTime()) / 60000;
      if (diffMin < minInterval) {
        throw new Error(`Aguarde ${Math.ceil(minInterval - diffMin)} minuto(s) para um novo check-in.`);
      }
    }

    const { error } = await context.supabase.from("dojo_attendance").insert({
      student_id: me.id,
      owner_id: me.owner_id,
      unit_id: me.unit_id ?? null,
      method: data.method,
      source: "student_app",
      status: "checked_in",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase.from("dojo_students").select("id").limit(1).maybeSingle();
    if (!me) return [];
    const { data: rows } = await context.supabase
      .from("dojo_attendance")
      .select("id, checked_in_at, method, status, notes")
      .eq("student_id", me.id)
      .order("checked_in_at", { ascending: false })
      .limit(data.limit ?? 60);
    return rows ?? [];
  });

// ============ Graduações ============

export const getMyGraduations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase.from("dojo_students").select("id, current_belt_id, current_degree").limit(1).maybeSingle();
    if (!me) return { current: null, history: [] };
    const [{ data: current }, { data: history }] = await Promise.all([
      me.current_belt_id
        ? context.supabase.from("dojo_belts").select("id, name, color_hex, stripe_hex").eq("id", me.current_belt_id).maybeSingle()
        : Promise.resolve({ data: null }),
      context.supabase
        .from("dojo_graduations")
        .select("id, graduation_date, degree, evaluator, notes, dojo_belts(name, color_hex, stripe_hex)")
        .eq("student_id", me.id)
        .order("graduation_date", { ascending: false }),
    ]);
    return { current: current ? { ...current, degree: me.current_degree ?? 0 } : null, history: history ?? [] };
  });

// ============ Certificados ============

export const getMyCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase.from("dojo_students").select("id").limit(1).maybeSingle();
    if (!me) return [];
    const { data } = await context.supabase
      .from("dojo_certificates")
      .select("id, public_hash, pdf_url, issued_at, values, dojo_graduations(graduation_date, dojo_belts(name, color_hex))")
      .eq("student_id", me.id)
      .order("issued_at", { ascending: false });
    return data ?? [];
  });

// ============ Financeiro ============

export const getMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase.from("dojo_students").select("id").limit(1).maybeSingle();
    if (!me) return [];
    const { data } = await context.supabase
      .from("dojo_invoices")
      .select("id, description, amount, due_date, paid_at, status, payment_link, method")
      .eq("student_id", me.id)
      .order("due_date", { ascending: false })
      .limit(60);
    return data ?? [];
  });

// ============ Competições ============

export const getMyCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase.from("dojo_students").select("id, owner_id").limit(1).maybeSingle();
    if (!me) return { upcoming: [], mine: [] };
    const nowIso = new Date().toISOString();
    const [{ data: upcoming }, { data: mine }] = await Promise.all([
      context.supabase
        .from("dojo_competitions")
        .select("id, name, banner_url, starts_at, ends_at, city, state, external_url, entry_fee")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(12),
      context.supabase
        .from("dojo_competition_athletes")
        .select("id, status, category, belt, dojo_competitions(id, name, starts_at, external_url, banner_url, city, state)")
        .eq("student_id", me.id)
        .order("created_at", { ascending: false }),
    ]);
    return { upcoming: upcoming ?? [], mine: mine ?? [] };
  });

// ============ Vídeos ============

export const getMyVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ q: z.string().optional(), categoryId: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_videos")
      .select("id, title, description, thumbnail_url, duration_seconds, category_id, published_at, source, url")
      .order("published_at", { ascending: false })
      .limit(60);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    const { data: rows } = await q;
    return rows ?? [];
  });

// ============ Notificações ============

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("dojo_student_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_student_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
