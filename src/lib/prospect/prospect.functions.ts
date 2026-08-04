/**
 * Prospect Engine — Server Functions
 * Único ponto de entrada para o cliente interagir com o módulo.
 * Todas as chamadas RLS-scoped por owner_id = auth.uid().
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizeName, computeLeadScore, DEFAULT_SCORE_WEIGHTS } from "@/features/prospect/utils";

// Tipo JSON-serializável aceito pelo TanStack Start.
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type JsonRow = { [k: string]: Json };


// ============= Helpers =============

async function logEvent(
  supabase: unknown,
  ownerId: string,
  companyId: string,
  event_type: string,
  title: string,
  payload: JsonRow = {},
) {
  await (supabase as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } })
    .from("prospect_timeline")
    .insert({ owner_id: ownerId, company_id: companyId, event_type, title, payload });
}

async function auditLog(
  supabase: unknown,
  ownerId: string,
  source: string,
  action: string,
  message?: string,
  metadata: JsonRow = {},
) {
  await (supabase as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } })
    .from("prospect_logs")
    .insert({ owner_id: ownerId, source, action, message: message ?? null, metadata });
}

// ============= DASHBOARD =============

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supa = context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => Promise<{ data: JsonRow[] | null }>;
        } & Promise<{ data: JsonRow[] | null }>;
      };
    };
    const now = Date.now();
    const dayAgo = new Date(now - 86400_000).toISOString();
    const weekAgo = new Date(now - 7 * 86400_000).toISOString();
    const monthAgo = new Date(now - 30 * 86400_000).toISOString();

    const [companies, contacts, searches, automations, timeline] = await Promise.all([
      supa.from("prospect_companies").select("id, created_at, enriched_at, status, city, state, category, score, pipeline_stage, origin").eq("owner_id", context.userId),
      supa.from("prospect_contacts").select("channel, company_id").eq("owner_id", context.userId),
      supa.from("prospect_searches").select("id, name, last_run_at").eq("owner_id", context.userId),
      supa.from("prospect_automations").select("id, name, last_run_at, runs_count").eq("owner_id", context.userId),
      supa.from("prospect_timeline").select("id, event_type, title, created_at, company_id").eq("owner_id", context.userId),
    ]);

    const rows = (companies.data ?? []) as Array<{
      created_at: string; enriched_at: string | null; status: string; city: string | null; state: string | null; category: string | null; score: number; pipeline_stage: string; origin: string | null;
    }>;
    const cts = (contacts.data ?? []) as Array<{ channel: string; company_id: string }>;

    const captured = { day: 0, week: 0, month: 0 };
    for (const r of rows) {
      if (r.created_at >= dayAgo) captured.day++;
      if (r.created_at >= weekAgo) captured.week++;
      if (r.created_at >= monthAgo) captured.month++;
    }

    const enriched = rows.filter((r) => r.enriched_at).length;
    const qualified = rows.filter((r) => r.status === "qualificado" || r.status === "convertido").length;

    const withEmail = new Set(cts.filter((c) => c.channel === "email").map((c) => c.company_id));
    const withWa = new Set(cts.filter((c) => c.channel === "whatsapp").map((c) => c.company_id));
    const withIg = new Set(cts.filter((c) => c.channel === "instagram").map((c) => c.company_id));

    const byCity = new Map<string, number>();
    const byState = new Map<string, number>();
    const bySegment = new Map<string, number>();
    const byOrigin = new Map<string, number>();
    for (const r of rows) {
      if (r.city) byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1);
      if (r.state) byState.set(r.state, (byState.get(r.state) ?? 0) + 1);
      if (r.category) bySegment.set(r.category, (bySegment.get(r.category) ?? 0) + 1);
      if (r.origin) byOrigin.set(r.origin, (byOrigin.get(r.origin) ?? 0) + 1);
    }

    // Evolução diária (últimos 30 dias)
    const daily: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      const count = rows.filter((r) => r.created_at.slice(0, 10) === key).length;
      daily.push({ date: key, count });
    }

    return {
      captured,
      enriched,
      qualified,
      total: rows.length,
      emailCount: withEmail.size,
      whatsappCount: withWa.size,
      instagramCount: withIg.size,
      enrichmentRate: rows.length ? Math.round((enriched / rows.length) * 100) : 0,
      conversionRate: rows.length ? Math.round((qualified / rows.length) * 100) : 0,
      byCity: [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ name: k, value: v })),
      byState: [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ name: k, value: v })),
      bySegment: [...bySegment.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ name: k, value: v })),
      byOrigin: [...byOrigin.entries()].map(([k, v]) => ({ name: k, value: v })),
      daily,
      recentSearches: ((searches.data ?? []) as Array<{ id: string; name: string; last_run_at: string | null }>).slice(-5).reverse(),
      recentAutomations: ((automations.data ?? []) as Array<{ id: string; name: string; last_run_at: string | null; runs_count: number }>).slice(-5).reverse(),
      recentTimeline: ((timeline.data ?? []) as Array<{ id: string; event_type: string; title: string; created_at: string; company_id: string }>)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10),
    };
  });

// ============= COMPANIES / LEADS =============

const listInput = z.object({
  search: z.string().max(120).optional(),
  state: z.string().max(2).optional(),
  city: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  pipeline_stage: z.string().max(30).optional(),
  status: z.string().max(30).optional(),
  minScore: z.number().min(0).max(100).optional(),
  hasEmail: z.boolean().optional(),
  hasWhatsapp: z.boolean().optional(),
  hasInstagram: z.boolean().optional(),
  onlyEnriched: z.boolean().optional(),
  ids: z.array(z.string().uuid()).max(500).optional(),
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
  orderBy: z.enum(["created_at", "score", "name", "last_contacted_at", "state", "city"]).default("created_at"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
  groupByState: z.boolean().optional(),
});

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listInput.parse(i))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string, o?: unknown) => {
          eq: (k: string, v: unknown) => unknown;
          gte: (k: string, v: unknown) => unknown;
          ilike: (k: string, v: string) => unknown;
          in: (k: string, v: unknown[]) => unknown;
          not: (k: string, op: string, v: unknown) => unknown;
          order: (k: string, o?: unknown) => unknown;
          range: (a: number, b: number) => unknown;
        };
      };
    };
    let q = supa.from("prospect_companies").select("*", { count: "exact" }) as unknown as {
      eq: (k: string, v: unknown) => typeof q;
      gte: (k: string, v: unknown) => typeof q;
      ilike: (k: string, v: string) => typeof q;
      in: (k: string, v: unknown[]) => typeof q;
      not: (k: string, op: string, v: unknown) => typeof q;
      order: (k: string, o?: unknown) => typeof q;
      range: (a: number, b: number) => Promise<{ data: unknown[] | null; count: number | null }>;
    };
    q = q.eq("owner_id", context.userId);
    if (data.ids && data.ids.length > 0) q = q.in("id", data.ids);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.state) q = q.eq("state", data.state);
    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.category) q = q.ilike("category", `%${data.category}%`);
    if (data.pipeline_stage) q = q.eq("pipeline_stage", data.pipeline_stage);
    if (data.status) q = q.eq("status", data.status);
    if (typeof data.minScore === "number") q = q.gte("score", data.minScore);
    if (data.onlyEnriched) q = q.not("enriched_at", "is", null);
    q = q.order(data.orderBy, { ascending: data.orderDir === "asc" });
    const { data: rows, count } = await q.range(data.offset, data.offset + data.limit - 1);

    // busca contatos das empresas retornadas
    const ids = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id);
    let contacts: Array<{ company_id: string; channel: string; value: string; is_primary: boolean }> = [];
    if (ids.length) {
      const { data: cts } = await (context.supabase as unknown as {
        from: (t: string) => { select: (c: string) => { in: (k: string, v: unknown[]) => Promise<{ data: JsonRow[] | null }> } };
      }).from("prospect_contacts").select("company_id, channel, value, is_primary").in("company_id", ids);
      contacts = (cts ?? []) as typeof contacts;
    }

    let filteredRows = (rows ?? []) as Array<{ id: string; [k: string]: unknown }>;
    if (data.hasEmail || data.hasWhatsapp || data.hasInstagram) {
      filteredRows = filteredRows.filter((r) => {
        const cs = contacts.filter((c) => c.company_id === r.id);
        if (data.hasEmail && !cs.some((c) => c.channel === "email")) return false;
        if (data.hasWhatsapp && !cs.some((c) => c.channel === "whatsapp")) return false;
        if (data.hasInstagram && !cs.some((c) => c.channel === "instagram")) return false;
        return true;
      });
    }

    return {
      rows: filteredRows.map((r) => ({ ...r, contacts: contacts.filter((c) => c.company_id === r.id) })),
      total: count ?? 0,
    };
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => { single: () => Promise<{ data: JsonRow | null; error: unknown }>; order: (c: string, o?: unknown) => Promise<{ data: JsonRow[] | null }> };
        };
      };
    };
    const { data: company, error } = await supa.from("prospect_companies").select("*").eq("id", data.id).single();
    if (error || !company) throw new Error("Lead não encontrado");
    const [contacts, timeline] = await Promise.all([
      supa.from("prospect_contacts").select("*").eq("company_id", data.id).order("is_primary", { ascending: false }),
      supa.from("prospect_timeline").select("*").eq("company_id", data.id).order("created_at", { ascending: false }),
    ]);
    return {
      company: company as JsonRow,
      contacts: (contacts.data ?? []) as JsonRow[],
      timeline: (timeline.data ?? []) as JsonRow[],
    };
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      status: z.string().optional(),
      pipeline_stage: z.string().optional(),
      notes: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      responsible_name: z.string().nullable().optional(),
    }),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const before = await (context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: { pipeline_stage: string } | null }> } } };
    }).from("prospect_companies").select("pipeline_stage").eq("id", data.id).single();

    const { error } = await (context.supabase as unknown as {
      from: (t: string) => { update: (v: unknown) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    }).from("prospect_companies").update(data.patch).eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(String(error));

    if (data.patch.pipeline_stage && before.data?.pipeline_stage !== data.patch.pipeline_stage) {
      await logEvent(context.supabase, context.userId, data.id, "pipeline_changed",
        `Movido para "${data.patch.pipeline_stage}"`, { from: before.data?.pipeline_stage ?? null, to: data.patch.pipeline_stage });
    }
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await (context.supabase as unknown as {
      from: (t: string) => { delete: () => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } };
    }).from("prospect_companies").delete().eq("id", data.id).eq("owner_id", context.userId);
    return { ok: true };
  });

// ============= SEARCH & ENRICH =============

const runSearchInput = z.object({
  name: z.string().min(2).max(120),
  segment: z.string().min(2).max(120),
  city: z.string().max(120).nullish(),
  state: z.string().max(2).nullish(),
  country: z.string().max(2).default("BR"),
  keywords: z.string().max(300).nullish(),
  target_count: z.number().int().min(1).max(100).default(20),
  save: z.boolean().default(true),
});

export const runSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => runSearchInput.parse(i))
  .handler(async ({ data, context }) => {
    const { discoverCompanies, computeQualityTier } = await import("./prospect-engine.server");
    const supa = context.supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown, o?: unknown) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null }> } } & Promise<{ data: unknown[] | null; error: unknown }>;
        update: (v: unknown) => { eq: (k: string, v: string) => Promise<unknown> };
        upsert: (v: unknown, o?: unknown) => { select: (c: string) => Promise<{ data: Array<{ id: string; normalized_name: string }> | null }> };
      };
    };

    // Salva a pesquisa
    let searchId: string | null = null;
    if (data.save) {
      const { data: srow } = await supa.from("prospect_searches").insert({
        owner_id: context.userId, name: data.name, segment: data.segment,
        city: data.city ?? null, state: data.state ?? null, country: data.country,
        keywords: data.keywords ?? null, target_count: data.target_count,
        status: "running",
      }).select("id").single();
      searchId = srow?.id ?? null;
    }

    let inserted = 0;
    try {
      const companies = await discoverCompanies({
        segment: data.segment,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        keywords: data.keywords ?? undefined,
        limit: data.target_count,
      });

      for (const c of companies) {
        const q = computeQualityTier(c);
        if (q.tier === "descartar") continue;

        const { data: row } = await supa.from("prospect_companies").insert({
          owner_id: context.userId,
          name: c.name, normalized_name: c.normalized_name,
          category: c.category, segment: data.segment,
          city: c.city, state: c.state, country: data.country,
          website: c.website, description: c.description, source_url: c.source_url,
          address: c.address ?? null,
          phone: c.phone ?? null,
          lat: c.lat ?? null,
          lng: c.lng ?? null,
          google_place_id: c.google_place_id ?? null,
          google_maps_url: c.google_maps_url ?? null,
          rating: c.rating ?? null,
          rating_count: c.rating_count ?? null,
          quality_tier: q.tier,
          score: q.score,
          origin: c.google_place_id ? "google_places" : "search",
          pipeline_stage: "novo",
        }).select("id").single();

        if (row?.id) {
          inserted++;
          await supa.from("prospect_enrichment_jobs" as string).insert({
            owner_id: context.userId, company_id: row.id, status: "pending",
          });
          await logEvent(context.supabase, context.userId, row.id, "lead_created", `Lead capturado via busca: ${data.name}`);
        }
      }

      if (searchId) {
        await supa.from("prospect_searches").update({
          status: "success", results_count: inserted, last_run_at: new Date().toISOString(),
        }).eq("id", searchId);
      }
      await auditLog(context.supabase, context.userId, "search", "run", `Pesquisa "${data.name}" capturou ${inserted} leads`);
      return { ok: true, inserted, searchId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (searchId) {
        await supa.from("prospect_searches").update({ status: "failed" }).eq("id", searchId);
      }
      await auditLog(context.supabase, context.userId, "search", "error", msg);
      throw new Error(msg);
    }
  });

// ============= MARTIAL ARTS SWEEP =============

const sweepInput = z.object({
  presets: z.array(z.string()).min(1).max(8),
  cities: z.array(z.string().max(120)).max(20).default([]),
  states: z.array(z.string().length(2)).max(27).default([]),
  per_preset: z.number().int().min(3).max(30).default(10),
  save: z.boolean().default(true),
});

/**
 * Varredura em lote focada em judô/jiu-jitsu.
 * Combina cada preset (academias/escolas/professores/projetos sociais)
 * com cada localidade selecionada, rodando queries multi-ângulo.
 */
