import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

// ---------- Utilities ----------
async function firecrawlScrape(url: string, opts?: { onlyMain?: boolean }) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: opts?.onlyMain ?? true,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json;
  } catch {
    return null;
  }
}

function extractContacts(text: string) {
  const emails = Array.from(new Set((text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? []).filter(
    (e) => !/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(e),
  )));
  const phones = Array.from(
    new Set(text.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g) ?? []),
  );
  const ig = text.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)?.[1];
  const fb = text.match(/facebook\.com\/([A-Za-z0-9_.\-]+)/i)?.[1];
  const li = text.match(/linkedin\.com\/(?:in|company)\/([A-Za-z0-9_.\-]+)/i)?.[1];
  const whats =
    text.match(/wa\.me\/(\d+)/i)?.[1] ??
    text.match(/api\.whatsapp\.com\/send\?phone=(\d+)/i)?.[1] ??
    text.match(/whatsapp[^\d]{0,10}(\+?55\s?\d{2}\s?9?\d{4}[-\s]?\d{4})/i)?.[1];
  const cnpj = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?0001[-]?\d{2}\b/)?.[0];
  return { emails, phones, ig, fb, li, whats, cnpj };
}

function detectTech(html: string): string[] {
  const tech: string[] = [];
  const map: [RegExp, string][] = [
    [/wp-content|wordpress/i, "WordPress"],
    [/shopify/i, "Shopify"],
    [/wix\.com/i, "Wix"],
    [/squarespace/i, "Squarespace"],
    [/react/i, "React"],
    [/next\.js|__NEXT_DATA__/i, "Next.js"],
    [/gtag\(|google-analytics/i, "Google Analytics"],
    [/facebook\.net\/.+fbevents/i, "Meta Pixel"],
    [/hotjar/i, "Hotjar"],
    [/tailwind/i, "Tailwind"],
  ];
  for (const [rx, name] of map) if (rx.test(html)) tech.push(name);
  return tech;
}

async function fetchInstagramProfile(handle: string) {
  if (!handle) return null;
  const clean = handle.replace(/^@/, "").split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(clean)) return null;
  const scraped = await firecrawlScrape(`https://www.instagram.com/${clean}/`, { onlyMain: false });
  if (!scraped) return { handle: clean, url: `https://instagram.com/${clean}` };
  const html = String(scraped.html ?? "") + " " + String(scraped.markdown ?? "");
  const bio =
    html.match(/"biography"\s*:\s*"([^"]{0,500})"/)?.[1] ??
    html.match(/<meta property="og:description" content="([^"]{0,500})"/)?.[1] ??
    null;
  const followersMatch =
    html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/)?.[1] ??
    html.match(/([\d.,]+[KMkm]?)\s*Followers/)?.[1];
  const followers = followersMatch ? parseFollowerCount(followersMatch) : null;
  const verified = /"is_verified"\s*:\s*true/.test(html);
  const isBusiness =
    /"is_business_account"\s*:\s*true/.test(html) ||
    /"business_category_name"\s*:\s*"[^"]+"/.test(html);
  const avatar =
    html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/)?.[1]?.replace(/\\u0026/g, "&") ??
    html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ??
    null;
  return {
    handle: clean,
    url: `https://instagram.com/${clean}`,
    bio: bio ? bio.replace(/\\n/g, " ").slice(0, 500) : null,
    followers,
    verified,
    isBusiness,
    avatar,
  };
}

function parseFollowerCount(s: string): number | null {
  const m = s.trim().replace(/,/g, ".").match(/^([\d.]+)([KMkm])?$/);
  if (!m) return Number.isFinite(+s) ? Number(s) : null;
  const n = parseFloat(m[1]);
  const suf = (m[2] ?? "").toLowerCase();
  if (suf === "k") return Math.round(n * 1000);
  if (suf === "m") return Math.round(n * 1_000_000);
  return Math.round(n);
}

function computeLeadScore(lead: Record<string, unknown>) {
  let s = 0;
  if (lead.email) s += 30;
  if (lead.instagram_handle) s += 25;
  if (lead.phone) s += 15;
  if (lead.website) s += 10;
  if (lead.whatsapp) s += 10;
  if (lead.instagram_followers && Number(lead.instagram_followers) > 500) s += 5;
  if (lead.instagram_bio) s += 5;
  return Math.min(100, s);
}

