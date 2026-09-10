import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";
import { resolvePeriodRange } from "@/lib/dojo/periods";

import { fetchActiveStudent } from "./_me";

/** Status que contam como presença efetiva no ranking. */
const PRESENT_STATUSES = ["present", "late"] as const;

/**
 * PostgREST devolve no máximo 1000 linhas por requisição. Sem paginação, o
 * ranking de academias com mais de 1000 check-ins no período era TRUNCADO,
 * subcontando os alunos (causa da divergência "48 no histórico × 38 no total").
 */
const PAGE = 1000;
async function collectAttendance(
  build: () => any,
): Promise<{ student_id: string | null }[]> {
  const out: { student_id: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { student_id: string | null }[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/**
 * Ranking do aluno (portal do aluno):
 * - Lista as turmas em que o aluno está matriculado
 * - Se `classId` for informado, calcula o ranking daquela turma (check-ins
 *   restritos ao class_id da turma escolhida). Caso o aluno esteja
 *   matriculado apenas em uma turma, ela é usada automaticamente.
 * - Sempre retorna o total de check-ins do próprio aluno (soma geral).
 */
export const getMyClassRanking = createServerFn({ method: "GET" })
  .middleware([requireStudentAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        classId: z.string().uuid().optional(),
        period: z.enum(["all", "year", "month", "week"]).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    // 1) Identifica o aluno autenticado
    const me = await fetchActiveStudent<{ id: string; owner_id: string }>(
      context.supabase,
      "id, owner_id",
    );
    if (!me) throw new Error("Aluno não encontrado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 2) Turmas em que o aluno está matriculado
    const { data: myEnr, error: enrErr } = await supabaseAdmin
      .from("dojo_class_students")
      .select("class_id, dojo_classes(id, name, modality, color, teacher_name, owner_id)")
      .eq("student_id", me.id);
    if (enrErr) throw new Error(enrErr.message);

    const myClasses = (myEnr ?? [])
      .map((r: any) => r.dojo_classes)
      .filter((c: any) => c && c.owner_id === me.owner_id)
      .map((c: any) => ({
        id: c.id as string,
        name: c.name as string,
        modality: c.modality as string | null,
        color: c.color as string | null,
        teacher_name: c.teacher_name as string | null,
      }));

    // 3) Total de check-ins do aluno (todos os períodos, todas as turmas)
    const { count: myTotal } = await supabaseAdmin
      .from("dojo_attendance")
      .select("id", { count: "exact", head: true })
      .eq("student_id", me.id)
      .in("status", PRESENT_STATUSES as unknown as string[]);

    // 4) Janela temporal (calendário civil no fuso do Brasil)
    const { since: sinceIso, until: untilIso } = resolvePeriodRange(data.period);


    // 4b) Ranking geral da academia (todos os alunos ativos), sempre calculado
    //     para o resumo geral da tela — independente da turma selecionada.
    const { data: academyStudents } = await supabaseAdmin
      .from("dojo_students")
      .select("id, full_name, photo_url, current_belt_id, current_degree")
      .eq("owner_id", me.owner_id)
      .is("cancelled_at", null);
    const academyIds = (academyStudents ?? []).map((s: any) => s.id as string);

    let attOverallQuery = supabaseAdmin
      .from("dojo_attendance")
      .select("student_id")
      .eq("owner_id", me.owner_id);
    if (sinceIso) attOverallQuery = attOverallQuery.gte("checked_in_at", sinceIso);
    if (untilIso) attOverallQuery = attOverallQuery.lt("checked_in_at", untilIso);

    const { data: attOverall } = await attOverallQuery;
    const overallCounts: Record<string, number> = {};
    for (const id of academyIds) overallCounts[id] = 0;
    for (const a of attOverall ?? []) {
      const sid = (a as any).student_id as string | null;
      if (!sid) continue;
      overallCounts[sid] = (overallCounts[sid] ?? 0) + 1;
    }
    const overallStudents = (academyStudents ?? []).map((s: any) => ({
      id: s.id as string,
      full_name: s.full_name as string,
      photo_url: (s.photo_url as string | null) ?? null,
      current_belt_id: (s.current_belt_id as string | null) ?? null,
      current_degree: (s.current_degree as number | null) ?? null,
    }));

    // 5) Determina turma efetiva
    const requested = data.classId ?? null;
    const isEnrolled = requested && myClasses.some((c) => c.id === requested);
    const effectiveClassId =
      isEnrolled
        ? requested!
        : myClasses.length === 1
        ? myClasses[0].id
        : null;

    if (!effectiveClassId) {
      return {
        me: { id: me.id, total_checkins: myTotal ?? 0 },
        classes: myClasses,
        classId: null as string | null,
        students: [] as any[],
        counts: {} as Record<string, number>,
        overall: {
          students: overallStudents,
          counts: overallCounts,
          total_students: overallStudents.length,
        },
      };
    }

    // 6) Alunos da turma escolhida
    const { data: classEnr, error: cEnrErr } = await supabaseAdmin
      .from("dojo_class_students")
      .select("student_id")
      .eq("class_id", effectiveClassId);
    if (cEnrErr) throw new Error(cEnrErr.message);
    const studentIds = (classEnr ?? []).map((r: any) => r.student_id).filter(Boolean);
    if (studentIds.length === 0) {
      return {
        me: { id: me.id, total_checkins: myTotal ?? 0 },
        classes: myClasses,
        classId: effectiveClassId,
        students: [],
        counts: {},
        overall: {
          students: overallStudents,
          counts: overallCounts,
          total_students: overallStudents.length,
        },
      };
    }

    const { data: studentRows, error: stErr } = await supabaseAdmin
      .from("dojo_students")
      .select("id, full_name, photo_url, current_belt_id, current_degree, status")
      .in("id", studentIds)
      .eq("owner_id", me.owner_id);
    if (stErr) throw new Error(stErr.message);

    // 7) Check-ins (mesma lógica do admin: reflete o total exibido na ficha do aluno)
    let attQuery = supabaseAdmin
      .from("dojo_attendance")
      .select("student_id")
      .in("student_id", studentIds);
    attQuery = attQuery.in("status", ["present", "late"] as string[]);
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

    return {
      me: { id: me.id, total_checkins: myTotal ?? 0 },
      classes: myClasses,
      classId: effectiveClassId,
      students: (studentRows ?? []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        photo_url: s.photo_url,
        current_belt_id: s.current_belt_id,
        current_degree: s.current_degree,
        status: s.status,
      })),
      counts,
      overall: {
        students: overallStudents,
        counts: overallCounts,
        total_students: overallStudents.length,
      },
    };
  });