export const runMartialArtsSweep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => sweepInput.parse(i))
  .handler(async ({ data, context }) => {
    const { discoverCompanies, buildMartialArtsQueries, computeQualityTier } = await import("./prospect-engine.server");
    const supa = context.supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null }> } } & Promise<{ data: unknown[] | null; error: unknown }>;
        update: (v: unknown) => { eq: (k: string, v: string) => Promise<unknown> };
      };
    };

    const locations: Array<{ city: string | null; state: string | null }> = [];
    for (const c of data.cities) locations.push({ city: c, state: null });
    for (const s of data.states) locations.push({ city: null, state: s });
    if (locations.length === 0) locations.push({ city: null, state: null });

    const sweepName = `Sweep BJJ/Judô ${new Date().toLocaleString("pt-BR")}`;
    let searchId: string | null = null;
    if (data.save) {
      const { data: srow } = await supa.from("prospect_searches").insert({
        owner_id: context.userId,
        name: sweepName,
        segment: data.presets.join(", "),
        city: data.cities.join(", ") || null,
        state: data.states.join(", ") || null,
        country: "BR",
        keywords: null,
        target_count: data.per_preset * data.presets.length * locations.length,
        status: "running",
      }).select("id").single();
      searchId = srow?.id ?? null;
    }

    let inserted = 0;
    let queriesRun = 0;
    const globalSeen = new Set<string>();

    try {
      for (const preset of data.presets) {
        for (const loc of locations) {
          const { queries, allowInstagram, category } = buildMartialArtsQueries(preset, loc);
          queriesRun += queries.length;

          const companies = await discoverCompanies({
            segment: category,
            city: loc.city,
            state: loc.state,
            queries,
            allowInstagram,
            limit: data.per_preset,
            category,
          });

          for (const c of companies) {
            const dedupeKey = c.google_place_id ?? c.website ?? c.source_url;
            if (globalSeen.has(dedupeKey)) continue;
            globalSeen.add(dedupeKey);

            const q = computeQualityTier(c);
            if (q.tier === "descartar") continue;

            const { data: row } = await supa.from("prospect_companies").insert({
              owner_id: context.userId,
              name: c.name, normalized_name: c.normalized_name,
              category: c.category, segment: preset,
              city: c.city, state: c.state, country: "BR",
              website: c.website, description: c.description, source_url: c.source_url,
              address: c.address ?? null,
              phone: c.phone ?? null,
              lat: c.lat ?? null,
              lng: c.lng ?? null,
              google_place_id: c.google_place_id ?? null,
              google_maps_url: c.google_maps_url ?? null,
              rating: c.rating ?? null,
              rating_count: c.rating_count ?? null,
              quality_tier: q.tier,
              score: q.score,
              origin: c.google_place_id ? "google_places" : "search_martial_arts",
              pipeline_stage: "novo",
            }).select("id").single();

            if (row?.id) {
              inserted++;
              await supa.from("prospect_enrichment_jobs" as string).insert({
                owner_id: context.userId, company_id: row.id, status: "pending",
              });
              await logEvent(context.supabase, context.userId, row.id,
                "lead_created", `Lead capturado (${category})`,
                { preset, city: loc.city, state: loc.state });
            }
          }
        }
      }

      if (searchId) {
        await supa.from("prospect_searches").update({
          status: "success", results_count: inserted, last_run_at: new Date().toISOString(),
        }).eq("id", searchId);
      }
      await auditLog(context.supabase, context.userId, "sweep", "run",
        `Varredura BJJ/Judô: ${inserted} leads em ${queriesRun} queries`,
        { presets: data.presets, cities: data.cities, states: data.states });

      return { ok: true, inserted, queriesRun, searchId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (searchId) await supa.from("prospect_searches").update({ status: "failed" }).eq("id", searchId);
      await auditLog(context.supabase, context.userId, "sweep", "error", msg);
      throw new Error(msg);
    }
  });

