import { addMonthsISO } from "@/lib/dates";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRESENT_STATUSES, isPresentStatus, localDayISO, localWeekday } from "@/lib/dojo/attendance-status";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Athlete Analysis — Fase 1
 *
 * Todas as consultas usam somente dados já existentes no ecossistema
 * do AMT Dojo Manager. Cada função valida ownership do aluno antes
 * de retornar dados agregados.
 */

async function assertStudentOwnership(
  supabase: any,
  userId: string,
  studentId: string,
) {
  const { data, error } = await supabase
    .from("dojo_students")
    .select("id, owner_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Aluno não encontrado");
  if (data.owner_id !== userId) {
    // Permite ao próprio aluno (ou usuário vinculado, como pai) visualizar
    // seus próprios dados de performance.
    const { data: isMine } = await supabase.rpc("is_my_student", { _id: studentId });
    if (isMine) return data;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      const { data: isAmtAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "amt_admin",
      });
      if (!isAmtAdmin) throw new Error("Sem permissão");
    }
  }
  return data;
}


const idInput = z.object({ studentId: z.string().uuid() });

// -------- Overview --------
export const getAthleteOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);

    const { data: student } = await supabase
      .from("dojo_students")
      .select(
        "id, full_name, photo_url, birth_date, gender, status, current_belt_id, current_degree, unit_id, created_at, graduation_min_classes, graduation_min_months",
      )
      .eq("id", data.studentId)
      .maybeSingle();

    const [{ data: belt }, { data: classes }, { data: lastAtt }, { data: lastEval }, { data: nextEval }, { data: lastPhys }] = await Promise.all([
      student?.current_belt_id
        ? supabase.from("dojo_belts").select("id, name, color_hex, modality, visual, variants").eq("id", student.current_belt_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("dojo_class_students")
        .select("class_id, dojo_classes(id, name, modality, teacher_name, level)")
        .eq("student_id", data.studentId),
      supabase
        .from("dojo_attendance")
        .select("checked_in_at, class_id")
        .eq("student_id", data.studentId)
        .in("status", PRESENT_STATUSES as unknown as string[])
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("dojo_eval_sessions")
        .select("id, finished_at, percentage, result")
        .eq("student_id", data.studentId)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("dojo_eval_sessions")
        .select("id, scheduled_at, status")
        .eq("student_id", data.studentId)
        .in("status", ["draft", "scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      // usa evaluations items para peso/altura se existir (heurístico)
      Promise.resolve({ data: null }),
    ]);

    return { student, belt, classes: classes ?? [], lastAtt, lastEval, nextEval, lastPhys };
  });

// -------- Attendance / Heatmap --------
export const getAthleteAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    idInput.extend({ days: z.number().int().min(30).max(730).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);
    const days = data.days ?? 365;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    const { data: rows, error } = await supabase
      .from("dojo_attendance")
      .select("id, checked_in_at, status, class_id, method, unit_id, notes, dojo_classes(name), dojo_units(name)")
      .eq("student_id", data.studentId)
      .gte("checked_in_at", since)
      .order("checked_in_at", { ascending: true });
    if (error) throw new Error(error.message);

    const dayMap = new Map<string, number>();
    let present = 0;
    const methodCounts: Record<string, number> = {};
    for (const r of rows ?? []) {
      if (!isPresentStatus((r as any).status)) continue;
      present++;
      const d = localDayISO((r as any).checked_in_at);
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      const m = (r as any).method ?? "manual";
      methodCounts[m] = (methodCounts[m] ?? 0) + 1;
    }
    const heatmap = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

    // streaks
    const sortedDates = [...dayMap.keys()].sort();
    let curStreak = 0, maxStreak = 0, prev: Date | null = null;
    for (const d of sortedDates) {
      const dt = new Date(d);
      if (prev && (dt.getTime() - prev.getTime()) === 24 * 3600 * 1000) curStreak++;
      else curStreak = 1;
      if (curStreak > maxStreak) maxStreak = curStreak;
      prev = dt;
    }
    // dias ausentes desde último treino
    const lastDate = sortedDates.length ? new Date(sortedDates[sortedDates.length - 1]) : null;
    const daysSinceLast = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / (24 * 3600 * 1000)) : null;

    // weekday distribution
    const weekday = Array(7).fill(0);
    for (const d of dayMap.keys()) weekday[localWeekday(d)]++;

    // Últimos check-ins detalhados (mais recentes primeiro)
    const recent = [...(rows ?? [])]
      .filter((r: any) => isPresentStatus(r.status))
      .sort((a: any, b: any) => (b.checked_in_at as string).localeCompare(a.checked_in_at))
      .slice(0, 30)
      .map((r: any) => ({
        id: r.id,
        checked_in_at: r.checked_in_at,
        method: r.method ?? "manual",
        class_name: r.dojo_classes?.name ?? null,
        unit_name: r.dojo_units?.name ?? null,
        notes: r.notes ?? null,
      }));

    return {
      totalPresent: present,
      distinctDays: dayMap.size,
      maxStreak,
      daysSinceLast,
      heatmap,
      weekday,
      windowDays: days,
      methodCounts,
      recent,
    };
  });

