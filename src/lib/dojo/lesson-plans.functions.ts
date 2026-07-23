import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContentInput = {
  id?: string;
  name: string;
  category?: string | null;
  modality?: string | null;
  description?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  tags?: string[];
  avg_time_min?: number | null;
  recommended_belt?: string | null;
  recommended_age?: string | null;
  technical_level?: string | null;
};

export type TechniqueInput = {
  id?: string;
  modality: string;
  category?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  difficulty?: string | null;
  recommended_belt?: string | null;
  notes?: string | null;
};


const UUID = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

// =============== BLOCKS SCHEMA ===============
// Cada bloco = { id, kind, title, duration_min, description, items[] }
const BlockItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  time_min: z.number().nullable().optional(),
  reps: z.string().optional().nullable(),
  sets: z.string().optional().nullable(),
  intensity: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  content_id: z.string().optional().nullable(),
  technique_id: z.string().optional().nullable(),
});

const BlockSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "warmup",
    "stretching",
    "fundamentals",
    "techniques",
    "exercises",
    "sparring",
    "conditioning",
    "closing",
    "custom",
  ]),
  title: z.string(),
  duration_min: z.number().nullable().optional(),
  description: z.string().optional().nullable(),
  items: z.array(BlockItemSchema).default([]),
});

// ================================================================
// LESSON PLANS — CRUD
// ================================================================
export const listLessonPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        classId: UUID.optional(),
        teacherId: UUID.optional(),
        unitId: UUID.optional(),
        beltId: UUID.optional(),
        modality: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(1000).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_lesson_plans")
      .select(
        "id, title, modality, category, age_range, location, date, start_time, end_time, duration_min, status, color, objectives, notes, blocks, class_id, teacher_id, unit_id, belt_id, created_at, updated_at, dojo_classes(id, name), dojo_team_members(id, full_name), dojo_units(id, name), dojo_belts(id, name, color_hex, modality)",
      )
      .order("date", { ascending: true })
      .limit(data.limit ?? 500);
    if (data.from) q = q.gte("date", data.from);
    if (data.to) q = q.lte("date", data.to);
    if (data.classId) q = q.eq("class_id", data.classId);
    if (data.teacherId) q = q.eq("teacher_id", data.teacherId);
    if (data.unitId) q = q.eq("unit_id", data.unitId);
    if (data.beltId) q = q.eq("belt_id", data.beltId);
    if (data.modality) q = q.eq("modality", data.modality);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getLessonPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_lesson_plans")
      .select(
        "*, dojo_classes(id, name), dojo_team_members(id, full_name), dojo_units(id, name), dojo_belts(id, name, color_hex, modality)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Plano não encontrado");
    return row;
  });

const UpsertSchema = z.object({
  id: UUID.optional(),
  title: z.string().min(1),
  modality: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  age_range: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  date: z.string(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  duration_min: z.number().int().nullable().optional(),
  status: z.enum(["planejada", "ministrada", "cancelada", "reagendada"]).default("planejada"),
  color: z.string().nullable().optional(),
  objectives: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  blocks: z.array(BlockSchema).default([]),
  class_id: UUID.nullable().optional(),
  teacher_id: UUID.nullable().optional(),
  unit_id: UUID.nullable().optional(),
  belt_id: UUID.nullable().optional(),
});

export const upsertLessonPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const record = { ...rest, owner_id: context.userId, created_by: context.userId };
    const { data: row, error } = id
      ? await context.supabase.from("dojo_lesson_plans").update(record).eq("id", id).select().single()
      : await context.supabase.from("dojo_lesson_plans").insert(record).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLessonPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_lesson_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateLessonPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: UUID,
        date: z.string(),
        classId: UUID.nullable().optional(),
        teacherId: UUID.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("dojo_lesson_plans")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!src) throw new Error("Plano de origem não encontrado");
    const record = {
      owner_id: context.userId,
      created_by: context.userId,
      title: src.title,
      modality: src.modality,
      category: src.category,
      age_range: src.age_range,
      location: src.location,
      start_time: src.start_time,
      end_time: src.end_time,
      duration_min: src.duration_min,
      color: src.color,
      objectives: src.objectives,
      notes: src.notes,
      blocks: src.blocks,
      unit_id: src.unit_id,
      belt_id: src.belt_id,
      date: data.date,
      status: "planejada",
      class_id: data.classId ?? src.class_id,
      teacher_id: data.teacherId ?? src.teacher_id,
    };

    const { data: row, error } = await context.supabase
      .from("dojo_lesson_plans")
      .insert(record)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ================================================================