// ============= DAILY MA AUTOPILOT SETTINGS =============

const dailyMaInput = z.object({
  daily_ma_sweep_enabled: z.boolean(),
  daily_ma_presets: z.array(z.string()).max(8).default([]),
  daily_ma_states: z.array(z.string().length(2)).max(27).default([]),
  daily_ma_cities: z.array(z.string().max(120)).max(20).default([]),
  daily_ma_per_preset: z.number().int().min(3).max(30).default(8),
});

export const getDailyMaSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supa = context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: JsonRow | null }> } } };
    };
    const { data } = await supa.from("prospect_settings")
      .select("daily_ma_sweep_enabled, daily_ma_presets, daily_ma_states, daily_ma_cities, daily_ma_per_preset, daily_ma_last_run_at")
      .eq("owner_id", context.userId).maybeSingle();
    return {
      daily_ma_sweep_enabled: (data?.daily_ma_sweep_enabled as boolean) ?? false,
      daily_ma_presets: (data?.daily_ma_presets as string[]) ?? [],
      daily_ma_states: (data?.daily_ma_states as string[]) ?? [],
      daily_ma_cities: (data?.daily_ma_cities as string[]) ?? [],
      daily_ma_per_preset: (data?.daily_ma_per_preset as number) ?? 8,
      daily_ma_last_run_at: (data?.daily_ma_last_run_at as string | null) ?? null,
    };
  });

