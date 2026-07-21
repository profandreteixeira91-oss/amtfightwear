import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Lista turmas do dojo ----------
export const listRankingClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_classes")
      .select("id, name, modality, level, color, teacher_name, status")
      .eq("owner_id", context.userId)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Ranking por turma ----------
export const getClassRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      classId: z.string().uuid(),
      period: z.enum(["all", "year", "month", "week"]).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Janela temporal
    let sinceIso: string | null = null;
    const now = new Date();
    if (data.period === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7); sinceIso = d.toISOString();
    } else if (data.period === "month") {
      const d = new Date(now); d.setMonth(d.getMonth() - 1); sinceIso = d.toISOString();
    } else if (data.period === "year") {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1); sinceIso = d.toISOString();
    }

    // Usa RPC SECURITY DEFINER: retorna TODOS os alunos matriculados na turma
    // (a autorização é "ser dono da turma"), evitando que a RLS de dojo_students
    // esconda alunos com owner_id divergente.
    const { data: rows, error } = await supabase.rpc("get_class_ranking", {
      _class_id: data.classId,
      _since: sinceIso ?? undefined,
    });
    if (error) throw new Error(error.message);

    const students = (rows ?? []).map((r: any) => ({
      id: r.student_id,
      full_name: r.full_name,
      photo_url: r.photo_url,
      current_belt_id: r.current_belt_id,
      current_degree: r.current_degree,
      status: r.status,
    }));
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) counts[(r as any).student_id] = Number((r as any).checkins ?? 0);

    return { students, counts };
  });
