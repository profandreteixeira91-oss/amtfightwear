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
    const { supabase, userId } = context;

    // 1) Alunos matriculados na turma
    const { data: enrollments, error: enrErr } = await supabase
      .from("dojo_class_students")
      .select("student_id, status, dojo_students!inner(id, full_name, photo_url, status, current_belt_id, current_degree)")
      .eq("owner_id", userId)
      .eq("class_id", data.classId);
    if (enrErr) throw new Error(enrErr.message);

    const students = (enrollments ?? [])
      .map((e: any) => e.dojo_students)
      .filter(Boolean);

    if (students.length === 0) return { students: [], counts: {} as Record<string, number> };

    // 2) Janela temporal
    let sinceIso: string | null = null;
    const now = new Date();
    if (data.period === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7); sinceIso = d.toISOString();
    } else if (data.period === "month") {
      const d = new Date(now); d.setMonth(d.getMonth() - 1); sinceIso = d.toISOString();
    } else if (data.period === "year") {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1); sinceIso = d.toISOString();
    }

    // 3) Check-ins da turma
    const studentIds = students.map((s: any) => s.id);
    let query = supabase
      .from("dojo_attendance")
      .select("student_id")
      .eq("owner_id", userId)
      .eq("class_id", data.classId)
      .eq("status", "present")
      .in("student_id", studentIds);
    if (sinceIso) query = query.gte("checked_in_at", sinceIso);

    const { data: attendance, error: attErr } = await query;
    if (attErr) throw new Error(attErr.message);

    const counts: Record<string, number> = {};
    for (const row of attendance ?? []) {
      const sid = (row as any).student_id as string | null;
      if (!sid) continue;
      counts[sid] = (counts[sid] ?? 0) + 1;
    }

    return { students, counts };
  });