export const saveDailyMaSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => dailyMaInput.parse(i))
  .handler(async ({ data, context }) => {
    const supa = context.supabase as unknown as {
      from: (t: string) => { upsert: (v: unknown, o?: unknown) => Promise<{ error: { message: string } | null }> };
    };
    const { error } = await supa.from("prospect_settings").upsert(
      { owner_id: context.userId, ...data },
      { onConflict: "owner_id" },
    );
    if (error) throw new Error(error.message);
    await auditLog(context.supabase, context.userId, "sweep", "daily_config",
      `Piloto diário BJJ/Judô ${data.daily_ma_sweep_enabled ? "ativado" : "desativado"}`,
      { ...data });
    return { ok: true };
  });

/** Enriquece 1 lead sob demanda. */
export const enrichLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ companyId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { enrichCompanyCore } = await import("./prospect-engine.server");
    return await enrichCompanyCore(context.supabase as unknown as { from: (t: string) => any }, context.userId, data.companyId);
  });

/** Enriquece em lote — todos pendentes do usuário OU a lista de IDs informada. */
export const enrichPendingLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    ids: z.array(z.string().uuid()).max(200).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { enrichCompanyCore } = await import("./prospect-engine.server");
    const supa = context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: unknown) => {
            in?: (k: string, v: unknown[]) => Promise<{ data: Array<{ company_id: string }> | null }>;
            order: (k: string, o?: unknown) => { limit: (n: number) => Promise<{ data: Array<{ company_id: string }> | null }> };
          };
        };
      };
    };

    let ids: string[] = [];
    if (data.ids && data.ids.length) {
      ids = data.ids.slice(0, data.limit);
    } else {
      const { data: rows } = await (context.supabase as unknown as {
        from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { eq: (k: string, v: unknown) => { order: (k: string, o?: unknown) => { limit: (n: number) => Promise<{ data: Array<{ company_id: string }> | null }> } } } } };
      }).from("prospect_enrichment_jobs")
        .select("company_id")
        .eq("owner_id", context.userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(data.limit);
      ids = (rows ?? []).map((r) => r.company_id);
    }

    let ok = 0, failed = 0, notFound = 0;
    for (const id of ids) {
      try {
        const r = await enrichCompanyCore(context.supabase as unknown as { from: (t: string) => any }, context.userId, id);
        if (r.foundRequired) ok++; else notFound++;
      } catch { failed++; }
    }
    await auditLog(context.supabase, context.userId, "enrichment", "batch",
      `Enriquecimento em lote: ${ok} sucesso · ${notFound} parcial · ${failed} falha`, { total: ids.length });
    return { processed: ids.length, ok, notFound, failed };
  });