async function aiAnalyzeLead(lead: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const prompt = `Analise este lead B2B para a AMT Fight Wear (fabricante de kimonos de BJJ/Judô, karategis, faixas e patches bordados). Retorne JSON:
{
  "summary": "2 frases objetivas sobre o negócio",
  "opportunities": "1-2 oportunidades comerciais concretas (ex.: uniformes para equipe X, patches para y alunos)",
  "approach": "1 frase de abordagem inicial estritamente institucional",
  "recommended_channel": "email" | "instagram" | "whatsapp",
  "best_hour": "HH:MM-HH:MM"
}
Lead: ${JSON.stringify(lead).slice(0, 3500)}`;
  try {
    const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
  } catch {
    return null;
  }
}

async function enrichLeadCore(supabase: any, leadId: string) {
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) throw new Error("Lead não encontrado");

  await supabase.from("leads").update({ enrichment_status: "processing" }).eq("id", leadId);

  let text = `${lead.name ?? ""} ${lead.notes ?? ""}`;
  let html = "";
  let tech: string[] = [];
  let websiteTitle: string | null = null;

  if (lead.website) {
    const scraped = await firecrawlScrape(lead.website);
    if (scraped?.markdown) text += "\n" + scraped.markdown;
    if (scraped?.html) {
      html = scraped.html;
      tech = detectTech(html);
      websiteTitle =
        html.match(/<title>([^<]{1,180})<\/title>/i)?.[1]?.trim() ??
        scraped?.metadata?.title ??
        null;
    }
  }

  const c = extractContacts(text + " " + html);

  // Try to enrich Instagram profile
  const igHandle = lead.instagram_handle ?? c.ig ?? null;
  let igProfile: Awaited<ReturnType<typeof fetchInstagramProfile>> = null;
  if (igHandle) {
    igProfile = await fetchInstagramProfile(igHandle);
  }

  const enriched: Record<string, unknown> = {
    email: lead.email ?? c.emails[0] ?? null,
    phone: lead.phone ?? c.phones[0] ?? null,
    whatsapp: lead.whatsapp ?? c.whats ?? null,
    cnpj: lead.cnpj ?? c.cnpj ?? null,
    facebook: lead.facebook ?? (c.fb ? `https://facebook.com/${c.fb}` : null),
    linkedin: lead.linkedin ?? (c.li ? `https://linkedin.com/in/${c.li}` : null),
    technologies: tech,
    website_title: websiteTitle,
    instagram_handle: igProfile?.handle ?? lead.instagram_handle ?? null,
    instagram_url: igProfile?.url ?? lead.instagram_url ?? null,
    instagram_bio: igProfile?.bio ?? lead.instagram_bio ?? null,
    instagram_followers: igProfile?.followers ?? lead.instagram_followers ?? null,
    instagram_verified: igProfile?.verified ?? lead.instagram_verified ?? null,
    instagram_is_business: igProfile?.isBusiness ?? lead.instagram_is_business ?? null,
    instagram_avatar_url: igProfile?.avatar ?? lead.instagram_avatar_url ?? null,
  };

  const merged = { ...lead, ...enriched };
  const score = computeLeadScore(merged);
  const ai = await aiAnalyzeLead(merged);

  const qualityFlag =
    !enriched.email && !enriched.instagram_handle ? "low_quality" : "ready";

  const finalPatch = {
    ...enriched,
    ai_score: score,
    ai_summary: ai?.summary ?? lead.ai_summary ?? null,
    ai_approach: ai?.approach ?? lead.ai_approach ?? null,
    ai_opportunities: ai?.opportunities ?? null,
    ai_recommended_channel: ai?.recommended_channel ?? null,
    ai_best_hour: ai?.best_hour ?? lead.ai_best_hour ?? "10:00-12:00",
    enrichment_status: "done",
    enriched_at: new Date().toISOString(),
    data_source: lead.data_source ?? "firecrawl+ai",
    pipeline_stage: lead.pipeline_stage === "novo" ? "enriquecido" : lead.pipeline_stage,
    quality_flag: qualityFlag,
  };
  await supabase.from("leads").update(finalPatch).eq("id", leadId);
  return finalPatch;
}

