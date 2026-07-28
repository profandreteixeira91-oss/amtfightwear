import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types ----------
export type EvalCriterion = {
  id: string;
  name: string;
  description?: string | null;
  weight: number;
  max_score: number;
  min_score: number;
  required: boolean;
  eliminatory: boolean;
  techniques: string[]; // technique ids
};
export type EvalCategoryNode = {
  id: string;
  name: string;
  weight: number;
  criteria: EvalCriterion[];
};
export type EvalStructure = { categories: EvalCategoryNode[] };

// ---------- Templates ----------
export const listEvalTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_evaluations")
      .select("id,title,method,modality,version,active,total_score,structure,updated_at")
      .eq("is_library", false)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listLibraryTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_evaluations")
      .select("id,title,method,modality,description,structure,total_score")
      .eq("is_library", true)
      .order("modality", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEvalTemplate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_evaluations")
      .select("*, belt:dojo_belts!dojo_evaluations_belt_id_fkey(name,color_hex,stripe_hex,max_degrees,modality,visual,variants)")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

const structureSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
    criteria: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional().nullable(),
      weight: z.number(),
      max_score: z.number(),
      min_score: z.number(),
      required: z.boolean(),
      eliminatory: z.boolean(),
      techniques: z.array(z.string()),
    })),
  })),
});

export const saveEvalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    modality: z.string().max(80).optional().nullable(),
    category: z.string().max(80).optional().nullable(),
    belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    end_belt_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    degree: z.number().int().min(0).max(10).default(0),
    teacher_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    min_training_months: z.number().int().min(0).optional().nullable(),
    min_attendance: z.number().int().min(0).optional().nullable(),
    observations: z.string().max(4000).optional().nullable(),
    method: z.enum(["numeric", "checklist", "pass_fail", "scale", "rubric", "concept"]).default("numeric"),
    scale: z.record(z.string(), z.any()).optional(),
    structure: structureSchema,
    passing_score: z.number().min(0).optional().nullable(),
    active: z.boolean().optional(),
    auto_graduate: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const total = data.structure.categories.reduce(
      (s, c) => s + c.criteria.reduce((sc, cr) => sc + Number(cr.max_score || 0), 0),
      0,
    );
    const payload = {
      title: data.title,
      description: data.description ?? null,
      modality: data.modality ?? null,
      category: data.category ?? null,
      belt_id: data.belt_id ?? null,
      end_belt_id: data.end_belt_id ?? null,
      degree: data.degree,
      teacher_id: data.teacher_id ?? null,
      min_training_months: data.min_training_months ?? null,
      min_attendance: data.min_attendance ?? null,
      observations: data.observations ?? null,
      method: data.method,
      scale: data.scale ?? {},
      structure: data.structure,
      passing_score: data.passing_score ?? null,
      total_score: total,
      active: data.active ?? true,
      auto_graduate: data.auto_graduate ?? false,
      items: [],
      is_library: false,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("dojo_evaluations")
        .update(payload as never)
        .eq("id", data.id)
        .select("*, belt:dojo_belts!dojo_evaluations_belt_id_fkey(name,color_hex,stripe_hex,max_degrees,modality,visual,variants)")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("dojo_evaluations")
      .insert({ ...payload, owner_id: context.userId } as never)
      .select("*, belt:dojo_belts!dojo_evaluations_belt_id_fkey(name,color_hex,stripe_hex,max_degrees,modality,visual,variants)").single();
    if (error) throw new Error(error.message);
    return row;

  });

export const duplicateEvalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: src, error } = await context.supabase
      .from("dojo_evaluations").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const copy: Record<string, unknown> = {
      owner_id: context.userId,
      is_library: false,
      parent_template_id: src.id,
      title: src.is_library ? src.title.replace(/ — .*/, "") + " (cópia)" : `${src.title} (cópia)`,
      description: src.description,
      modality: src.modality,
      category: src.category,
      belt_id: src.belt_id,
      end_belt_id: src.end_belt_id,
      degree: src.degree,
      teacher_id: src.teacher_id,
      min_training_months: src.min_training_months,
      min_attendance: src.min_attendance,
      observations: src.observations,
      method: src.method,
      scale: src.scale,
      structure: src.structure,
      passing_score: src.passing_score,
      total_score: src.total_score,
      active: true,
      version: 1,
      items: src.items ?? [],
      auto_graduate: src.auto_graduate ?? false,
    };
    const { data: row, error: e2 } = await context.supabase
      .from("dojo_evaluations").insert(copy as never)
      .select("*, belt:dojo_belts!dojo_evaluations_belt_id_fkey(name,color_hex,stripe_hex,max_degrees,modality,visual,variants)")
      .single();
    if (e2) throw new Error(e2.message);
    return row;
  });

