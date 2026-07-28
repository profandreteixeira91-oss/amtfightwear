import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ================= SPACES =================
export const listSpaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_spaces")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSpace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
        unit_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").nullable().optional(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        capacity: z.number().int().positive().nullable().optional(),
        active: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const { data: row, error } = data.id
      ? await context.supabase.from("dojo_spaces").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("dojo_spaces").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSpace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_spaces").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= CLASSES =================
const scheduleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
});

const classSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
  unit_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").nullable().optional(),
  space_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").nullable().optional(),
  teacher_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").nullable().optional(),
  teacher_name: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  modality: z.string().min(1),
  level: z.string().min(1),
  color: z.string().min(1),
  max_students: z.number().int().positive(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().nullable().optional(),
  schedules: z.array(scheduleSchema).min(1),
});

async function detectConflict(
  supabase: any,
  ownerId: string,
  classId: string | null,
  spaceId: string | null | undefined,
  teacherId: string | null | undefined,
  schedules: z.infer<typeof scheduleSchema>[],
): Promise<string | null> {
  // fetch other schedules from same owner
  let q = supabase
    .from("dojo_class_schedules")
    .select("weekday, start_time, end_time, class_id, dojo_classes!inner(space_id, teacher_id, name, owner_id, status)")
    .eq("owner_id", ownerId);
  const { data: existing, error } = await q;
  if (error) return null;
  const conflicts = (existing ?? []).filter((r: any) => r.class_id !== classId && r.dojo_classes?.status !== "inactive");
  for (const s of schedules) {
    for (const e of conflicts) {
      if (e.weekday !== s.weekday) continue;
      const overlap = s.start_time < e.end_time && s.end_time > e.start_time;
      if (!overlap) continue;
      if (spaceId && e.dojo_classes?.space_id === spaceId) {
        return `Conflito de espaço com a turma "${e.dojo_classes.name}".`;
      }
      if (teacherId && e.dojo_classes?.teacher_id === teacherId) {
        return `Conflito de professor com a turma "${e.dojo_classes.name}".`;
      }
    }
  }
  return null;
}

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_classes")
      .select(
        "*, dojo_spaces(id, name), dojo_units(id, name), schedules:dojo_class_schedules(id, weekday, start_time, end_time), students:dojo_class_students(id, student_id, status)"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClass = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_classes")
      .select(
        "*, dojo_spaces(id, name), dojo_units(id, name), schedules:dojo_class_schedules(id, weekday, start_time, end_time), students:dojo_class_students(id, student_id, status, enrolled_at, dojo_students(id, full_name, phone, photo_url, current_belt_id, status))"
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => classSchema.parse(i))
  .handler(async ({ data, context }) => {
    for (const s of data.schedules) {
      if (s.end_time <= s.start_time) throw new Error("Horário final deve ser maior que o inicial.");
    }
    const conflict = await detectConflict(
      context.supabase,
      context.userId,
      data.id ?? null,
      data.space_id,
      data.teacher_id,
      data.schedules,
    );
    if (conflict) throw new Error(conflict);

    const { schedules, id, ...rest } = data;
    const payload = { ...rest, owner_id: context.userId };
    const { data: classRow, error } = id
      ? await context.supabase.from("dojo_classes").update(payload).eq("id", id).select().single()
      : await context.supabase.from("dojo_classes").insert(payload).select().single();
    if (error) throw new Error(error.message);

    // replace schedules
    await context.supabase.from("dojo_class_schedules").delete().eq("class_id", classRow.id);
    if (schedules.length) {
      const rows = schedules.map((s) => ({ ...s, class_id: classRow.id, owner_id: context.userId }));
      const { error: err2 } = await context.supabase.from("dojo_class_schedules").insert(rows);
      if (err2) throw new Error(err2.message);
    }

    // Materializa ocorrências para as próximas ~8 semanas para que a escala do
    // professor apareça imediatamente no módulo Equipe após salvar a turma.
    if (schedules.length && (rest.status ?? "active") === "active") {
      const today = new Date();
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + 56);
      const occRows: any[] = [];
      const scheduleIdRows = await context.supabase
        .from("dojo_class_schedules")
        .select("id, weekday, start_time, end_time")
        .eq("class_id", classRow.id);
      const sList = scheduleIdRows.data ?? [];
      for (let d = new Date(today); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const wd = d.getUTCDay();
        for (const s of sList) {
          if (Number(s.weekday) !== wd) continue;
          occRows.push({
            owner_id: context.userId,
            class_id: classRow.id,
            schedule_id: s.id,
            occurrence_date: d.toISOString().slice(0, 10),
            start_time: s.start_time,
            end_time: s.end_time,
            status: "scheduled",
          });
        }
      }
      if (occRows.length) {
        await context.supabase
          .from("dojo_class_occurrences")
          .upsert(occRows, { onConflict: "class_id,occurrence_date,schedule_id", ignoreDuplicates: true });
      }
    }

    return classRow;
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: c, error } = await context.supabase
      .from("dojo_classes")
      .select("*, schedules:dojo_class_schedules(weekday, start_time, end_time)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { id, created_at, updated_at, schedules, ...rest } = c as any;
    const { data: newClass, error: e2 } = await context.supabase
      .from("dojo_classes")
      .insert({ ...rest, name: `${rest.name} (cópia)`, owner_id: context.userId })
      .select()
      .single();
    if (e2) throw new Error(e2.message);
    if (schedules?.length) {
      await context.supabase.from("dojo_class_schedules").insert(
        schedules.map((s: any) => ({ ...s, class_id: newClass.id, owner_id: context.userId })),
      );
    }
    return newClass;
  });

// ================= ENROLLMENTS =================
export const addClassStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ class_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"), student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // capacity check
    const { data: c } = await context.supabase
      .from("dojo_classes")
      .select("max_students, students:dojo_class_students(id)")
      .eq("id", data.class_id)
      .single();
    if (c && (c.students?.length ?? 0) >= c.max_students) {
      throw new Error("Turma lotada.");
    }
    const { error } = await context.supabase
      .from("dojo_class_students")
      .insert({ ...data, owner_id: context.userId });
    if (error) {
      if (error.message.includes("duplicate")) throw new Error("Aluno já matriculado nesta turma.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeClassStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_class_students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= OCCURRENCES =================
export const cancelOccurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        class_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
        schedule_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").nullable().optional(),
        occurrence_date: z.string(),
        cancel_reason: z.string().min(1),
        notes: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_class_occurrences").upsert(
      {
        class_id: data.class_id,
        schedule_id: data.schedule_id ?? null,
        occurrence_date: data.occurrence_date,
        status: "cancelled",
        cancel_reason: data.cancel_reason,
        notes: data.notes ?? null,
        owner_id: context.userId,
      },
      { onConflict: "class_id,occurrence_date,schedule_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOccurrences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_class_occurrences")
      .select("*")
      .gte("occurrence_date", data.from)
      .lte("occurrence_date", data.to);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Lista ocorrências (aulas) do dia para uma turma — usada no check-in por foto
// para sincronizar com o módulo Agenda.
export const listTodayClassOccurrences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      classId: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
      date: z.string().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    // 1) ocorrências materializadas para o dia
    const { data: occRows, error: occErr } = await context.supabase
      .from("dojo_class_occurrences")
      .select("id, class_id, schedule_id, occurrence_date, start_time, end_time, status")
      .eq("class_id", data.classId)
      .eq("occurrence_date", date)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true });
    if (occErr) throw new Error(occErr.message);

    if ((occRows ?? []).length > 0) return occRows!;

    // 2) fallback: se não houver ocorrências materializadas, deriva do schedule semanal
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const { data: schedRows, error: schedErr } = await context.supabase
      .from("dojo_class_schedules")
      .select("id, weekday, start_time, end_time")
      .eq("class_id", data.classId)
      .eq("weekday", weekday)
      .order("start_time", { ascending: true });
    if (schedErr) throw new Error(schedErr.message);
    return (schedRows ?? []).map((s: any) => ({
      id: `sched:${s.id}:${date}`,
      class_id: data.classId,
      schedule_id: s.id,
      occurrence_date: date,
      start_time: s.start_time,
      end_time: s.end_time,
      status: "scheduled",
    }));
  });

// ================= SEARCH STUDENTS =================
export const searchStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().default("") }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    let query = context.supabase
      .from("dojo_students")
      .select("id, full_name, phone, email, cpf, photo_url, status")
      .order("full_name")
      .limit(20);
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,cpf.ilike.%${q}%`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ================= STATS =================
export const scheduleStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date();
    const dow = today.getDay();
    const [classes, schedulesToday, enrollments] = await Promise.all([
      context.supabase.from("dojo_classes").select("id, max_students", { count: "exact" }).eq("status", "active"),
      context.supabase.from("dojo_class_schedules").select("id", { count: "exact", head: true }).eq("weekday", dow),
      context.supabase.from("dojo_class_students").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    const totalCap = (classes.data ?? []).reduce((s, c: any) => s + (c.max_students || 0), 0);
    const enrollCount = enrollments.count ?? 0;
    return {
      activeClasses: classes.count ?? 0,
      classesToday: schedulesToday.count ?? 0,
      enrolledStudents: enrollCount,
      occupancyRate: totalCap ? Math.min(100, Math.round((enrollCount / totalCap) * 100)) : 0,
    };
  });

// ================= STUDENT CLASSES =================
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const listStudentClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ studentId: z.string().regex(UUID_RE, "UUID inválido") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("dojo_class_students")
      .select(
        "id, class_id, status, enrolled_at, dojo_classes(id, name, modality, level, teacher_name, color, status, dojo_units(id, name), dojo_spaces(id, name), schedules:dojo_class_schedules(id, weekday, start_time, end_time))",
      )
      .eq("student_id", data.studentId)
      .order("enrolled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