// ============= BULK ACTIONS =============

export const bulkDeleteLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as {
      from: (t: string) => { delete: () => { in: (k: string, v: unknown[]) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } } };
    }).from("prospect_companies").delete().in("id", data.ids).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    await auditLog(context.supabase, context.userId, "lead", "bulk_delete",
      `${data.ids.length} leads excluídos`, { count: data.ids.length });
    return { ok: true, deleted: data.ids.length };
  });

export const bulkUpdateLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
    patch: z.object({
      status: z.string().max(30).optional(),
      pipeline_stage: z.string().max(30).optional(),
      tags: z.array(z.string()).optional(),
      responsible_name: z.string().nullable().optional(),
    }),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as unknown as {
      from: (t: string) => { update: (v: unknown) => { in: (k: string, v: unknown[]) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } } };
    }).from("prospect_companies").update(data.patch).in("id", data.ids).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    await auditLog(context.supabase, context.userId, "lead", "bulk_update",
      `${data.ids.length} leads atualizados`, { patch: data.patch as unknown as JsonRow });
    return { ok: true, updated: data.ids.length };
  });


// ============= CONTACT ACTIONS (log de e-mail/whatsapp/instagram) =============

export const logContactAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    companyId: z.string().uuid(),
    channel: z.enum(["email","whatsapp","instagram","phone"]),
    note: z.string().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const labels: Record<string, string> = {
      email: "E-mail enviado", whatsapp: "WhatsApp iniciado",
      instagram: "Perfil do Instagram aberto", phone: "Ligação iniciada",
    };
    await logEvent(context.supabase, context.userId, data.companyId,
      `contact_${data.channel}`, labels[data.channel], { note: data.note ?? null });
    await (context.supabase as unknown as {
      from: (t: string) => { update: (v: unknown) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } };
    }).from("prospect_companies").update({
      last_contacted_at: new Date().toISOString(),
      pipeline_stage: "contato_iniciado",
    }).eq("id", data.companyId).eq("owner_id", context.userId);
    return { ok: true };
  });

