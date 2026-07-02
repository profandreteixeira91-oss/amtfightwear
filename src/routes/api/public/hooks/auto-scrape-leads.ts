import { createFileRoute } from "@tanstack/react-router";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

// Rotação diária: cada dia do ano seleciona 3 combinações (região prioritária + fallback)
const CITY_POOL: Array<{ city: string; state: string; region: string }> = [
  // Nordeste (prioridade)
  { city: "Recife", state: "PE", region: "nordeste" },
  { city: "Salvador", state: "BA", region: "nordeste" },
  { city: "Fortaleza", state: "CE", region: "nordeste" },
  { city: "João Pessoa", state: "PB", region: "nordeste" },
  { city: "Natal", state: "RN", region: "nordeste" },
  { city: "Maceió", state: "AL", region: "nordeste" },
  { city: "Teresina", state: "PI", region: "nordeste" },
  { city: "São Luís", state: "MA", region: "nordeste" },
  { city: "Aracaju", state: "SE", region: "nordeste" },
  { city: "Feira de Santana", state: "BA", region: "nordeste" },
  { city: "Caruaru", state: "PE", region: "nordeste" },
  { city: "Petrolina", state: "PE", region: "nordeste" },
  // Sudeste
  { city: "São Paulo", state: "SP", region: "sudeste" },
  { city: "Rio de Janeiro", state: "RJ", region: "sudeste" },
  { city: "Belo Horizonte", state: "MG", region: "sudeste" },
  { city: "Campinas", state: "SP", region: "sudeste" },
  { city: "Vitória", state: "ES", region: "sudeste" },
  // Sul
  { city: "Curitiba", state: "PR", region: "sul" },
  { city: "Porto Alegre", state: "RS", region: "sul" },
  { city: "Florianópolis", state: "SC", region: "sul" },
  // Centro-Oeste
  { city: "Brasília", state: "DF", region: "centro-oeste" },
  { city: "Goiânia", state: "GO", region: "centro-oeste" },
  { city: "Campo Grande", state: "MS", region: "centro-oeste" },
  // Norte
  { city: "Manaus", state: "AM", region: "norte" },
  { city: "Belém", state: "PA", region: "norte" },
];

const QUERY_THEMES = [
  { modality: "BJJ", term: '("academia" OR "equipe" OR "team") "jiu-jitsu"' },
  { modality: "Judô", term: '("academia" OR "escola" OR "associação") "judô"' },
  { modality: "BJJ", term: '"projeto social" ("jiu-jitsu" OR "bjj")' },
  { modality: "Judô", term: '"projeto social" "judô"' },
  { modality: "MMA", term: '("academia" OR "team") ("mma" OR "muay thai")' },
];

type LeadDraft = {
  name: string;
  responsible?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  modality?: string | null;
  lead_type?: string | null;
  source?: string | null;
  notes?: string | null;
  instagram?: string | null;
  website?: string | null;
};

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function firecrawlSearch(query: string, limit = 10) {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!fcKey) throw new Error("FIRECRAWL_API_KEY ausente");
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${fcKey}` },
    body: JSON.stringify({
      query,
      limit,
      lang: "pt",
      country: "br",
      location: "Brazil",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const json = (await res.json()) as {
    data?: { web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }> };
    web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
  };
  return json.data?.web ?? json.web ?? [];
}

async function aiExtractLeads(
  rawText: string,
  target: { modality: string; source: string; city: string; state: string },
): Promise<LeadDraft[]> {
  const apiKey = process.env.LOVABLE_API_KEY!;
  const prompt = `Você extrai contatos B2B (academias, equipes, escolas e projetos sociais) de Jiu-Jitsu/Judô/MMA a partir de trechos da web.

