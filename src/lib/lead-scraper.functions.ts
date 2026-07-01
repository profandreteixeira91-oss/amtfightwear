import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Dashboard KPIs ----------
export const getScraperDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [runs, leads, enrich, exp] = await Promise.all([
      supabase.from("scrape_runs").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("*"),
      supabase.from("lead_enrichments").select("id", { count: "exact", head: true }),
      supabase.from("lead_exports").select("id", { count: "exact", head: true }),
    ]);

    const rows = (leads.data ?? []) as any[];
    const totals = {
      searches: runs.count ?? 0,
      leads: rows.length,
      companies: rows.length,
      enriched: rows.filter((r) => r.enrichment_status === "done").length,
      emails: rows.filter((r) => r.email).length,
      phones: rows.filter((r) => r.phone).length,
      sites: rows.filter((r) => r.website).length,
      socials: rows.filter((r) => r.facebook || r.linkedin || (r.notes && /instagram/i.test(r.notes))).length,
      exports: exp.count ?? 0,
    };
    const enrichmentRate = totals.leads ? Math.round((totals.enriched / totals.leads) * 100) : 0;

    const byDay = new Map<string, number>();
    const bySegment = new Map<string, number>();
    const byCity = new Map<string, number>();
    const byState = new Map<string, number>();
    for (const r of rows) {
      const day = (r.created_at ?? "").slice(0, 10);
      if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1);
      const seg = r.modality ?? "—";
      bySegment.set(seg, (bySegment.get(seg) ?? 0) + 1);
      const city = r.city ?? "—";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
      const st = r.state ?? "—";
      byState.set(st, (byState.get(st) ?? 0) + 1);
    }
    const toArr = (m: Map<string, number>) => Array.from(m.entries()).map(([k, v]) => ({ key: k, value: v }));
    return {
      totals,
      enrichmentRate,
      byDay: toArr(byDay).sort((a, b) => a.key.localeCompare(b.key)).slice(-30),
      bySegment: toArr(bySegment),
      byCity: toArr(byCity).sort((a, b) => b.value - a.value).slice(0, 10),
      byState: toArr(byState).sort((a, b) => b.value - a.value),
    };
  });

// ---------- Runs (searches) ----------
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
async function firecrawlScrape(url: string) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json;
  } catch {
    return null;
  }
}

function extractContacts(text: string) {
  const emails = Array.from(new Set(text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? []));
  const phones = Array.from(
    new Set(text.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g) ?? []),
  );
  const ig = text.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)?.[1];
  const fb = text.match(/facebook\.com\/([A-Za-z0-9_.\-]+)/i)?.[1];
  const li = text.match(/linkedin\.com\/(?:in|company)\/([A-Za-z0-9_.\-]+)/i)?.[1];
  const whats = text.match(/wa\.me\/(\d+)/i)?.[1] ?? text.match(/api\.whatsapp\.com\/send\?phone=(\d+)/i)?.[1];
  return { emails, phones, ig, fb, li, whats };
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

async function aiScoreLead(lead: any): Promise<{ score: number; summary: string; approach: string; best_hour: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { score: 50, summary: "", approach: "", best_hour: "10:00-12:00" };
  const prompt = `Avalie este lead B2B para uma fabricante de kimonos, faixas e uniformes de artes marciais (AMT Fight Wear). Retorne JSON com { score:0-100, summary (2 frases), approach (uma frase objetiva de abordagem comercial), best_hour ("HH:MM-HH:MM") }.\n\nLead:\n${JSON.stringify(lead)}`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { score: 50, summary: "", approach: "", best_hour: "10:00-12:00" };
    const j = await res.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 50)),
      summary: String(parsed.summary ?? ""),
      approach: String(parsed.approach ?? ""),
      best_hour: String(parsed.best_hour ?? "10:00-12:00"),
    };
  } catch {
    return { score: 50, summary: "", approach: "", best_hour: "10:00-12:00" };
  }
}