// ============= AI helpers =============

export const generateAiPitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ companyId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { aiExtract } = await import("./prospect-engine.server");
    const { data: c } = await (context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: unknown }> } } };
    }).from("prospect_companies").select("name, category, city, description, ai_summary").eq("id", data.companyId).single();
    if (!c) throw new Error("Lead não encontrado");
    const company = c as { name: string; category: string | null; city: string | null; description: string | null; ai_summary: string | null };

    const ai = await aiExtract<{ subject: string; email: string; whatsapp: string; best_time: string; priority_channel: string }>(
      `Contexto: empresa "${company.name}" (${company.category ?? "-"}) em ${company.city ?? "-"}. Resumo: ${company.ai_summary ?? company.description ?? "-"}.\n\nGere uma abordagem comercial B2B para a AMT Fight Wear (fabricante de kimonos, faixas e patches). Formato JSON: {subject (max 60), email (formal, 3 parágrafos), whatsapp (curto, 2-3 linhas), best_time (ex: "Terça 10h-11h"), priority_channel ("email"|"whatsapp"|"instagram")}. Nunca use gírias, emojis ou intimidade.`,
      "Você é redator comercial B2B sério, institucional, tom formal.",
    );
    if (!ai) throw new Error("IA indisponível no momento");

    await (context.supabase as unknown as {
      from: (t: string) => { update: (v: unknown) => { eq: (k: string, v: string) => Promise<unknown> } };
    }).from("prospect_companies").update({
      ai_pitch: ai.email, best_channel: ai.priority_channel as "email" | "whatsapp" | "instagram",
    }).eq("id", data.companyId);

    return ai;
  });