REGRAS RÍGIDAS DE LOCALIZAÇÃO — DESCARTE tudo que não bater:
- Só inclua contatos localizados fisicamente em ${target.city} - ${target.state}, Brasil.
- Se a fonte cita outra cidade ou estado (ex.: Rio de Janeiro, São Paulo, Minas Gerais, etc.), IGNORE aquele item completamente.
- Se não houver evidência clara da cidade/estado, IGNORE — nunca invente localização.
- Prefira academias, equipes/team, escolas e projetos sociais. Ignore lojas de e-commerce, blogs, portais de notícia e agregadores.

Retorne JSON: { "leads": [ { "name", "responsible", "phone", "email", "city", "state", "instagram", "website", "notes" } ] }.
- Campos ausentes = null. "city" deve ser "${target.city}" e "state" deve ser "${target.state}".
- Notas curtas com pistas úteis (bairro, tipo de projeto, faixa do responsável).

Texto:
${rawText.slice(0, 18000)}`;
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Você extrai contatos comerciais estruturados. Responda apenas JSON válido. Descarte agressivamente qualquer contato fora da cidade/estado solicitado." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as { leads?: LeadDraft[] };
  const cityN = normalize(target.city);
  const stateN = target.state.toLowerCase();
  return (parsed.leads ?? [])
    .filter((l) => {
      if (!l.name) return false;
      const c = normalize(l.city ?? "");
      const st = (l.state ?? "").toLowerCase();
      // Aceita quando cidade bate OU estado bate (evita falso descarte por variação do nome)
      return c.includes(cityN) || cityN.includes(c) || st === stateN;
    })
    .map((l) => ({
      ...l,
      city: target.city,
      state: target.state,
      modality: l.modality ?? target.modality,
      source: target.source,
      lead_type: l.lead_type ?? "Academia",
    }));
}


function dayOfYear(d = new Date()) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

function selectTargetsForToday(): Array<{ city: string; state: string; theme: (typeof QUERY_THEMES)[number] }> {
  const day = dayOfYear();
  const ne = CITY_POOL.filter((c) => c.region === "nordeste");
  const others = CITY_POOL.filter((c) => c.region !== "nordeste");
  // 2 nordeste + 1 outra região por dia, rotacionando
  const pickNe1 = ne[day % ne.length];
  const pickNe2 = ne[(day * 7 + 3) % ne.length];
  const pickOther = others[day % others.length];
  const t1 = QUERY_THEMES[day % QUERY_THEMES.length];
  const t2 = QUERY_THEMES[(day + 2) % QUERY_THEMES.length];
  const t3 = QUERY_THEMES[(day + 4) % QUERY_THEMES.length];
  return [
    { city: pickNe1.city, state: pickNe1.state, theme: t1 },
    { city: pickNe2.city, state: pickNe2.state, theme: t2 },
    { city: pickOther.city, state: pickOther.state, theme: t3 },
  ];
}

export const Route = createFileRoute("/api/public/hooks/auto-scrape-leads")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Respeita o toggle global do outreach: se o piloto de prospecção estiver desligado, não busca.
          const { data: settings } = await supabaseAdmin
            .from("outreach_settings")
            .select("enabled")
            .limit(1)
            .maybeSingle();
          if (settings && settings.enabled === false) {
            return Response.json({ skipped: "outreach disabled" });
          }

          const targets = selectTargetsForToday();
          const results: Array<Record<string, unknown>> = [];
          let totalInserted = 0;

          // Dedupe cache (name+city, website, instagram_handle)
          const { data: existing } = await supabaseAdmin
            .from("leads")
            .select("name, email, city, website, instagram_handle");
          const seenKey = new Set(
            (existing ?? []).map(
              (r) =>
                `${(r.email ?? "").toLowerCase()}|${(r.name ?? "").toLowerCase()}|${(r.city ?? "").toLowerCase()}`.trim(),
            ),
          );
          const seenSite = new Set(
            (existing ?? []).map((r) => (r.website ?? "").toLowerCase()).filter(Boolean),
          );
          const seenIg = new Set(
            (existing ?? []).map((r) => (r.instagram_handle ?? "").toLowerCase()).filter(Boolean),
          );

          for (const t of targets) {
            try {
              const q = `${t.theme.term} "${t.city}" ${t.state} Brasil -site:amtfightwear.com.br`;
              const web = await firecrawlSearch(q, 10);
              if (!web.length) {
                results.push({ target: `${t.city}/${t.state}`, inserted: 0, note: "no results" });
                continue;
              }
              const cityN = normalize(t.city);
              const stateN = t.state.toLowerCase();
              const relevant = web.filter((r) => {
                const blob = normalize(`${r.title ?? ""} ${r.description ?? ""} ${r.markdown ?? ""}`);
                return blob.includes(cityN) || blob.includes(` ${stateN} `) || blob.includes(`/${stateN}/`) || blob.includes(`-${stateN}`);
              });
              if (!relevant.length) {
                results.push({ target: `${t.city}/${t.state}`, inserted: 0, note: "no local matches" });
                continue;
              }
              const bundle = relevant
                .map(
                  (r, i) =>
                    `[${i + 1}] ${r.title ?? ""}\nURL: ${r.url ?? ""}\n${r.description ?? ""}\n${(r.markdown ?? "").slice(0, 2500)}`,
                )
                .join("\n\n---\n\n");
              const drafts = await aiExtractLeads(bundle, { modality: t.theme.modality, source: "Auto-Scrape", city: t.city, state: t.state });


              const rows = drafts
                .filter((d) => {
                  const key = `${(d.email ?? "").toLowerCase()}|${(d.name ?? "").toLowerCase()}|${(d.city ?? t.city).toLowerCase()}`;
                  const site = (d.website ?? "").toLowerCase();
                  const igM = (d.instagram ?? "").match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
                  const ig = (igM ? igM[1] : (d.instagram ?? "").replace(/^@/, "").split(/[/?#]/)[0] || "").toLowerCase();
                  if (!d.name || seenKey.has(key)) return false;
                  if (site && seenSite.has(site)) return false;
                  if (ig && seenIg.has(ig)) return false;
                  seenKey.add(key);
                  if (site) seenSite.add(site);
                  if (ig) seenIg.add(ig);
                  return true;
                })
                .map((d) => {
                  const igMatch = (d.instagram ?? "").match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
                  const igHandle = igMatch ? igMatch[1] : (d.instagram ?? "").replace(/^@/, "").split(/[/?#]/)[0] || null;
                  return {
                    name: d.name,
                    responsible: d.responsible ?? null,
                    phone: d.phone ?? null,
                    email: d.email ?? null,
                    website: d.website ?? null,
                    instagram_handle: igHandle && /^[A-Za-z0-9_.]{1,30}$/.test(igHandle) ? igHandle : null,
                    instagram_url: igHandle && /^[A-Za-z0-9_.]{1,30}$/.test(igHandle) ? `https://instagram.com/${igHandle}` : null,
                    city: d.city ?? t.city,
                    state: t.state,
                    modality: d.modality ?? t.theme.modality,
                    lead_type: d.lead_type ?? "Academia",
                    source: "Auto-Scrape",
                    status: "Novo",
                    pipeline_stage: "novo",
                    notes: [d.notes].filter(Boolean).join(" · "),
                  };
                });

              if (rows.length) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: ins, error } = await supabaseAdmin.from("leads").insert(rows as any).select("id");
                if (error) {
                  results.push({ target: `${t.city}/${t.state}`, error: error.message });
                  continue;
                }
                totalInserted += ins?.length ?? 0;
                results.push({ target: `${t.city}/${t.state}`, theme: t.theme.term, inserted: ins?.length ?? 0 });
              } else {
                results.push({ target: `${t.city}/${t.state}`, inserted: 0, note: "all duplicates" });
              }
            } catch (e) {
              results.push({ target: `${t.city}/${t.state}`, error: e instanceof Error ? e.message : String(e) });
            }
          }

          return Response.json({ ok: true, totalInserted, results });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