export const enrichLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", data.leadId).single();
    if (error || !lead) throw new Error("Lead não encontrado");

    const patch: Record<string, any> = { enrichment_status: "processing" };
    await supabase.from("leads").update(patch as any).eq("id", data.leadId);

    let text = `${lead.name ?? ""} ${lead.notes ?? ""}`;
    let html = "";
    let tech: string[] = [];
    if (lead.website) {
      const scraped = await firecrawlScrape(lead.website);
      if (scraped?.markdown) text += "\n" + scraped.markdown;
      if (scraped?.html) {
        html = scraped.html;
        tech = detectTech(html);
      }
    }
    const c = extractContacts(text + " " + html);
    const enriched: Record<string, any> = {
      email: lead.email ?? c.emails[0] ?? null,
      phone: lead.phone ?? c.phones[0] ?? null,
      whatsapp: lead.whatsapp ?? (c.whats ?? null),
      facebook: lead.facebook ?? (c.fb ? `https://facebook.com/${c.fb}` : null),
      linkedin: lead.linkedin ?? (c.li ? `https://linkedin.com/in/${c.li}` : null),
      technologies: tech,
    };

    // AI score
    const ai = await aiScoreLead({ ...lead, ...enriched });

    const finalPatch = {
      ...enriched,
      ai_score: ai.score,
      ai_summary: ai.summary,
      ai_approach: ai.approach,
      ai_best_hour: ai.best_hour,
      enrichment_status: "done",
      enriched_at: new Date().toISOString(),
      data_source: lead.data_source ?? "firecrawl+ai",
    };
    await supabase.from("leads").update(finalPatch as any).eq("id", data.leadId);

    // Log enrichments
    const logs = Object.entries(enriched)
      .filter(([, v]) => v && (v as any) !== (lead as any)[Object.keys(enriched)[0]])
      .map(([field, new_value]) => ({
        lead_id: data.leadId,
        field,
        old_value: String((lead as any)[field] ?? ""),
        new_value: String(new_value ?? ""),
        source: "firecrawl+ai",
      }));
    if (logs.length) await supabase.from("lead_enrichments").insert(logs);

    return { ok: true, patch: finalPatch };
  });

export const bulkEnrich = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    let ok = 0;
    for (const id of data.ids) {
      try {
        const { data: lead } = await context.supabase.from("leads").select("*").eq("id", id).single();
        if (!lead) continue;
        // Reuse handler logic via direct call is complex; just invoke inline
        await context.supabase.from("leads").update({ enrichment_status: "processing" } as any).eq("id", id);
        let text = `${lead.name ?? ""} ${lead.notes ?? ""}`;
        let html = "";
        let tech: string[] = [];
        if (lead.website) {
          const scraped = await firecrawlScrape(lead.website);
          if (scraped?.markdown) text += "\n" + scraped.markdown;
          if (scraped?.html) { html = scraped.html; tech = detectTech(html); }
        }
        const c = extractContacts(text + " " + html);
        const enriched: Record<string, any> = {
          email: lead.email ?? c.emails[0] ?? null,
          phone: lead.phone ?? c.phones[0] ?? null,
          whatsapp: lead.whatsapp ?? c.whats ?? null,
          facebook: lead.facebook ?? (c.fb ? `https://facebook.com/${c.fb}` : null),
          linkedin: lead.linkedin ?? (c.li ? `https://linkedin.com/in/${c.li}` : null),
          technologies: tech,
        };
        const ai = await aiScoreLead({ ...lead, ...enriched });
        await context.supabase.from("leads").update({
          ...enriched,
          ai_score: ai.score, ai_summary: ai.summary, ai_approach: ai.approach, ai_best_hour: ai.best_hour,
          enrichment_status: "done", enriched_at: new Date().toISOString(), data_source: "firecrawl+ai",
        } as any).eq("id", id);
        ok++;
      } catch (e) {
        console.error("bulkEnrich error", id, e);
      }
    }
    return { ok, total: data.ids.length };
  });

// ---------- Exports ----------
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
    z.object({
      format: z.enum(["csv", "json"]),
      filters: z.object({
        state: z.string().optional(),
        city: z.string().optional(),
        modality: z.string().optional(),
        status: z.string().optional(),
        hasEmail: z.boolean().optional(),
        hasPhone: z.boolean().optional(),
      }).optional(),
    }).parse(d))
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
    const { data } = await context.supabase.from("lead_exports").select("*").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

// ---------- Automations ----------
export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("scraper_automations").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      kind: z.enum(["pesquisa", "enriquecimento", "webhook", "outreach"]),
      schedule_cron: z.string().min(1),
      params: z.record(z.string(), z.any()).optional(),
      active: z.boolean().optional(),
    }).parse(d))
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
      const { error } = await context.supabase.from("scraper_automations").update(payload as any).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("scraper_automations").insert(payload as any).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scraper_automations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Settings ----------
export const getScraperSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("scraper_settings").select("*").eq("user_id", context.userId).maybeSingle();
    return data ?? {
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
    };
  });

export const updateScraperSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      max_results_per_search: z.number().int().min(1).max(500).optional(),
      timeout_ms: z.number().int().min(1000).max(120000).optional(),
      interval_ms: z.number().int().min(0).max(60000).optional(),
      max_concurrency: z.number().int().min(1).max(20).optional(),
      credits_available: z.number().int().min(0).optional(),
      webhook_url: z.string().url().nullable().optional(),
      webhook_secret: z.string().nullable().optional(),
      auto_enrich: z.boolean().optional(),
      auto_score: z.boolean().optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scraper_settings")
      .upsert({ user_id: context.userId, ...data } as any, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Logs ----------
export const listScraperLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("scraper_logs").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });
