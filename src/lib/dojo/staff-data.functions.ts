/**
 * Leituras e escritas do Portal do Professor.
 *
 * Contrato de segurança (validado SEMPRE no servidor):
 * - identidade e `owner_id` vêm de `dojo_staff_session()` — o cliente nunca
 *   envia `owner_id`;
 * - cada função declara o módulo e o nível mínimo exigido; sem permissão a
 *   chamada é rejeitada, mesmo que a UI esteja escondida;
 * - toda consulta filtra por `owner_id` do dojo pai, e todo recurso recebido
 *   por ID é reconferido contra esse `owner_id` (impede manipulação de IDs).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaffCan, requireStaff, type StaffContext } from "@/lib/dojo/staff-guard.server";
import { todayISO, weekdayISO } from "@/lib/dates";

const uuid = z.string().uuid();

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function scope(
  supabase: Parameters<typeof requireStaff>[0],
  moduleKey: string,
  need: "read" | "write" = "read",
): Promise<{ staff: StaffContext; admin: AdminClient }> {
  const staff = await requireStaff(supabase);
  assertStaffCan(staff, moduleKey, need);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { staff, admin: supabaseAdmin };
}

/** Garante que um recurso pertence ao dojo do professor. */
async function assertOwned(
  admin: AdminClient,
  table: "dojo_students" | "dojo_classes" | "dojo_belts",
  id: string,
  ownerId: string,
): Promise<void> {
  const { data, error } = await admin.from(table).select("id").eq("id", id).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Registro não encontrado no seu dojo.");
}

/* ------------------------------------------------------------------ Painel */

export type StaffDashboard = {
  students: number | null;
  classes: number | null;
  checkinsToday: number | null;
  todayClasses: { id: string; name: string; start_time: string; end_time: string | null; modality: string | null }[];
  announcements: { id: string; title: string; publish_at: string | null; priority: string | null }[];
  competitions: { id: string; name: string; starts_at: string | null; city: string | null }[];
};

export const getStaffDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffDashboard> => {
    const staff = await requireStaff(context.supabase);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const owner = staff.owner_id;
    const can = (k: string) => (staff.permissions[k] ?? "none") !== "none";

    const out: StaffDashboard = {
      students: null,
      classes: null,
      checkinsToday: null,
      todayClasses: [],
      announcements: [],
      competitions: [],
    };

    if (can("students")) {
      const { count } = await admin
        .from("dojo_students")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", owner)
        .eq("status", "active");
      out.students = count ?? 0;
    }

    if (can("schedule")) {
      const { count } = await admin
        .from("dojo_classes")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", owner)
        .eq("status", "active");
      out.classes = count ?? 0;
      out.todayClasses = await todaySchedule(admin, owner);
    }

    if (can("checkin")) {
      const today = todayISO();
      const { count } = await admin
        .from("dojo_attendance")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", owner)
        .gte("checked_in_at", `${today}T00:00:00-03:00`)
        .lte("checked_in_at", `${today}T23:59:59-03:00`);
      out.checkinsToday = count ?? 0;
    }

    if (can("announcements")) {
      const { data } = await admin
        .from("dojo_announcements")
        .select("id, title, publish_at, priority")
        .eq("owner_id", owner)
        .eq("status", "published")
        .order("publish_at", { ascending: false })
        .limit(3);
      out.announcements = data ?? [];
    }

    if (can("competitions")) {
      const { data } = await admin
        .from("dojo_competitions")
        .select("id, name, starts_at, city")
        .eq("owner_id", owner)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(3);
      out.competitions = data ?? [];
    }

    return out;
  });

async function todaySchedule(
  admin: AdminClient,
  owner: string,
): Promise<StaffDashboard["todayClasses"]> {
  const today = todayISO();
  const weekday = weekdayISO(today);

  const [{ data: occ }, { data: sched }] = await Promise.all([
    admin
      .from("dojo_class_occurrences")
      .select("id, class_id, start_time, end_time, status, dojo_classes(name, modality)")
      .eq("owner_id", owner)
      .eq("occurrence_date", today),
    admin
      .from("dojo_class_schedules")
      .select("id, class_id, start_time, end_time, dojo_classes(name, modality, status)")
      .eq("owner_id", owner)
      .eq("weekday", weekday),
  ]);

  type Row = StaffDashboard["todayClasses"][number];
  const map = new Map<string, Row>();
  const key = (classId: string, start: string) => `${classId}|${start.slice(0, 5)}`;

  for (const row of sched ?? []) {
    const cls = row.dojo_classes as { name: string; modality: string | null; status: string | null } | null;
    if (!cls || (cls.status && cls.status !== "active")) continue;
    map.set(key(row.class_id, row.start_time ?? ""), {
      id: row.id,
      name: cls.name,
      start_time: (row.start_time ?? "").slice(0, 5),
      end_time: row.end_time ? row.end_time.slice(0, 5) : null,
      modality: cls.modality,
    });
  }
  // Ocorrências materializadas têm prioridade (cancelamentos e ajustes manuais).
  for (const row of occ ?? []) {
    if (row.status === "cancelled") {
      map.delete(key(row.class_id, row.start_time ?? ""));
      continue;
    }
    const cls = row.dojo_classes as { name: string; modality: string | null } | null;
    map.set(key(row.class_id, row.start_time ?? ""), {
      id: row.id,
      name: cls?.name ?? "Turma",
      start_time: (row.start_time ?? "").slice(0, 5),
      end_time: row.end_time ? row.end_time.slice(0, 5) : null,
      modality: cls?.modality ?? null,
    });
  }

  return [...map.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/* ------------------------------------------------------------------ Alunos */

export type StaffStudent = {
  id: string;
  full_name: string;
  status: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  current_degree: number | null;
  belt: { name: string; color_hex: string | null } | null;
};

export const listStaffStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().max(120).optional() }).parse(i ?? {}))
  .handler(async ({ context, data }): Promise<StaffStudent[]> => {
    const { staff, admin } = await scope(context.supabase, "students", "read");
    let query = admin
      .from("dojo_students")
      .select("id, full_name, status, phone, email, photo_url, current_degree, dojo_belts:current_belt_id(name, color_hex)")
      .eq("owner_id", staff.owner_id)
      .order("full_name", { ascending: true })
      .limit(500);
    if (data.q && data.q.trim()) query = query.ilike("full_name", `%${data.q.trim()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      status: r.status,
      phone: r.phone,
      email: r.email,
      photo_url: r.photo_url,
      current_degree: r.current_degree,
      belt: (r.dojo_belts as { name: string; color_hex: string | null } | null) ?? null,
    }));
  });

/* ------------------------------------------------------------------ Turmas */

export type StaffClass = {
  id: string;
  name: string;
  modality: string | null;
  level: string | null;
  status: string | null;
  teacher_name: string | null;
  students: number;
  schedules: { weekday: number; start_time: string; end_time: string | null }[];
};

export const listStaffClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffClass[]> => {
    const { staff, admin } = await scope(context.supabase, "schedule", "read");
    const owner = staff.owner_id;
    const [{ data: classes, error }, { data: schedules }, { data: links }] = await Promise.all([
      admin
        .from("dojo_classes")
        .select("id, name, modality, level, status, teacher_name")
        .eq("owner_id", owner)
        .order("name", { ascending: true }),
      admin.from("dojo_class_schedules").select("class_id, weekday, start_time, end_time").eq("owner_id", owner),
      admin.from("dojo_class_students").select("class_id, status").eq("owner_id", owner),
    ]);
    if (error) throw new Error(error.message);

    return (classes ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      modality: c.modality,
      level: c.level,
      status: c.status,
      teacher_name: c.teacher_name,
      students: (links ?? []).filter((l) => l.class_id === c.id && (l.status ?? "active") === "active").length,
      schedules: (schedules ?? [])
        .filter((s) => s.class_id === c.id)
        .map((s) => ({
          weekday: s.weekday,
          start_time: (s.start_time ?? "").slice(0, 5),
          end_time: s.end_time ? s.end_time.slice(0, 5) : null,
        }))
        .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
    }));
  });

/* -------------------------------------------------------------- Frequência */

export type StaffAttendance = {
  id: string;
  student_id: string | null;
  student_name: string;
  class_name: string | null;
  checked_in_at: string;
  method: string | null;
};

export const listStaffAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(i ?? {}),
  )
  .handler(async ({ context, data }): Promise<StaffAttendance[]> => {
    const { staff, admin } = await scope(context.supabase, "checkin", "read");
    const day = data.date ?? todayISO();
    const { data: rows, error } = await admin
      .from("dojo_attendance")
      .select("id, student_id, checked_in_at, method, dojo_students(full_name), dojo_classes(name)")
      .eq("owner_id", staff.owner_id)
      .gte("checked_in_at", `${day}T00:00:00-03:00`)
      .lte("checked_in_at", `${day}T23:59:59-03:00`)
      .order("checked_in_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: (r.dojo_students as { full_name: string } | null)?.full_name ?? "Aluno",
      class_name: (r.dojo_classes as { name: string } | null)?.name ?? null,
      checked_in_at: r.checked_in_at,
      method: r.method,
    }));
  });

export const staffRegisterCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ student_id: uuid, class_id: uuid.optional().nullable() }).parse(i),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { staff, admin } = await scope(context.supabase, "checkin", "write");
    await assertOwned(admin, "dojo_students", data.student_id, staff.owner_id);
    if (data.class_id) await assertOwned(admin, "dojo_classes", data.class_id, staff.owner_id);

    const day = todayISO();
    const { data: dup } = await admin
      .from("dojo_attendance")
      .select("id")
      .eq("owner_id", staff.owner_id)
      .eq("student_id", data.student_id)
      .gte("checked_in_at", `${day}T00:00:00-03:00`)
      .lte("checked_in_at", `${day}T23:59:59-03:00`)
      .limit(1);
    if (dup && dup.length > 0) throw new Error("Este aluno já possui check-in registrado hoje.");

    const { error } = await admin.from("dojo_attendance").insert({
      owner_id: staff.owner_id,
      student_id: data.student_id,
      class_id: data.class_id ?? null,
      checked_in_at: new Date().toISOString(),
      method: "manual",
      source: "staff_portal",
      created_by: context.userId,
      notes: `Registrado por ${staff.full_name ?? staff.email} (equipe)`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------- Graduações */

export type StaffGraduation = {
  id: string;
  student_name: string;
  belt_name: string | null;
  degree: number | null;
  graduation_date: string;
  evaluator: string | null;
};

export const listStaffGraduations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffGraduation[]> => {
    const { staff, admin } = await scope(context.supabase, "graduations", "read");
    const { data: rows, error } = await admin
      .from("dojo_graduations")
      .select("id, degree, graduation_date, evaluator, dojo_students(full_name), dojo_belts(name)")
      .eq("owner_id", staff.owner_id)
      .order("graduation_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      student_name: (r.dojo_students as { full_name: string } | null)?.full_name ?? "Aluno",
      belt_name: (r.dojo_belts as { name: string } | null)?.name ?? null,
      degree: r.degree,
      graduation_date: r.graduation_date,
      evaluator: r.evaluator,
    }));
  });

export const listStaffBelts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { staff, admin } = await scope(context.supabase, "graduations", "read");
    const { data, error } = await admin
      .from("dojo_belts")
      .select("id, name, color_hex, modality, sort_order")
      .eq("owner_id", staff.owner_id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const staffRegisterGraduation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: uuid,
        belt_id: uuid,
        degree: z.number().int().min(0).max(10).default(0),
        graduation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { staff, admin } = await scope(context.supabase, "graduations", "write");
    await assertOwned(admin, "dojo_students", data.student_id, staff.owner_id);
    await assertOwned(admin, "dojo_belts", data.belt_id, staff.owner_id);
    const { error } = await admin.from("dojo_graduations").insert({
      owner_id: staff.owner_id,
      student_id: data.student_id,
      belt_id: data.belt_id,
      degree: data.degree,
      graduation_date: data.graduation_date,
      evaluator: staff.full_name ?? staff.email,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------- Avaliações */

export const listStaffEvaluations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { staff, admin } = await scope(context.supabase, "evaluations", "read");
    const { data, error } = await admin
      .from("dojo_evaluations")
      .select("id, title, description, modality, category, total_score, passing_score, active, created_at")
      .eq("owner_id", staff.owner_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ------------------------------------------------------------ Comunicação */

export const listStaffAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { staff, admin } = await scope(context.supabase, "announcements", "read");
    const { data, error } = await admin
      .from("dojo_announcements")
      .select("id, title, summary, content, priority, status, publish_at, created_at, author_name")
      .eq("owner_id", staff.owner_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const staffCreateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(3).max(160),
        content: z.string().min(3).max(8000),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      })
      .parse(i),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { staff, admin } = await scope(context.supabase, "announcements", "write");
    const { error } = await admin.from("dojo_announcements").insert({
      owner_id: staff.owner_id,
      title: data.title,
      content: data.content,
      summary: data.content.slice(0, 180),
      priority: data.priority,
      status: "published",
      publish_at: new Date().toISOString(),
      target_scope: "all",
      author_name: staff.full_name ?? staff.email,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------- Competições */

export const listStaffCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { staff, admin } = await scope(context.supabase, "competitions", "read");
    const { data, error } = await admin
      .from("dojo_competitions")
      .select("id, name, starts_at, ends_at, city, state, modality, status, external_url")
      .eq("owner_id", staff.owner_id)
      .order("starts_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
