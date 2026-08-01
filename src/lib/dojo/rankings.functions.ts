import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRESENT_STATUSES } from "@/lib/dojo/attendance-status";
import { resolvePeriodRange } from "@/lib/dojo/periods";

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

    // Confirma que o usuário é dono da turma (ou admin)
    const { data: cls, error: clsErr } = await supabase
      .from("dojo_classes")
      .select("id, owner_id")
      .eq("id", data.classId)
      .maybeSingle();
    if (clsErr) throw new Error(clsErr.message);
    if (!cls) throw new Error("Turma não encontrada");
    if (cls.owner_id !== userId) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) throw new Error("Sem permissão para esta turma");
    }

    // Janela temporal (calendário civil no fuso do Brasil)
    const { since: sinceIso, until: untilIso } = resolvePeriodRange(data.period);


    // Busca matrículas da turma (sem RLS bloqueando: o owner sempre vê seus alunos).
    // Usamos service-role para garantir que alunos com owner_id divergente por bug
    // histórico também apareçam no ranking do dono da turma.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: enrollments, error: enrErr } = await supabaseAdmin
      .from("dojo_class_students")
      .select("student_id")
      .eq("class_id", data.classId);
    if (enrErr) throw new Error(enrErr.message);

    const studentIds = (enrollments ?? []).map((r: any) => r.student_id).filter(Boolean);
    if (studentIds.length === 0) return { students: [], counts: {} };

    const { data: studentRows, error: stErr } = await supabaseAdmin
      .from("dojo_students")
      .select("id, full_name, photo_url, current_belt_id, current_degree, status")
      .in("id", studentIds);
    if (stErr) throw new Error(stErr.message);

    // Conta TODOS os check-ins do aluno (mesma leitura do perfil do aluno):
    // não filtra por class_id nem por status — reflete o total exibido em
    // "Frequência → Total" na ficha individual.
    let attQuery = supabaseAdmin
      .from("dojo_attendance")
      .select("student_id, checked_in_at")
      .in("student_id", studentIds)
      .in("status", PRESENT_STATUSES as unknown as string[]);
    if (sinceIso) attQuery = attQuery.gte("checked_in_at", sinceIso);
    if (untilIso) attQuery = attQuery.lt("checked_in_at", untilIso);

    const { data: attendance, error: attErr } = await attQuery;
    if (attErr) throw new Error(attErr.message);

    const counts: Record<string, number> = {};
    for (const id of studentIds) counts[id] = 0;
    for (const a of attendance ?? []) {
      const sid = (a as any).student_id as string;
      counts[sid] = (counts[sid] ?? 0) + 1;
    }

    const students = (studentRows ?? []).map((s: any) => ({
      id: s.id,
      full_name: s.full_name,
      photo_url: s.photo_url,
      current_belt_id: s.current_belt_id,
      current_degree: s.current_degree,
      status: s.status,
    }));

    return { students, counts };
  });