// ---------- Dashboard KPIs (avançado) ----------
export const getScraperDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [runs, leads, enrich, exp, outreach] = await Promise.all([
      supabase.from("scrape_runs").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("*"),
      supabase.from("lead_enrichments").select("id", { count: "exact", head: true }),
      supabase.from("lead_exports").select("id", { count: "exact", head: true }),
      supabase.from("outreach_log").select("channel, status, created_at"),
    ]);

    const rows = (leads.data ?? []) as any[];
    const today = new Date().toISOString().slice(0, 10);
    const totals = {
      searches: runs.count ?? 0,
      leads: rows.length,
      companies: rows.length,
      leadsToday: rows.filter((r) => (r.created_at ?? "").slice(0, 10) === today).length,
      enriched: rows.filter((r) => r.enrichment_status === "done").length,
      emails: rows.filter((r) => r.email).length,
      instagrams: rows.filter((r) => r.instagram_handle).length,
      phones: rows.filter((r) => r.phone).length,
      sites: rows.filter((r) => r.website).length,
      whatsapps: rows.filter((r) => r.whatsapp).length,
      socials: rows.filter((r) => r.instagram_handle || r.facebook || r.linkedin).length,
      exports: exp.count ?? 0,
      customers: rows.filter((r) => r.pipeline_stage === "cliente").length,
      contactStarted: rows.filter((r) => r.last_contact_at).length,
      responses: rows.filter((r) => r.last_response_at).length,
    };
    const enrichmentRate = totals.leads ? Math.round((totals.enriched / totals.leads) * 100) : 0;
    const responseRate = totals.contactStarted
      ? Math.round((totals.responses / totals.contactStarted) * 100)
      : 0;
    const conversionRate = totals.leads
      ? Math.round((totals.customers / totals.leads) * 100)
      : 0;

    const oLog = (outreach.data ?? []) as any[];
    const outreachTotals = {
      sent24h: oLog.filter(
        (o) => Date.now() - new Date(o.created_at).getTime() < 86_400_000,
      ).length,
      sent7d: oLog.filter(
        (o) => Date.now() - new Date(o.created_at).getTime() < 7 * 86_400_000,
      ).length,
      total: oLog.length,
    };

    const byDay = new Map<string, number>();
    const bySegment = new Map<string, number>();
    const byCity = new Map<string, number>();
    const byState = new Map<string, number>();
    const byStage = new Map<string, number>();
    for (const r of rows) {
      const day = (r.created_at ?? "").slice(0, 10);
      if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1);
      const seg = r.modality ?? "—";
      bySegment.set(seg, (bySegment.get(seg) ?? 0) + 1);
      const city = r.city ?? "—";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
      const st = r.state ?? "—";
      byState.set(st, (byState.get(st) ?? 0) + 1);
      const stage = r.pipeline_stage ?? "novo";
      byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
    }
    const toArr = (m: Map<string, number>) =>
      Array.from(m.entries()).map(([k, v]) => ({ key: k, value: v }));
    return {
      totals,
      enrichmentRate,
      responseRate,
      conversionRate,
      outreachTotals,
      byDay: toArr(byDay).sort((a, b) => a.key.localeCompare(b.key)).slice(-30),
      bySegment: toArr(bySegment),
      byCity: toArr(byCity).sort((a, b) => b.value - a.value).slice(0, 10),
      byState: toArr(byState).sort((a, b) => b.value - a.value),
      byStage: toArr(byStage),
    };
  });

// ---------- Runs ----------
export const listScrapeRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scrape_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Enrichment ----------
export const enrichLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const patch = await enrichLeadCore(context.supabase, data.leadId);
    return { ok: true, patch };
  });

export const bulkEnrich = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let ok = 0;
    for (const id of data.ids) {
      try {
        await enrichLeadCore(context.supabase, id);
        ok++;
      } catch (e) {
        console.error("bulkEnrich error", id, e);
      }
    }
    return { ok, total: data.ids.length };
  });