// -------- Performance Score --------
export const getAthletePerformanceScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);

    const since90 = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [attRes, evalRes, gradRes, compRes] = await Promise.all([
      supabase.from("dojo_attendance").select("checked_in_at, status").eq("student_id", data.studentId).gte("checked_in_at", since90),
      supabase.from("dojo_eval_sessions").select("percentage, finished_at").eq("student_id", data.studentId).not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(5),
      supabase.from("dojo_graduations").select("graduation_date").eq("student_id", data.studentId).order("graduation_date", { ascending: false }),
      supabase.from("academy_competition_results").select("medal, wins, losses").eq("owner_id", (await supabase.from("dojo_students").select("owner_id").eq("id", data.studentId).maybeSingle()).data?.owner_id ?? "00000000-0000-0000-0000-000000000000"),
    ]);

    // 1) Frequência (30%): meta = 3x/semana * 12 semanas ≈ 36
    const presents = (attRes.data ?? []).filter((r: any) => isPresentStatus(r.status)).length;
    const freqScore = Math.min(100, (presents / 36) * 100);

    // 2) Assiduidade (10%): dias distintos nos últimos 30d
    const days30 = new Set((attRes.data ?? []).filter((r: any) => isPresentStatus(r.status) && r.checked_in_at >= since30).map((r: any) => localDayISO(r.checked_in_at)));
    const streakScore = Math.min(100, (days30.size / 12) * 100);

    // 3) Avaliações (20%)
    const evals = evalRes.data ?? [];
    const evalScore = evals.length ? evals.reduce((s: number, e: any) => s + Number(e.percentage || 0), 0) / evals.length : 0;

    // 4) Evolução em graduações (15%): última graduação em janela razoável
    const lastGrad = gradRes.data?.[0];
    let gradScore = 50;
    if (lastGrad) {
      const monthsSince = (Date.now() - new Date(lastGrad.graduation_date).getTime()) / (1000 * 3600 * 24 * 30);
      gradScore = monthsSince < 18 ? 90 : monthsSince < 36 ? 70 : 40;
    }

    // 5) Competições (15%)
    const comps = compRes.data ?? [];
    const gold = comps.filter((c: any) => c.medal === "gold").length;
    const silver = comps.filter((c: any) => c.medal === "silver").length;
    const bronze = comps.filter((c: any) => c.medal === "bronze").length;
    const wins = comps.reduce((s: number, c: any) => s + Number(c.wins || 0), 0);
    const compScore = comps.length ? Math.min(100, ((gold * 5 + silver * 3 + bronze * 2 + wins) / (comps.length + 1)) * 15) : 0;

    // 6) Participação em eventos / check-ins recentes (10%)
    const days30Set = days30.size;
    const eventsScore = Math.min(100, (days30Set / 10) * 100);

    const score = Math.round(
      freqScore * 0.30 + streakScore * 0.10 + evalScore * 0.20 + gradScore * 0.15 + compScore * 0.15 + eventsScore * 0.10,
    );

    const label = score >= 85 ? "Excelente" : score >= 70 ? "Muito bom" : score >= 55 ? "Bom" : score >= 40 ? "Regular" : "Necessita atenção";

    return {
      score,
      label,
      breakdown: {
        frequencia: Math.round(freqScore),
        assiduidade: Math.round(streakScore),
        avaliacoes: Math.round(evalScore),
        graduacoes: Math.round(gradScore),
        competicoes: Math.round(compScore),
        eventos: Math.round(eventsScore),
      },
    };
  });