export const deleteEvalTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_evaluations").delete().eq("id", data.id).eq("is_library", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Categories ----------
export const listEvalCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_eval_categories").select("*")
      .order("order_index").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveEvalCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().max(40).optional().nullable(),
    color: z.string().max(20).optional().nullable(),
    order_index: z.number().int().optional(),
    archived: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
      order_index: data.order_index ?? 0,
      archived: data.archived ?? false,
    };
    if (data.id) {
      const { error } = await context.supabase.from("dojo_eval_categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("dojo_eval_categories").insert({ ...payload, owner_id: context.userId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteEvalCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_eval_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Techniques ----------
export const listEvalTechniques = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_eval_techniques")
      .select("*, category:dojo_eval_categories(name,color)")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveEvalTechnique = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    category_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    image_url: z.string().url().optional().nullable().or(z.literal("")),
    video_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional().nullable(),
    default_score: z.number().min(0).max(1000).default(10),
    required: z.boolean().optional(),
    estimated_seconds: z.number().int().min(0).optional().nullable(),
    tags: z.array(z.string()).optional(),
    observations: z.string().max(2000).optional().nullable(),
    archived: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      category_id: data.category_id ?? null,
      image_url: data.image_url || null,
      video_id: data.video_id ?? null,
      default_score: data.default_score,
      required: data.required ?? false,
      estimated_seconds: data.estimated_seconds ?? null,
      tags: data.tags ?? [],
      observations: data.observations ?? null,
      archived: data.archived ?? false,
    };
    if (data.id) {
      const { error } = await context.supabase.from("dojo_eval_techniques").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("dojo_eval_techniques").insert({ ...payload, owner_id: context.userId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteEvalTechnique = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_eval_techniques").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Sessions ----------
export const listEvalSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    status: z.string().optional(),
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido").optional(),
  }).optional().parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_eval_sessions")
      .select("*, student:dojo_students(full_name,photo_url,belt_id), template:dojo_evaluations(title,method,passing_score,total_score)")
      .order("updated_at", { ascending: false });
    if (data?.status) q = q.eq("status", data.status);
    if (data?.student_id) q = q.eq("student_id", data.student_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getEvalSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("dojo_eval_sessions")
      .select("*, student:dojo_students(*, belt:dojo_belts(name,color_hex,stripe_hex)), template:dojo_evaluations(*)")
      .eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createEvalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    template_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    student_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    scheduled_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: tpl } = await context.supabase
      .from("dojo_evaluations").select("total_score, title").eq("id", data.template_id).single();
    const { data: row, error } = await context.supabase
      .from("dojo_eval_sessions").insert({
        owner_id: context.userId,
        template_id: data.template_id,
        student_id: data.student_id,
        evaluator_id: context.userId,
        scheduled_at: data.scheduled_at ?? null,
        status: data.scheduled_at ? "scheduled" : "draft",
        max_score: tpl?.total_score ?? 0,
      }).select("id").single();
    if (error) throw new Error(error.message);
    try {
      const { safeNotifyStudent } = await import("@/lib/push/push.server");
      const when = data.scheduled_at
        ? ` em ${new Date(data.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
        : "";
      safeNotifyStudent(data.student_id, {
        title: data.scheduled_at ? "Avaliação agendada 📋" : "Nova avaliação criada",
        body: `${(tpl as any)?.title ?? "Avaliação"}${when}`,
        url: "/app/avaliacoes",
        tag: `eval-session-${row.id}`,
      });
    } catch {}
    return { id: row.id };
  });

export const updateEvalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    status: z.string().optional(),
    scores: z.record(z.string(), z.any()).optional(),
    observations: z.string().optional().nullable(),
    attachments: z.array(z.any()).optional(),
    started_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.scores !== undefined) patch.scores = data.scores;
    if (data.observations !== undefined) patch.observations = data.observations;
    if (data.attachments !== undefined) patch.attachments = data.attachments;
    if (data.started_at !== undefined) patch.started_at = data.started_at;

    // Recompute total from scores
    if (data.scores) {
      let total = 0;
      for (const v of Object.values(data.scores)) {
        if (typeof v === "number") total += v;
        else if (v && typeof v === "object" && typeof (v as any).score === "number") total += (v as any).score;
      }
      patch.total_score = total;

      const { data: sess } = await context.supabase
        .from("dojo_eval_sessions").select("max_score").eq("id", data.id).single();
      const max = sess?.max_score ?? 0;
      patch.percentage = max > 0 ? Math.round((total / max) * 10000) / 100 : 0;
    }

    const { error } = await context.supabase
      .from("dojo_eval_sessions").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finishEvalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    result: z.enum(["approved", "failed", "review", "conditional"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: sess } = await context.supabase
      .from("dojo_eval_sessions")
      .select("*, template:dojo_evaluations(auto_graduate,end_belt_id,degree)")
      .eq("id", data.id).single();

    const { error } = await context.supabase
      .from("dojo_eval_sessions").update({
        status: "done",
        result: data.result,
        finished_at: now,
      }).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Auto-graduate if approved
    if (data.result === "approved" && sess?.template?.auto_graduate && sess.template.end_belt_id) {
      await context.supabase.from("dojo_graduations").insert({
        owner_id: context.userId,
        student_id: sess.student_id,
        belt_id: sess.template.end_belt_id,
        degree: sess.template.degree ?? 0,
        graduated_at: now,
      } as never);
    }
    return { ok: true };
  });

export const deleteEvalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_eval_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Plans ----------
export const getEvalPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ session_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido") }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("dojo_eval_plans").select("*").eq("session_id", data.session_id).maybeSingle();
    return row;
  });

export const saveEvalPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    session_id: z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido"),
    strong_points: z.string().optional().nullable(),
    improvement_points: z.string().optional().nullable(),
    recommended_techniques: z.array(z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido")).optional(),
    recommended_videos: z.array(z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "UUID inválido")).optional(),
    comments: z.string().optional().nullable(),
    next_evaluation_at: z.string().optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const payload = {
      owner_id: context.userId,
      session_id: data.session_id,
      strong_points: data.strong_points ?? null,
      improvement_points: data.improvement_points ?? null,
      recommended_techniques: data.recommended_techniques ?? [],
      recommended_videos: data.recommended_videos ?? [],
      comments: data.comments ?? null,
      next_evaluation_at: data.next_evaluation_at ?? null,
    };
    const { data: existing } = await context.supabase
      .from("dojo_eval_plans").select("id").eq("session_id", data.session_id).maybeSingle();
    if (existing) {
      const { error } = await context.supabase.from("dojo_eval_plans").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id };
    }
    const { data: row, error } = await context.supabase
      .from("dojo_eval_plans").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// ---------- Dashboard ----------
export const evalDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sessions, templates] = await Promise.all([
      context.supabase.from("dojo_eval_sessions").select("status,result,total_score,max_score,percentage,finished_at,created_at,evaluator_id"),
      context.supabase.from("dojo_evaluations").select("id").eq("is_library", false),
    ]);
    const rows = sessions.data ?? [];
    const done = rows.filter(r => r.status === "done");
    const approved = done.filter(r => r.result === "approved").length;
    const failed = done.filter(r => r.result === "failed").length;
    const pending = rows.filter(r => r.status === "draft" || r.status === "in_progress").length;
    const scheduled = rows.filter(r => r.status === "scheduled").length;
    const avg = done.length > 0
      ? Math.round(done.reduce((s, r) => s + Number(r.percentage || 0), 0) / done.length)
      : 0;

    // Monthly counts (last 6 months)
    const monthly: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      monthly[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    for (const r of done) {
      if (!r.finished_at) continue;
      const d = new Date(r.finished_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthly) monthly[key]++;
    }

    return {
      total_done: done.length,
      pending,
      scheduled,
      approved,
      failed,
      avg_percentage: avg,
      templates_count: templates.data?.length ?? 0,
      monthly: Object.entries(monthly).map(([month, count]) => ({ month, count })),
    };
  });
