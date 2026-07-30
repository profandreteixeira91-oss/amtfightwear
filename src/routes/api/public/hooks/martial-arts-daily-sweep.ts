/**
 * Cron diário — Varredura automática de leads (Modo Artes Marciais).
 * Percorre todos os usuários com `daily_ma_sweep_enabled=true` em
 * `prospect_settings` e roda a mesma lógica de `runMartialArtsSweep`,
 * salvando os leads em `prospect_companies`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";

export const Route = createFileRoute("/api/public/hooks/martial-arts-daily-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { discoverCompanies, buildMartialArtsQueries } = await import("@/lib/prospect/prospect-engine.server");

        const { data: rows, error } = await supabaseAdmin
          .from("prospect_settings")
          .select(
            "owner_id, daily_ma_presets, daily_ma_states, daily_ma_cities, daily_ma_per_preset, daily_ma_last_run_at",
          )
          .eq("daily_ma_sweep_enabled", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!rows?.length) return Response.json({ processed: 0 });

        const results: Array<{ owner: string; inserted: number; error?: string }> = [];
        const cutoff = Date.now() - 20 * 3600 * 1000; // >=20h desde a última rodada

        for (const s of rows as Array<{
          owner_id: string;
          daily_ma_presets: string[] | null;
          daily_ma_states: string[] | null;
          daily_ma_cities: string[] | null;
          daily_ma_per_preset: number | null;
          daily_ma_last_run_at: string | null;
        }>) {
          if (s.daily_ma_last_run_at && new Date(s.daily_ma_last_run_at).getTime() > cutoff) continue;
          const presets = s.daily_ma_presets ?? [];
          if (presets.length === 0) continue;
          const perPreset = s.daily_ma_per_preset ?? 8;
          const states = s.daily_ma_states ?? [];
          const cities = s.daily_ma_cities ?? [];

          const locations: Array<{ city: string | null; state: string | null }> = [];
          for (const c of cities) locations.push({ city: c, state: null });
          for (const st of states) locations.push({ city: null, state: st });
          if (locations.length === 0) locations.push({ city: null, state: null });

          let inserted = 0;
          let queriesRun = 0;
          const seen = new Set<string>();

          const { data: srow } = await supabaseAdmin.from("prospect_searches").insert({
            owner_id: s.owner_id,
            name: `Piloto Diário BJJ/Judô ${new Date().toLocaleString("pt-BR")}`,
            segment: presets.join(", "),
            city: cities.join(", ") || null,
            state: states.join(", ") || null,
            country: "BR",
            target_count: perPreset * presets.length * locations.length,
            status: "running",
          }).select("id").single();

          try {
            for (const preset of presets) {
              for (const loc of locations) {
                const { queries, allowInstagram, category } = buildMartialArtsQueries(preset, loc);
                queriesRun += queries.length;
                const companies = await discoverCompanies({
                  segment: category, city: loc.city, state: loc.state,
                  queries, allowInstagram, limit: perPreset,
                });
                for (const c of companies) {
                  const key = c.website ?? c.source_url;
                  if (seen.has(key)) continue;
                  seen.add(key);
                  const { data: row } = await supabaseAdmin.from("prospect_companies").insert({
                    owner_id: s.owner_id,
                    name: c.name, normalized_name: c.normalized_name,
                    category: c.category, segment: preset,
                    city: c.city, state: c.state, country: "BR",
                    website: c.website, description: c.description, source_url: c.source_url,
                    origin: "daily_martial_arts",
                    pipeline_stage: "captado",
                  }).select("id").single();
                  if (row?.id) {
                    inserted++;
                    await supabaseAdmin.from("prospect_enrichment_jobs").insert({
                      owner_id: s.owner_id, company_id: row.id, status: "pending",
                    });
                    await supabaseAdmin.from("prospect_timeline").insert({
                      owner_id: s.owner_id, company_id: row.id,
                      event_type: "lead_created",
                      title: `Lead capturado (piloto diário — ${category})`,
                      payload: { preset, city: loc.city, state: loc.state, source: "cron" },
                    });
                  }
                }
              }
            }

            if (srow?.id) {
              await supabaseAdmin.from("prospect_searches").update({
                status: "success", results_count: inserted, last_run_at: new Date().toISOString(),
              }).eq("id", srow.id);
            }
            await supabaseAdmin.from("prospect_logs").insert({
              owner_id: s.owner_id, source: "sweep", action: "daily_cron",
              message: `Piloto diário: ${inserted} leads em ${queriesRun} queries`,
              metadata: { presets, cities, states, per_preset: perPreset },
            });
            await supabaseAdmin.from("prospect_settings")
              .update({ daily_ma_last_run_at: new Date().toISOString() })
              .eq("owner_id", s.owner_id);
            results.push({ owner: s.owner_id, inserted });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (srow?.id) await supabaseAdmin.from("prospect_searches").update({ status: "failed" }).eq("id", srow.id);
            await supabaseAdmin.from("prospect_logs").insert({
              owner_id: s.owner_id, source: "sweep", action: "daily_cron_error", message: msg,
            });
            results.push({ owner: s.owner_id, inserted, error: msg });
          }
        }

        return Response.json({ processed: results.length, results });
      },
    },
  },
});
