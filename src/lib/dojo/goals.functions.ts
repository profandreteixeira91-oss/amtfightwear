import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRESENT_STATUSES } from "@/lib/dojo/attendance-status";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Metas & Objetivos do Atleta — Fase 2 da Análise Individual.
 * Toda operação valida ownership do aluno (owner do dojo).
 */

async function assertOwnership(supabase: any, userId: string, studentId: string) {
  const { data, error } = await supabase
    .from("dojo_students")
    .select("id, owner_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Aluno não encontrado");
  if (data.owner_id !== userId) {
    const { data: isMine } = await supabase.rpc("is_my_student", { _id: studentId });
    if (isMine) return data;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Sem permissão");
  }

  return data;
}

const goalTypeEnum = z.enum(["attendance", "graduation", "competition", "evaluation", "custom"]);
const goalStatusEnum = z.enum(["active", "completed", "paused", "cancelled"]);
const goalPriorityEnum = z.enum(["low", "medium", "high"]);

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  goalType: goalTypeEnum,
  targetValue: z.number().min(0),
  unit: z.string().trim().max(30).optional().nullable(),
  startDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  status: goalStatusEnum.optional(),
  priority: goalPriorityEnum.optional(),
  targetBeltId: z.string().uuid().optional().nullable(),
  targetDegree: z.number().int().min(0).max(20).optional().nullable(),
  autoProgress: z.boolean().optional(),
});

// Calcula progresso automático conforme o tipo
async function computeAutoProgress(supabase: any, goal: any): Promise<number> {
  const start = goal.start_date ? new Date(goal.start_date).toISOString() : new Date(0).toISOString();
  if (goal.goal_type === "attendance") {
    const { count } = await supabase
      .from("dojo_attendance")
      .select("id", { count: "exact", head: true })
      .eq("student_id", goal.student_id)
      .in("status", PRESENT_STATUSES as unknown as string[])
      .gte("checked_in_at", start);
    return Number(count ?? 0);
  }
  if (goal.goal_type === "graduation") {
    // 1 = já graduado para faixa/grau alvo desde start
    const q = supabase
      .from("dojo_graduations")
      .select("id, degree, belt_id, graduation_date")
      .eq("student_id", goal.student_id)
      .gte("graduation_date", (goal.start_date ?? "1970-01-01"));
    const { data: grads } = await q;
    const match = (grads ?? []).some((g: any) =>
      (!goal.target_belt_id || g.belt_id === goal.target_belt_id) &&
      (goal.target_degree == null || Number(g.degree ?? 0) >= Number(goal.target_degree)),
    );
    return match ? Number(goal.target_value || 1) : 0;
  }
  if (goal.goal_type === "competition") {
    const { data: rows } = await supabase
      .from("academy_competition_athletes")
      .select("id, academy_competition_id, academy_competitions(competitions(start_at))")
      .eq("student_id", goal.student_id);
    const cnt = (rows ?? []).filter((r: any) => {
      const dt = r.academy_competitions?.competitions?.start_at;
      return dt && dt >= (goal.start_date ?? "1970-01-01");
    }).length;
    return cnt;
  }
  if (goal.goal_type === "evaluation") {
    const { data: rows } = await supabase
      .from("dojo_eval_sessions")
      .select("percentage, finished_at")
      .eq("student_id", goal.student_id)
      .not("finished_at", "is", null)
      .gte("finished_at", start)
      .order("finished_at", { ascending: false })
      .limit(1);
    return rows?.[0]?.percentage ? Number(rows[0].percentage) : 0;
  }
  return Number(goal.current_value ?? 0);
}

export const listAthleteGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ studentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOwnership(supabase, userId, data.studentId);
    const { data: goals, error } = await supabase
      .from("dojo_athlete_goals")
      .select("*, dojo_belts:target_belt_id(id, name, color_hex, modality)")
      .eq("student_id", data.studentId)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Atualiza progresso automático em memória (não persiste) para exibição sempre atualizada
    const enriched = await Promise.all(
      (goals ?? []).map(async (g: any) => {
        if (!g.auto_progress || g.status !== "active") return g;
        try {
          const cur = await computeAutoProgress(supabase, g);
          return { ...g, current_value: cur };
        } catch {
          return g;
        }
      }),
    );
    return enriched;
  });

export const upsertAthleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const owner = await assertOwnership(supabase, userId, data.studentId);

    const payload: any = {
      owner_id: owner.owner_id,
      student_id: data.studentId,
      title: data.title,
      description: data.description ?? null,
      goal_type: data.goalType,
      target_value: data.targetValue,
      unit: data.unit ?? null,
      start_date: data.startDate ?? new Date().toISOString().slice(0, 10),
      due_date: data.dueDate ?? null,
      status: data.status ?? "active",
      priority: data.priority ?? "medium",
      target_belt_id: data.targetBeltId ?? null,
      target_degree: data.targetDegree ?? null,
      auto_progress: data.autoProgress ?? true,
    };

    if (data.id) {
      const { data: row, error } = await supabase
        .from("dojo_athlete_goals")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await supabase
      .from("dojo_athlete_goals")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const setGoalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), status: goalStatusEnum }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: g } = await supabase
      .from("dojo_athlete_goals")
      .select("student_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!g) throw new Error("Meta não encontrada");
    await assertOwnership(supabase, userId, g.student_id);
    const patch: any = { status: data.status };
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    if (data.status !== "completed") patch.completed_at = null;
    const { error } = await supabase.from("dojo_athlete_goals").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateGoalProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), currentValue: z.number().min(0) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: g } = await supabase
      .from("dojo_athlete_goals")
      .select("student_id, target_value, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!g) throw new Error("Meta não encontrada");
    await assertOwnership(supabase, userId, g.student_id);
    const patch: any = { current_value: data.currentValue, auto_progress: false };
    if (g.status === "active" && data.currentValue >= Number(g.target_value || 0)) {
      patch.status = "completed";
      patch.completed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("dojo_athlete_goals").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAthleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: g } = await supabase
      .from("dojo_athlete_goals")
      .select("student_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!g) throw new Error("Meta não encontrada");
    await assertOwnership(supabase, userId, g.student_id);
    const { error } = await supabase.from("dojo_athlete_goals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOwnerBeltsForGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dojo_belts")
      .select("id, name, modality, color_hex, max_degrees")
      .or(`owner_id.eq.${userId},owner_id.is.null`)
      .order("modality", { ascending: true })
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
