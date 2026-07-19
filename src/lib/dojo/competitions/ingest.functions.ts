// Motor de ingestão: executa conectores, normaliza dados e persiste na
// biblioteca central `competitions`. Cada fonte roda de forma independente
// (falha isolada). Também expõe funções auxiliares para o painel admin.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classify } from "@/lib/dojo/competitions/classifier";
import {
  runScrapeCompetitions,
  scrapeCustomSource,
  type LiveCompetition,
} from "@/lib/dojo/competitions.functions";
import { PROVIDER_BY_ID, type ProviderId } from "@/lib/dojo/competitions/providers";

type SourceRow = {
  id: string;
  code: string;
  name: string;
  url: string | null;
  enabled: boolean;
  connector: string;
  config: Record<string, unknown> | null;
};

async function serverAdmin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

function mapProviderToSourceCode(providerId: ProviderId): string {
  // Mapeia identificadores dos scrapers para códigos das fontes na biblioteca.
  const m: Record<string, string> = {
    ibjjf: "ibjjf",
    ibjjf_intl: "ibjjf",
    smoothcomp: "cbjjf",
    smoothcomp_intl: "uaejjf",
    sou_competidor: "cbjjf",
    bjj_tour: "cbjjf",
    cbjj: "cbjjf",
    cbjje: "cbjjf",
    uaejjf: "uaejjf",
    adcc: "adcc",
    grappling_industries: "uaejjf",
    flograppling: "uaejjf",
    who_prevails: "uaejjf",
    naga: "uaejjf",
  };
  return m[providerId] ?? "ibjjf";
}

async function upsertOne(supabaseAdmin: Awaited<ReturnType<typeof serverAdmin>>, sourceRow: SourceRow, ev: LiveCompetition) {
  const scopeHint = sourceRow.config?.["country"] === "BR" ? "national" : "international";
  const cls = classify({
    name: ev.name,
    organization: ev.organizer,
    description: null,
    country: ev.country,
    state: ev.state,
    city: ev.city,
    scopeHint: scopeHint as "national" | "international",
  });

  const externalId = ev.external_url;
  const record = {
    source_id: sourceRow.id,
    source_code: sourceRow.code,
    external_id: externalId,
    name: ev.name,
    organization: ev.organizer,
    country: ev.country,
    state: ev.state,
    city: ev.city,
    venue: ev.venue_name,
    start_at: ev.starts_at,
    end_at: ev.ends_at,
    registration_deadline: ev.registration_deadline,
    official_url: ev.external_url,
    registration_url: ev.external_url,
    scope: cls.scope,
    tier: cls.tier,
    classification: cls as unknown as never,
    last_seen_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from("competitions")
    .select("id")
    .eq("source_code", sourceRow.code)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("competitions").update(record as never).eq("id", existing.id);
    return "updated" as const;
  }
  await supabaseAdmin.from("competitions").insert(record as never);
  return "inserted" as const;
}

const runInputSchema = z.object({
  onlySourceCodes: z.array(z.string()).optional(),
});

/**
 * Executa a coleta para todas as fontes habilitadas (ou apenas as fornecidas).
 * Uso: chamado pelo cron ou pelo botão "Atualizar agora" do admin.
 */
export const runCompetitionIngest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => runInputSchema.parse(i ?? {}))
  .handler(async ({ data }) => {
    const supabaseAdmin = await serverAdmin();
    const { data: sources, error } = await supabaseAdmin
      .from("competition_sources")
      .select("id, code, name, url, enabled, connector, config")
      .order("code");
    if (error) throw new Error(error.message);

    const targets = (sources ?? [])
      .filter((s) => s.enabled)
      .filter((s) => !data.onlySourceCodes || data.onlySourceCodes.includes(s.code));

    const perSource: Array<{ code: string; found: number; inserted: number; updated: number; error?: string }> = [];

    for (const src of targets) {
      const { data: run } = await supabaseAdmin
        .from("competition_ingest_runs")
        .insert({ source_id: src.id, source_code: src.code, status: "running" })
        .select("id")
        .single();
      const runId = run?.id as string | undefined;

      // Descobre quais provedores do scraper mapeiam para essa fonte.
      const providers = Object.keys(PROVIDER_BY_ID).filter(
        (p) => mapProviderToSourceCode(p as ProviderId) === src.code,
      );
      if (providers.length === 0 && src.connector !== "custom") {
        if (runId) {
          await supabaseAdmin
            .from("competition_ingest_runs")
            .update({ status: "skipped", finished_at: new Date().toISOString() })
            .eq("id", runId);
        }
        perSource.push({ code: src.code, found: 0, inserted: 0, updated: 0 });
        continue;
      }

      try {
        let events: LiveCompetition[] = [];
        if (src.connector === "custom") {
          if (!src.url) throw new Error("Fonte customizada sem URL");
          const cfg = (src.config ?? {}) as { country?: string | null };
          events = await scrapeCustomSource(src.url, src.name, cfg.country ?? null);
        } else {
          const result = await runScrapeCompetitions(providers);
          events = result.competitions ?? [];
        }
        let inserted = 0;
        let updated = 0;
        for (const ev of events) {
          try {
            const out = await upsertOne(supabaseAdmin, src as SourceRow, ev);
            if (out === "inserted") inserted++;
            else updated++;
          } catch (e) {
            console.error(`[ingest] upsert error for ${src.code}:`, e);
          }
        }

        if (runId) {
          await supabaseAdmin
            .from("competition_ingest_runs")
            .update({
              status: "success",
              finished_at: new Date().toISOString(),
              found: events.length,
              inserted,
              updated,
            })
            .eq("id", runId);
        }
        await supabaseAdmin
          .from("competition_sources")
          .update({ last_run_at: new Date().toISOString(), last_status: "success", last_error: null })
          .eq("id", src.id);

        perSource.push({ code: src.code, found: events.length, inserted, updated });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (runId) {
          await supabaseAdmin
            .from("competition_ingest_runs")
            .update({ status: "error", finished_at: new Date().toISOString(), error: msg })
            .eq("id", runId);
        }
        await supabaseAdmin
          .from("competition_sources")
          .update({ last_run_at: new Date().toISOString(), last_status: "error", last_error: msg })
          .eq("id", src.id);
        perSource.push({ code: src.code, found: 0, inserted: 0, updated: 0, error: msg });
      }
    }

    return { ok: true, perSource, ranAt: new Date().toISOString() };
  });

/**
 * Retorna estado atual das fontes + últimas execuções.
 */
export const getIngestStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await serverAdmin();
  const { data: sources } = await supabaseAdmin
    .from("competition_sources")
    .select("*")
    .order("code");
  const { data: runs } = await supabaseAdmin
    .from("competition_ingest_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  return { sources: sources ?? [], runs: runs ?? [] };
});

const toggleSchema = z.object({ id: z.string(), enabled: z.boolean() });
export const setSourceEnabled = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => toggleSchema.parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await serverAdmin();
    const { error } = await supabaseAdmin
      .from("competition_sources")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