// -------- Physical (dojo_evaluations items heurístico) --------
export const getAthletePhysical = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { owner_id } = await assertStudentOwnership(supabase, userId, data.studentId);

    const { data: student } = await supabase
      .from("dojo_students")
      .select("anamnesis, birth_date, gender")
      .eq("id", data.studentId)
      .maybeSingle();

    // Fase 1: expõe apenas o que já existe (anamnesis JSON pode ter altura/peso).
    const anam = (student?.anamnesis ?? {}) as Record<string, unknown>;
    const weight = Number(anam.peso ?? anam.weight ?? 0) || null;
    const height = Number(anam.altura ?? anam.height ?? 0) || null;
    const imc = weight && height ? Number((weight / Math.pow(height / 100, 2)).toFixed(1)) : null;

    return { current: { weight, height, imc }, history: [] as { date: string; weight?: number; imc?: number }[], owner_id };
  });

// -------- Technical (radar da última avaliação) --------
export const getAthleteTechnical = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);

    const { data: sessions } = await supabase
      .from("dojo_eval_sessions")
      .select("id, finished_at, percentage, scores, total_score, max_score, result, template_id, dojo_evaluations(title, structure)")
      .eq("student_id", data.studentId)
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(20);

    // Deriva radar a partir de "categories" do template + scores por categoria
    const latest = sessions?.[0];
    let radar: { axis: string; value: number }[] = [];
    if (latest) {
      const structure = (latest as any).dojo_evaluations?.structure ?? {};
      const cats = Array.isArray(structure.categories) ? structure.categories : [];
      const scores = (latest.scores ?? {}) as Record<string, any>;
      radar = cats.slice(0, 12).map((c: any, idx: number) => {
        const catScores = Object.entries(scores)
          .filter(([k]) => k.startsWith(`cat_${idx}_`) || k.startsWith(`${c.id ?? idx}_`))
          .map(([, v]) => Number(v) || 0);
        const avg = catScores.length ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
        return { axis: String(c.name ?? c.title ?? `Categoria ${idx + 1}`), value: Math.round(avg * 10) / 10 };
      });
      // Fallback: se estrutura vazia, usa percentual geral em uma única dimensão
      if (radar.length === 0) radar = [{ axis: "Geral", value: Number(latest.percentage) || 0 }];
    }

    return { sessions: sessions ?? [], radar };
  });

// -------- Graduations --------
export const getAthleteGraduations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);
    const { data: rows, error } = await supabase
      .from("dojo_graduations")
      .select("id, graduation_date, degree, evaluator, notes, dojo_belts(id, name, color_hex, modality, visual, variants)")
      .eq("student_id", data.studentId)
      .order("graduation_date", { ascending: false });
    if (error) throw new Error(error.message);

    // Previsão simples: se aluno tem min_months configurado, prever data
    const { data: student } = await supabase
      .from("dojo_students")
      .select("graduation_min_months, graduation_min_classes")
      .eq("id", data.studentId)
      .maybeSingle();
    const last = rows?.[0];
    let nextForecast: string | null = null;
    if (last && student?.graduation_min_months) {
      nextForecast = addMonthsISO(
        dayISO(last.graduation_date),
        Number(student.graduation_min_months),
      );
    }
    return { history: rows ?? [], nextForecast };
  });

// -------- Competitions --------
export const getAthleteCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);
    const { data: rows, error } = await supabase.rpc("get_student_competition_history", { _student: data.studentId });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];
    const totals = {
      competitions: list.length,
      wins: list.reduce((s, r) => s + Number(r.wins || 0), 0),
      losses: list.reduce((s, r) => s + Number(r.losses || 0), 0),
      draws: list.reduce((s, r) => s + Number(r.draws || 0), 0),
      gold: list.filter((r) => r.medal === "gold").length,
      silver: list.filter((r) => r.medal === "silver").length,
      bronze: list.filter((r) => r.medal === "bronze").length,
      submissions: list.reduce((s, r) => s + Number(r.submissions || 0), 0),
      points: list.reduce((s, r) => s + Number(r.points || 0), 0),
    };
    return { list, totals };
  });

// -------- Videos --------
export const getAthleteVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);
    // Vincula por user_id do aluno em dojo_video_progress
    const { data: student } = await supabase.from("dojo_students").select("user_id").eq("id", data.studentId).maybeSingle();
    if (!student?.user_id) return { progress: [] };
    const { data: progress } = await supabase
      .from("dojo_video_progress")
      .select("video_id, watched_seconds, percent, completed, last_seen_at, dojo_videos(id, title, thumbnail_url, duration_seconds)")
      .eq("user_id", student.user_id)
      .order("last_seen_at", { ascending: false })
      .limit(50);
    return { progress: progress ?? [] };
  });

// -------- Insights (heurísticos) --------
export const getAthleteInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.studentId);

    const now = Date.now();
    const win = (d: number) => new Date(now - d * 86400_000).toISOString();
    const [att30, att60, att90, lastGrad, lastComp, lastEval] = await Promise.all([
      supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).eq("student_id", data.studentId).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", win(30)),
      supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).eq("student_id", data.studentId).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", win(60)),
      supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).eq("student_id", data.studentId).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", win(90)),
      supabase.from("dojo_graduations").select("graduation_date").eq("student_id", data.studentId).order("graduation_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("academy_competition_athletes").select("id, created_at").eq("student_id", data.studentId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("dojo_eval_sessions").select("finished_at, percentage").eq("student_id", data.studentId).not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(3),
    ]);

    const c30 = att30.count ?? 0;
    const c60 = att60.count ?? 0;
    const c90 = att90.count ?? 0;
    const insights: { kind: "success" | "warning" | "info"; title: string; message: string }[] = [];

    if (c30 === 0 && c90 > 0) insights.push({ kind: "warning", title: "Queda de frequência", message: "Sem check-ins nos últimos 30 dias. Risco de evasão." });
    else if (c30 * 3 < c90) insights.push({ kind: "warning", title: "Frequência em queda", message: "Ritmo dos últimos 30 dias abaixo da média trimestral." });
    else if (c30 > (c90 / 3) * 1.3) insights.push({ kind: "success", title: "Ótima fase", message: "Frequência acima da média pessoal — recomendar competição." });

    if (lastGrad.data) {
      const months = (now - new Date(lastGrad.data.graduation_date).getTime()) / (1000 * 3600 * 24 * 30);
      if (months >= 24) insights.push({ kind: "info", title: "Elegível para nova graduação", message: `${Math.floor(months)} meses desde a última graduação.` });
    } else {
      insights.push({ kind: "info", title: "Sem graduações registradas", message: "Considere registrar a primeira graduação do atleta." });
    }

    if (!lastComp.data) insights.push({ kind: "info", title: "Sem competições recentes", message: "Sugerir participação em torneio para desenvolvimento." });

    const evals = lastEval.data ?? [];
    if (evals.length >= 2) {
      const trend = Number(evals[0].percentage) - Number(evals[1].percentage);
      if (trend > 5) insights.push({ kind: "success", title: "Evolução técnica", message: `Última avaliação ${trend.toFixed(1)}pp acima da anterior.` });
      else if (trend < -5) insights.push({ kind: "warning", title: "Atenção técnica", message: `Última avaliação ${Math.abs(trend).toFixed(1)}pp abaixo da anterior.` });
    }

    return { insights, counts: { c30, c60, c90 } };
  });

// -------- Compare two athletes --------
export const compareAthletes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ a: z.string().uuid(), b: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStudentOwnership(supabase, userId, data.a);
    await assertStudentOwnership(supabase, userId, data.b);
    const load = async (sid: string) => {
      const since = new Date(Date.now() - 90 * 86400_000).toISOString();
      const [att, evals, comps, grads, s] = await Promise.all([
        supabase.from("dojo_attendance").select("id", { count: "exact", head: true }).eq("student_id", sid).in("status", PRESENT_STATUSES as unknown as string[]).gte("checked_in_at", since),
        supabase.from("dojo_eval_sessions").select("percentage").eq("student_id", sid).not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.rpc("get_student_competition_history", { _student: sid }),
        supabase.from("dojo_graduations").select("id", { count: "exact", head: true }).eq("student_id", sid),
        supabase.from("dojo_students").select("id, full_name, photo_url, current_belt_id, current_degree, dojo_belts(name, color_hex, modality, visual, variants)").eq("id", sid).maybeSingle(),
      ]);
      const list = (comps.data ?? []) as any[];
      return {
        student: s.data,
        frequencia90d: att.count ?? 0,
        ultimaAvaliacao: evals.data?.percentage ?? 0,
        competicoes: list.length,
        vitorias: list.reduce((x, r) => x + Number(r.wins || 0), 0),
        ouro: list.filter((r) => r.medal === "gold").length,
        prata: list.filter((r) => r.medal === "silver").length,
        bronze: list.filter((r) => r.medal === "bronze").length,
        graduacoes: grads.count ?? 0,
      };
    };
    const [a, b] = await Promise.all([load(data.a), load(data.b)]);
    return { a, b };
  });

// -------- List students for compare --------
export const listAthletesForCompare = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("dojo_students")
      .select("id, full_name, photo_url")
      .eq("owner_id", context.userId)
      .order("full_name")
      .limit(500);
    return data ?? [];
  });