// ---------- Central de Prospecção ----------
export const getProspeccao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(50),
        filter: z
          .object({
            hasEmail: z.boolean().optional(),
            hasInstagram: z.boolean().optional(),
            hasPhone: z.boolean().optional(),
            stage: z.string().optional(),
            minScore: z.number().int().min(0).max(100).optional(),
            state: z.string().optional(),
            q: z.string().optional(),
          })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const f = data.filter ?? {};
    let q = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (f.hasEmail) q = q.not("email", "is", null);
    if (f.hasInstagram) q = q.not("instagram_handle", "is", null);
    if (f.hasPhone) q = q.not("phone", "is", null);
    if (f.stage) q = q.eq("pipeline_stage", f.stage);
    if (f.minScore != null) q = q.gte("ai_score", f.minScore);
    if (f.state) q = q.eq("state", f.state);
    if (f.q) q = q.or(`name.ilike.%${f.q}%,city.ilike.%${f.q}%,email.ilike.%${f.q}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

const PIPELINE_STAGES = [
  "novo",
  "enriquecido",
  "contato_iniciado",
  "resposta_recebida",
  "reuniao",
  "proposta",
  "cliente",
  "perdido",
] as const;

export const updatePipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        leadId: z.string().uuid(),
        stage: z.enum(PIPELINE_STAGES),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { pipeline_stage: data.stage };
    if (data.stage === "resposta_recebida") patch.last_response_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("leads")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.leadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markContacted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("leads")
      .update({ last_contact_at: new Date().toISOString(), pipeline_stage: "contato_iniciado" })
      .eq("id", data.leadId);
    return { ok: true };
  });

export const getPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("leads")
      .select(
        "id,name,city,state,modality,ai_score,pipeline_stage,email,phone,instagram_handle,whatsapp,instagram_avatar_url,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(500);
    const byStage: Record<string, any[]> = {};
    for (const s of PIPELINE_STAGES) byStage[s] = [];
    for (const l of data ?? []) {
      const s = l.pipeline_stage ?? "novo";
      (byStage[s] ??= []).push(l);
    }
    return byStage;
  });

// ---------- Exports (mantido) ----------
function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

export const exportLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        format: z.enum(["csv", "json"]),
        filters: z
          .object({
            state: z.string().optional(),
            city: z.string().optional(),
            modality: z.string().optional(),
            status: z.string().optional(),
            hasEmail: z.boolean().optional(),
            hasPhone: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("leads").select("*");
    const f = data.filters ?? {};
    if (f.state) q = q.eq("state", f.state);
    if (f.city) q = q.ilike("city", `%${f.city}%`);
    if (f.modality) q = q.eq("modality", f.modality);
    if (f.status) q = q.eq("status", f.status);
    if (f.hasEmail) q = q.not("email", "is", null);
    if (f.hasPhone) q = q.not("phone", "is", null);
    const { data: rows, error } = await q.limit(5000);
    if (error) throw new Error(error.message);

    const content = data.format === "csv" ? toCsv(rows ?? []) : JSON.stringify(rows ?? [], null, 2);
    await context.supabase.from("lead_exports").insert({
      user_id: context.userId,
      format: data.format,
      filters: f,
      count: rows?.length ?? 0,
      status: "completed",
    });
    return { content, count: rows?.length ?? 0, format: data.format };
  });

export const listExports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("lead_exports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ---------- Automations (mantido) ----------
export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("scraper_automations")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        kind: z.enum(["pesquisa", "enriquecimento", "webhook", "outreach"]),
        schedule_cron: z.string().min(1),
        params: z.record(z.string(), z.any()).optional(),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      name: data.name,
      kind: data.kind,
      schedule_cron: data.schedule_cron,
      params: data.params ?? {},
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("scraper_automations")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("scraper_automations")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scraper_automations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Settings ----------
export const getScraperSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("scraper_settings")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (
      data ?? {
        user_id: context.userId,
        max_results_per_search: 50,
        timeout_ms: 30000,
        interval_ms: 2000,
        max_concurrency: 3,
        credits_available: 1000,
        credits_used: 0,
        webhook_url: null,
        webhook_secret: null,
        auto_enrich: true,
        auto_score: true,
      }
    );
  });

export const updateScraperSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        max_results_per_search: z.number().int().min(1).max(500).optional(),
        timeout_ms: z.number().int().min(1000).max(120000).optional(),
        interval_ms: z.number().int().min(0).max(60000).optional(),
        max_concurrency: z.number().int().min(1).max(20).optional(),
        credits_available: z.number().int().min(0).optional(),
        webhook_url: z.string().url().nullable().optional(),
        webhook_secret: z.string().nullable().optional(),
        auto_enrich: z.boolean().optional(),
        auto_score: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scraper_settings")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Logs ----------
export const listScraperLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("scraper_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });
