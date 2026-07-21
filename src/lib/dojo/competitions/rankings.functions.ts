// Server functions para dashboard, ranking, estatísticas e histórico competitivo.
// Todas usam requireSupabaseAuth — RLS por owner_id garante isolamento multi-tenant.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().regex(/^[0-9a-fA-F-]{32,36}$/);

// ============ Medalhas — sumário do dojo ============

export const getAcademyMedalSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .rpc("get_academy_medal_summary" as any, { _owner: context.userId });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as Record<string, number>) : null;
    return {
      gold: Number(row?.gold ?? 0),
      silver: Number(row?.silver ?? 0),
      bronze: Number(row?.bronze ?? 0),
      participation: Number(row?.participation ?? 0),
      total: Number(row?.total ?? 0),
    };
  });

// ============ Ranking de atletas ============

export const getAcademyAthleteRanking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ belt_id: uuid.nullable().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .rpc("get_academy_athlete_ranking" as any, {
        _owner: context.userId,
        _belt: data.belt_id ?? null,
      });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      student_id: string;
      full_name: string;
      photo_url: string | null;
      belt_id: string | null;
      competitions: number;
      wins: number;
      losses: number;
      gold: number;
      silver: number;
      bronze: number;
      points: number;
    }>;
  });

// ============ Histórico competitivo do aluno ============

export const getStudentCompetitionHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .rpc("get_student_competition_history" as any, { _student: data.student_id });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      athlete_id: string;
      academy_competition_id: string;
      competition_id: string;
      competition_name: string;
      competition_start_at: string | null;
      scope: string | null;
      category: string | null;
      weight_class: string | null;
      weight_kg: number | null;
      belt_name: string | null;
      age_group: string | null;
      placement: number | null;
      medal: string | null;
      matches: number | null;
      wins: number | null;
      losses: number | null;
      draws: number | null;
      submissions: number | null;
      knockouts: number | null;
      ippons: number | null;
      points: number | null;
      photos: string[] | null;
      videos: string[] | null;
      certificates: string[] | null;
      notes: string | null;
    }>;
  });

// ============ Registrar / atualizar resultado individual do atleta ============

const resultSchema = z.object({
  id: uuid.optional(),
  academy_competition_id: uuid,
  athlete_id: uuid,
  student_id: uuid.optional().nullable(),
  placement: z.number().int().nullable().optional(),
  medal: z.enum(["gold", "silver", "bronze", "participation"]).nullable().optional(),
  category: z.string().nullable().optional(),
  matches: z.number().int().min(0).optional(),
  wins: z.number().int().min(0).optional(),
  losses: z.number().int().min(0).optional(),
  draws: z.number().int().min(0).optional(),
  submissions: z.number().int().min(0).optional(),
  knockouts: z.number().int().min(0).optional(),
  ippons: z.number().int().min(0).optional(),
  points: z.number().int().min(0).optional(),
  penalties: z.number().int().min(0).optional(),
  total_time_seconds: z.number().int().min(0).nullable().optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  certificates: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

export const upsertAthleteResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => resultSchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload = { ...data, owner_id: context.userId };
    const { data: row, error } = data.id
      ? await context.supabase
          .from("academy_competition_results")
          .update(payload as never)
          .eq("id", data.id)
          .eq("owner_id", context.userId)
          .select("*")
          .single()
      : await context.supabase
          .from("academy_competition_results")
          .insert(payload as never)
          .select("*")
          .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAthleteResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ academy_competition_id: uuid }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("academy_competition_results")
      .select("*, athlete:academy_competition_athletes(id, student:dojo_students(id, full_name, photo_url))")
      .eq("owner_id", context.userId)
      .eq("academy_competition_id", data.academy_competition_id)
      .order("placement", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteAthleteResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("academy_competition_results")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Estatísticas gerais ============

export const getCompetitionsStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // competições por ano (via academy_competitions.competition.start_at)
    const { data: acs } = await context.supabase
      .from("academy_competitions")
      .select("id, competition:competitions(start_at, scope, state, country, name)")
      .eq("owner_id", context.userId);

    type ACRow = { competition: { start_at: string | null; scope: string | null; state: string | null; country: string | null; name: string | null } | null };
    const list = ((acs ?? []) as unknown) as ACRow[];

    const byYear = new Map<number, number>();
    const byState = new Map<string, number>();
    let international = 0;
    for (const r of list) {
      const dt = r.competition?.start_at ? new Date(r.competition.start_at) : null;
      if (dt && !isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear();
        byYear.set(y, (byYear.get(y) ?? 0) + 1);
      }
      const st = r.competition?.state;
      if (st) byState.set(st, (byState.get(st) ?? 0) + 1);
      if (r.competition?.scope === "international") international++;
    }

    // medalhas por categoria (usa medal)
    const { data: results } = await context.supabase
      .from("academy_competition_results")
      .select("medal, wins, losses, category, athlete:academy_competition_athletes(student_id, student:dojo_students(full_name))")
      .eq("owner_id", context.userId);

    type ResRow = { medal: string | null; wins: number | null; losses: number | null; category: string | null; athlete: { student_id: string | null; student: { full_name: string | null } | null } | null };
    const rList = ((results ?? []) as unknown) as ResRow[];

    let totalWins = 0, totalLosses = 0;
    const athleteMedals = new Map<string, { name: string; gold: number; silver: number; bronze: number; total: number }>();
    for (const r of rList) {
      totalWins += Number(r.wins ?? 0);
      totalLosses += Number(r.losses ?? 0);
      const sid = r.athlete?.student_id;
      const name = r.athlete?.student?.full_name;
      if (sid && name) {
        const cur = athleteMedals.get(sid) ?? { name, gold: 0, silver: 0, bronze: 0, total: 0 };
        cur.total += 1;
        if (r.medal === "gold") cur.gold++;
        else if (r.medal === "silver") cur.silver++;
        else if (r.medal === "bronze") cur.bronze++;
        athleteMedals.set(sid, cur);
      }
    }

    return {
      competitionsByYear: Array.from(byYear.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, count]) => ({ year, count })),
      competitionsByState: Array.from(byState.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([state, count]) => ({ state, count })),
      internationalCount: international,
      nationalCount: list.length - international,
      totalWins,
      totalLosses,
      winRate: totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) : 0,
      topAthletes: Array.from(athleteMedals.entries())
        .map(([id, v]) => ({ student_id: id, ...v, medals: v.gold + v.silver + v.bronze }))
        .sort((a, b) => b.medals - a.medals || b.gold - a.gold)
        .slice(0, 10),
    };
  });