// ============= SETTINGS =============

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } } };
    }).from("prospect_settings").select("*").eq("owner_id", context.userId).maybeSingle();
    return data ?? null;
  });

export const upsertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    required_fields: z.array(z.string()).optional(),
    score_weights: z.record(z.string(), z.number()).optional(),
    email_template: z.string().nullable().optional(),
    email_subject_template: z.string().nullable().optional(),
    whatsapp_template: z.string().nullable().optional(),
    instagram_template: z.string().nullable().optional(),
    instagram_media_url: z.string().url().nullable().optional().or(z.literal("")),
    autopilot_enabled: z.boolean().optional(),
    priority_regions: z.array(z.string()).optional(),
    search_interval_min: z.number().int().min(5).max(1440).optional(),
    enrichment_interval_min: z.number().int().min(5).max(1440).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await (context.supabase as unknown as {
      from: (t: string) => { upsert: (v: unknown, o?: unknown) => Promise<{ error: unknown }> };
    }).from("prospect_settings").upsert(
      { owner_id: context.userId, ...data, updated_at: new Date().toISOString() },
      { onConflict: "owner_id" },
    );
    return { ok: true };
  });

// ============= LOGS / SEARCHES / EXPORTS listing =============

export const listSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (k: string, o?: unknown) => Promise<{ data: JsonRow[] | null }> } } };
    }).from("prospect_searches").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const listLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (k: string, o?: unknown) => { limit: (n: number) => Promise<{ data: JsonRow[] | null }> } } } };
    }).from("prospect_logs").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(500);
    return data ?? [];
  });

export const listEnrichmentQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { order: (k: string, o?: unknown) => { limit: (n: number) => Promise<{ data: JsonRow[] | null }> } } } };
    }).from("prospect_enrichment_jobs")
      .select("*, prospect_companies!inner(name, city, state)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// Upload da imagem que acompanha a mensagem padrão de Instagram DM.
// Grava em product-images (bucket público) e retorna URL pública estável.
export const uploadOutreachImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      base64: z.string().min(100),
      ext: z.enum(["png", "jpg", "jpeg", "webp"]).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const bin = atob(raw);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = data.ext ?? "png";
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const path = `prospect-outreach/${context.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, bytes, { contentType, upsert: true });
    if (up.error) throw new Error(`Upload falhou: ${up.error.message}`);
    const pub = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
    return { url: pub.data.publicUrl, path };
  });

// ============= PURGE ALL DATA =============

/**
 * Apaga TODOS os dados do Lead Engine do usuário atual: empresas, contatos,
 * timeline, jobs de enriquecimento, buscas, exportações e logs.
 * As tabelas com FK ON DELETE CASCADE limpam junto ao apagar `prospect_companies`,
 * mas fazemos a limpeza explícita para cobrir também registros órfãos.
 */
export const purgeAllProspectData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supa = context.supabase as unknown as {
      from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> } };
    };
    const tables = [
      "prospect_timeline",
      "prospect_contacts",
      "prospect_enrichment_jobs",
      "prospect_sequence_runs",
      "prospect_exports",
      "prospect_logs",
      "prospect_searches",
      "prospect_companies",
    ];
    const results: Record<string, string> = {};
    for (const t of tables) {
      const { error } = await supa.from(t).delete().eq("owner_id", context.userId);
      results[t] = error ? `erro: ${error.message}` : "ok";
    }
    await auditLog(context.supabase, context.userId, "lead", "purge_all",
      "Limpeza completa do Lead Engine", results as unknown as JsonRow);
    return { ok: true, tables: results };
  });