// BULK DUPLICATE (semana / mês / trimestre / semestre / ano)
// ================================================================
export const bulkDuplicateLessonPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: UUID,
        mode: z.enum(["weekly", "biweekly", "monthly"]).default("weekly"),
        occurrences: z.number().int().min(1).max(52),
        classId: UUID.nullable().optional(),
        teacherId: UUID.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("dojo_lesson_plans")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!src) throw new Error("Plano de origem não encontrado");

    const base = new Date((src.date as string) + "T12:00:00");
    const rows: Array<{
      owner_id: string;
      created_by: string;
      title: string;
      date: string;
      status: string;
      [k: string]: unknown;
    }> = [];
    for (let i = 1; i <= data.occurrences; i++) {
      const d = new Date(base);
      if (data.mode === "weekly") d.setDate(base.getDate() + 7 * i);
      else if (data.mode === "biweekly") d.setDate(base.getDate() + 14 * i);
      else d.setMonth(base.getMonth() + i);
      rows.push({
        owner_id: context.userId,
        created_by: context.userId,
        title: src.title,
        modality: src.modality,
        category: src.category,
        age_range: src.age_range,
        location: src.location,
        start_time: src.start_time,
        end_time: src.end_time,
        duration_min: src.duration_min,
        color: src.color,
        objectives: src.objectives,
        notes: src.notes,
        blocks: src.blocks,
        unit_id: src.unit_id,
        belt_id: src.belt_id,
        date: d.toISOString().slice(0, 10),
        status: "planejada",
        class_id: data.classId ?? src.class_id,
        teacher_id: data.teacherId ?? src.teacher_id,
      });
    }
    const { data: inserted, error } = await context.supabase
      .from("dojo_lesson_plans")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    return { created: inserted?.length ?? 0 };
  });

// ================================================================
// TEMPLATES (modelos de aula)
// ================================================================
const TemplateSchema = z.object({
  id: UUID.optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  modality: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  age_range: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  objectives: z.string().nullable().optional(),
  duration_min: z.number().int().nullable().optional(),
  blocks: z.array(BlockSchema).default([]),
});

export const listLessonTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_lesson_templates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertLessonTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => TemplateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const record = { ...rest, owner_id: context.userId };
    const { data: row, error } = id
      ? await context.supabase.from("dojo_lesson_templates").update(record).eq("id", id).select().single()
      : await context.supabase.from("dojo_lesson_templates").insert(record).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLessonTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_lesson_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createPlanFromTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        templateId: UUID.optional(),
        builtInKey: z.string().optional(),
        date: z.string(),
        classId: UUID.nullable().optional(),
        teacherId: UUID.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let tpl:
      | {
          name: string;
          description: string | null;
          modality: string | null;
          category: string | null;
          age_range: string | null;
          color: string | null;
          objectives: string | null;
          duration_min: number | null;
          blocks: unknown;
        }
      | null = null;

    if (data.templateId) {
      const { data: row, error } = await context.supabase
        .from("dojo_lesson_templates")
        .select("*")
        .eq("id", data.templateId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      tpl = row as typeof tpl;
    } else if (data.builtInKey) {
      const built = BUILT_IN_TEMPLATES.find((t) => t.key === data.builtInKey);
      if (!built) throw new Error("Modelo não encontrado");
      tpl = {
        name: built.name,
        description: built.description,
        modality: built.modality ?? null,
        category: built.category ?? null,
        age_range: built.age_range ?? null,
        color: built.color ?? null,
        objectives: built.objectives ?? null,
        duration_min: built.duration_min ?? null,
        blocks: built.blocks.map((b) => ({ ...b, id: crypto.randomUUID(), items: b.items ?? [] })),
      };
    }
    if (!tpl) throw new Error("Modelo inválido");

    const { data: row, error } = await context.supabase
      .from("dojo_lesson_plans")
      .insert({
        owner_id: context.userId,
        created_by: context.userId,
        title: tpl.name,
        modality: tpl.modality,
        category: tpl.category,
        age_range: tpl.age_range,
        color: tpl.color,
        objectives: tpl.objectives,
        duration_min: tpl.duration_min,
        blocks: tpl.blocks,
        date: data.date,
        status: "planejada",
        class_id: data.classId ?? null,
        teacher_id: data.teacherId ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Templates prontos (opt-in, não semeiam banco)
type BuiltInBlock = {
  kind:
    | "warmup"
    | "stretching"
    | "fundamentals"
    | "techniques"
    | "exercises"
    | "sparring"
    | "conditioning"
    | "closing"
    | "custom";
  title: string;
  duration_min: number;
  description?: string;
  items?: { name: string; description?: string }[];
};
type BuiltInTemplate = {
  key: string;
  name: string;
  description: string;
  modality?: string;
  category?: string;
  age_range?: string;
  color?: string;
  objectives?: string;
  duration_min?: number;
  blocks: BuiltInBlock[];
};

const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: "infantil",
    name: "Aula Infantil (6–10 anos)",
    description: "Aula lúdica com foco em coordenação, disciplina e fundamentos básicos.",
    category: "Infantil",
    age_range: "6-10 anos",
    color: "#f59e0b",
    duration_min: 60,
    objectives: "Desenvolver coordenação motora, disciplina e prazer pelo treino.",
    blocks: [
      { kind: "warmup", title: "Brincadeiras de aquecimento", duration_min: 10 },
      { kind: "fundamentals", title: "Fundamentos básicos", duration_min: 15 },
      { kind: "techniques", title: "Técnica lúdica do dia", duration_min: 15 },
      { kind: "exercises", title: "Circuito recreativo", duration_min: 15 },
      { kind: "closing", title: "Encerramento e valores", duration_min: 5 },
    ],
  },
  {
    key: "adulto",
    name: "Aula Adulto (padrão)",
    description: "Estrutura clássica para turmas adultas mistas.",
    category: "Adulto",
    color: "#2563eb",
    duration_min: 75,
    blocks: [
      { kind: "warmup", title: "Aquecimento", duration_min: 10 },
      { kind: "stretching", title: "Alongamento", duration_min: 5 },
      { kind: "fundamentals", title: "Fundamentos", duration_min: 15 },
      { kind: "techniques", title: "Técnicas principais", duration_min: 25 },
      { kind: "sparring", title: "Sparring / Randori", duration_min: 15 },
      { kind: "closing", title: "Encerramento", duration_min: 5 },
    ],
  },
  {
    key: "competicao",
    name: "Preparação para Competição",
    description: "Foco em intensidade, sparring e situações específicas de luta.",
    category: "Competição",
    color: "#dc2626",
    duration_min: 90,
    blocks: [
      { kind: "warmup", title: "Aquecimento específico", duration_min: 15 },
      { kind: "conditioning", title: "Condicionamento", duration_min: 15 },
      { kind: "techniques", title: "Situações de luta", duration_min: 20 },
      { kind: "sparring", title: "Sparring competitivo", duration_min: 30 },
      { kind: "closing", title: "Volta à calma e análise", duration_min: 10 },
    ],
  },
  {
    key: "exame",
    name: "Aula de Exame / Graduação",
    description: "Revisão completa dos conteúdos exigidos para a próxima faixa.",
    category: "Exame",
    color: "#7c3aed",
    duration_min: 90,
    blocks: [
      { kind: "warmup", title: "Aquecimento", duration_min: 10 },
      { kind: "fundamentals", title: "Revisão de fundamentos", duration_min: 20 },
      { kind: "techniques", title: "Técnicas do programa", duration_min: 30 },
      { kind: "sparring", title: "Aplicação em sparring", duration_min: 20 },
      { kind: "closing", title: "Feedback individual", duration_min: 10 },
    ],
  },
  {
    key: "iniciantes",
    name: "Turma de Iniciantes",
    description: "Base técnica, terminologia e etiqueta do dojo.",
    category: "Iniciantes",
    color: "#10b981",
    duration_min: 60,
    blocks: [
      { kind: "warmup", title: "Aquecimento leve", duration_min: 10 },
      { kind: "fundamentals", title: "Postura, quedas e deslocamentos", duration_min: 20 },
      { kind: "techniques", title: "1 técnica nova (repetição lenta)", duration_min: 20 },
      { kind: "closing", title: "Encerramento e dúvidas", duration_min: 10 },
    ],
  },
  {
    key: "avancado",
    name: "Turma Avançada",
    description: "Alta intensidade, técnicas encadeadas e sparring temático.",
    category: "Avançado",
    color: "#0f172a",
    duration_min: 90,
    blocks: [
      { kind: "warmup", title: "Aquecimento dinâmico", duration_min: 10 },
      { kind: "techniques", title: "Encadeamentos e combinações", duration_min: 30 },
      { kind: "sparring", title: "Sparring temático", duration_min: 30 },
      { kind: "conditioning", title: "Finalizador metabólico", duration_min: 15 },
      { kind: "closing", title: "Alongamento e fechamento", duration_min: 5 },
    ],
  },
  {
    key: "feminino",
    name: "Turma Feminina",
    description: "Autodefesa aplicada, técnica e condicionamento.",
    category: "Feminino",
    color: "#ec4899",
    duration_min: 60,
    blocks: [
      { kind: "warmup", title: "Aquecimento", duration_min: 10 },
      { kind: "fundamentals", title: "Autodefesa – base", duration_min: 15 },
      { kind: "techniques", title: "Técnicas aplicadas", duration_min: 20 },
      { kind: "conditioning", title: "Condicionamento", duration_min: 10 },
      { kind: "closing", title: "Alongamento e fechamento", duration_min: 5 },
    ],
  },
  {
    key: "prep-fisica",
    name: "Preparação Física",
    description: "Trabalho específico de força, resistência e mobilidade para lutadores.",
    category: "Prep. Física",
    color: "#0891b2",
    duration_min: 60,
    blocks: [
      { kind: "warmup", title: "Ativação e mobilidade", duration_min: 10 },
      { kind: "exercises", title: "Força específica", duration_min: 20 },
      { kind: "conditioning", title: "Condicionamento (HIIT / circuito)", duration_min: 20 },
      { kind: "closing", title: "Alongamento e recuperação", duration_min: 10 },
    ],
  },
];

export const getBuiltInLessonTemplates = createServerFn({ method: "GET" }).handler(async () => {
  return BUILT_IN_TEMPLATES.map((t) => ({
    key: t.key,
    name: t.name,
    description: t.description,
    category: t.category,
    color: t.color,
    duration_min: t.duration_min,
    block_count: t.blocks.length,
  }));
});

// ================================================================
// DASHBOARD STATS
// ================================================================
export const lessonPlansDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [plannedWeek, doneWeek, plansAll, classesActive, next] = await Promise.all([
      context.supabase
        .from("dojo_lesson_plans")
        .select("id, duration_min", { count: "exact" })
        .eq("status", "planejada")
        .gte("date", fmt(monday))
        .lt("date", fmt(sunday)),
      context.supabase
        .from("dojo_lesson_plans")
        .select("id, duration_min", { count: "exact" })
        .eq("status", "ministrada")
        .gte("date", fmt(monday))
        .lt("date", fmt(sunday)),
      context.supabase.from("dojo_lesson_plans").select("id, status, duration_min"),
      context.supabase.from("dojo_classes").select("id", { count: "exact", head: true }),
      context.supabase
        .from("dojo_lesson_plans")
        .select("id, title, date, start_time, dojo_classes(name)")
        .eq("status", "planejada")
        .gte("date", fmt(now))
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const plans = plansAll.data ?? [];
    const totalPlannedMin = plans
      .filter((p) => p.status === "planejada")
      .reduce((s, p) => s + (p.duration_min ?? 0), 0);
    const totalDoneMin = plans
      .filter((p) => p.status === "ministrada")
      .reduce((s, p) => s + (p.duration_min ?? 0), 0);

    return {
      week_planned: plannedWeek.count ?? 0,
      week_done: doneWeek.count ?? 0,
      pending: plans.filter((p) => p.status === "planejada").length,
      total_planned_min: totalPlannedMin,
      total_done_min: totalDoneMin,
      active_classes: classesActive.count ?? 0,
      next_lesson: next.data ?? null,
    };
  });

// ================================================================
// CONTENT LIBRARY
// ================================================================
export const listContentLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ modality: z.string().optional(), search: z.string().optional() })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_lesson_content_library")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.modality) q = q.eq("modality", data.modality);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertContentLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: UUID.optional(),
        name: z.string().min(1),
        category: z.string().nullable().optional(),
        modality: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        video_url: z.string().nullable().optional(),
        pdf_url: z.string().nullable().optional(),
        tags: z.array(z.string()).default([]),
        avg_time_min: z.number().nullable().optional(),
        recommended_belt: z.string().nullable().optional(),
        recommended_age: z.string().nullable().optional(),
        technical_level: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const record = { ...rest, owner_id: context.userId };
    const { data: row, error } = id
      ? await context.supabase
          .from("dojo_lesson_content_library")
          .update(record)
          .eq("id", id)
          .select()
          .single()
      : await context.supabase
          .from("dojo_lesson_content_library")
          .insert(record)
          .select()
          .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteContentLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_lesson_content_library")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================================================================
// TECHNIQUES BANK
// ================================================================
export const listTechniques = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ modality: z.string().optional(), search: z.string().optional() })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_techniques_bank")
      .select("*")
      .order("modality", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(1000);
    if (data.modality) q = q.eq("modality", data.modality);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertTechnique = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: UUID.optional(),
        modality: z.string().min(1),
        category: z.string().nullable().optional(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        video_url: z.string().nullable().optional(),
        difficulty: z.string().nullable().optional(),
        recommended_belt: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const record = { ...rest, owner_id: context.userId };
    const { data: row, error } = id
      ? await context.supabase.from("dojo_techniques_bank").update(record).eq("id", id).select().single()
      : await context.supabase.from("dojo_techniques_bank").insert(record).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTechnique = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_techniques_bank").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Preset structural (não semeia banco — retorna catálogo para inserção opt-in)
export const getTechniquePresets = createServerFn({ method: "GET" }).handler(async () => {
  return [
    { modality: "Judô", category: "Nage Waza (projeções)", examples: ["O-Goshi", "Ippon Seoi Nage", "Uchi Mata", "Harai Goshi"] },
    { modality: "Judô", category: "Katame Waza (imobilizações)", examples: ["Kesa Gatame", "Kami Shiho Gatame", "Yoko Shiho Gatame"] },
    { modality: "Judô", category: "Shime Waza (estrangulamentos)", examples: ["Hadaka Jime", "Okuri Eri Jime"] },
    { modality: "Judô", category: "Kansetsu Waza (chaves)", examples: ["Juji Gatame", "Ude Garami"] },
    { modality: "Judô", category: "Ukemi (quedas)", examples: ["Mae Ukemi", "Ushiro Ukemi", "Yoko Ukemi"] },
    { modality: "Jiu-Jitsu", category: "Passagens", examples: ["Passagem em pé", "Toreando", "Sobre a perna"] },
    { modality: "Jiu-Jitsu", category: "Raspagens", examples: ["Raspagem de gancho", "Raspagem borboleta"] },
    { modality: "Jiu-Jitsu", category: "Finalizações", examples: ["Triângulo", "Armlock", "Kimura", "Mata leão"] },
    { modality: "Jiu-Jitsu", category: "Defesas", examples: ["Defesa de mata leão", "Recomposição de guarda"] },
    { modality: "Karatê", category: "Kihon", examples: ["Oi-Zuki", "Gyaku-Zuki", "Mae-Geri"] },
    { modality: "Karatê", category: "Kata", examples: ["Heian Shodan", "Heian Nidan"] },
    { modality: "Karatê", category: "Kumite", examples: ["Kihon Ippon Kumite", "Jiyu Kumite"] },
    { modality: "Muay Thai", category: "Chutes", examples: ["Low kick", "Middle kick", "High kick"] },
    { modality: "Muay Thai", category: "Joelhadas", examples: ["Joelhada reta", "Joelhada no clinch"] },
    { modality: "Muay Thai", category: "Cotoveladas", examples: ["Cotovelada horizontal", "Cotovelada de cima"] },
    { modality: "Muay Thai", category: "Clinch", examples: ["Pescoçada", "Controle de cabeça"] },
    { modality: "Taekwondo", category: "Poomsae", examples: ["Taegeuk Il-Jang", "Taegeuk I-Jang"] },
    { modality: "Taekwondo", category: "Chutes", examples: ["Ap Chagi", "Dollyo Chagi", "Yop Chagi"] },
    { modality: "Taekwondo", category: "Defesas", examples: ["Arae Makki", "Momtong Makki"] },
  ];
});
