import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStudentAuth } from "@/integrations/supabase/student-auth-middleware";

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
    const { data: me, error: meErr } = await context.supabase
      .from("dojo_students")
      .select("id, owner_id")
      .limit(1)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
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
      .eq("student_id", me.id);

    // 4) Janela temporal
    let sinceIso: string | null = null;
    const now = new Date();
    if (data.period === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 7); sinceIso = d.toISOString();
    } else if (data.period === "month") {
      const d = new Date(now); d.setMonth(d.getMonth() - 1); sinceIso = d.toISOString();
    } else if (data.period === "year") {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1); sinceIso = d.toISOString();
    }

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
      };
    }

    const { data: studentRows, error: stErr } = await supabaseAdmin
      .from("dojo_students")
      .select("id, full_name, photo_url, current_belt_id, current_degree, status")
      .in("id", studentIds)
      .eq("owner_id", me.owner_id);
    if (stErr) throw new Error(stErr.message);

    // 7) Check-ins restritos à turma selecionada
    let attQuery = supabaseAdmin
      .from("dojo_attendance")
      .select("student_id")
      .eq("class_id", effectiveClassId)
      .in("student_id", studentIds);
    if (sinceIso) attQuery = attQuery.gte("checked_in_at", sinceIso);
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
    };
  });
