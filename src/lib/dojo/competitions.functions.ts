import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PROVIDERS, PROVIDER_BY_ID, type ProviderId } from "@/lib/dojo/competitions/providers";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

export type LiveCompetition = {
  id: string;
  provider: ProviderId;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  venue_name: string | null;
  organizer: string | null;
  external_url: string;
  registration_deadline: string | null;
  banner_url: string | null;
};

async function firecrawlMarkdownOnce(url: string, timeoutMs: number): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        waitFor: 2500,
        formats: ["markdown"],
        location: { country: "BR", languages: ["pt-BR", "pt", "en"] },
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Firecrawl ${res.status}: ${body.slice(0, 200)}`);
    }
    const payload = (await res.json()) as { data?: { markdown?: string }; markdown?: string };
    return payload?.data?.markdown ?? payload?.markdown ?? "";
  } finally {
    clearTimeout(timer);
  }
}

type CacheEntry = { md: string; at: number };
const MD_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60_000;

async function firecrawlMarkdown(url: string): Promise<string> {
  const cached = MD_CACHE.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.md;

  const attempts = [25_000, 40_000, 55_000];
  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      const md = await firecrawlMarkdownOnce(url, attempts[i]);
      if (md && md.trim().length > 0) {
        MD_CACHE.set(url, { md, at: Date.now() });
        return md;
      }
      lastErr = new Error("resposta vazia");
    } catch (e) {
      lastErr = e;
    }
    if (i < attempts.length - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  // Fallback para cache antigo se disponível
  if (cached) return cached.md;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ---- Parser heurístico (sem IA) --------------------------------------------

const MONTHS_PT: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};
const MONTHS_EN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function pickYear(m: number, explicit?: number): number {
  if (explicit && explicit > 2000) return explicit;
  const now = new Date();
  const y = now.getFullYear();
  // Se o mês já passou, provavelmente é do ano seguinte
  return m < now.getMonth() + 1 - 1 ? y + 1 : y;
}

function toISO(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function findDate(text: string): string | null {
  const t = text.replace(/\s+/g, " ");

  // 2025-08-15 ou 15/08/2025 ou 15-08-2025
  const iso = t.match(/(\b20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return toISO(+iso[1], +iso[2], +iso[3]);
  const dmy = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
  if (dmy) return toISO(+dmy[3], +dmy[2], +dmy[1]);

  // 15 de agosto de 2025 / 15 agosto 2025
  const pt = t.match(/\b(\d{1,2})\s*(?:de\s+)?([a-zçãé]+)(?:\s+de)?\s*(20\d{2})?\b/i);
  if (pt) {
    const mm = MONTHS_PT[pt[2].toLowerCase()];
    if (mm) return toISO(pickYear(mm, pt[3] ? +pt[3] : undefined), mm, +pt[1]);
  }

  // August 15, 2025 / Aug 15 2025 / 15 Aug 2025
  const en1 = t.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})?\b/);
  if (en1) {
    const mm = MONTHS_EN[en1[1].toLowerCase()];
    if (mm) return toISO(pickYear(mm, en1[3] ? +en1[3] : undefined), mm, +en1[2]);
  }
  const en2 = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s*(20\d{2})?\b/);
  if (en2) {
    const mm = MONTHS_EN[en2[2].toLowerCase()];
    if (mm) return toISO(pickYear(mm, en2[3] ? +en2[3] : undefined), mm, +en2[1]);
  }

  return null;
}

function findLocation(text: string): { city: string | null; state: string | null } {
  // Ex.: "São Paulo, SP" | "Rio de Janeiro / RJ" | "Belo Horizonte - MG"
  const m = text.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.\- ]{2,40}?)\s*[,\-/]\s*([A-Z]{2})\b/);
  if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  return { city: null, state: null };
}

const NAV_NOISE = /^(home|início|inicio|menu|login|entrar|cadastro|calendar|calendário|calendario|events|eventos|about|sobre|contact|contato|blog|shop|loja|search|buscar|read more|leia mais|ver mais|see more|next|previous|próxim|anterior|inscrições|inscricoes|register|sign in|sign up|newsletter|privacy|terms|cookies|português|english|espanhol)$/i;

function looksLikeEvent(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 6 || t.length > 160) return false;
  if (NAV_NOISE.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (!/[a-zA-ZÀ-ÿ]/.test(t)) return false;
  return true;
}

type ParsedEvent = {
  name: string;
  url: string;
  starts_at: string | null;
  city: string | null;
  state: string | null;
};

function parseMarkdown(md: string, baseUrl: string): ParsedEvent[] {
  const lines = md.split(/\r?\n/);
  const out: ParsedEvent[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const linkRe = /\[([^\]]{4,160})\]\((https?:\/\/[^\s)]+)\)/g;
    let mm: RegExpExecArray | null;
    while ((mm = linkRe.exec(line)) !== null) {
      const name = mm[1].replace(/[*_`]/g, "").trim();
      const url = mm[2];
      if (!looksLikeEvent(name)) continue;
      // Contexto: 2 linhas antes e 3 depois — datas costumam ficar próximas.
      const ctx = [lines[i - 2], lines[i - 1], line, lines[i + 1], lines[i + 2], lines[i + 3]]
        .filter(Boolean).join(" \n ");
      const date = findDate(ctx) ?? findDate(name);
      const loc = findLocation(ctx);
      const key = url.split("#")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name,
        url,
        starts_at: date,
        city: loc.city,
        state: loc.state,
      });
    }
  }

  // Prioriza eventos com data futura; mantém demais depois.
  const now = Date.now();
  return out
    .filter((e) => !e.starts_at || new Date(e.starts_at).getTime() >= now - 24 * 3600 * 1000)
    .slice(0, 80);
}

async function scrapeProvider(providerId: ProviderId): Promise<LiveCompetition[]> {
  const provider = PROVIDER_BY_ID[providerId];
  if (!provider) return [];

  const md = await firecrawlMarkdown(provider.listUrl);
  const events = parseMarkdown(md, provider.listUrl);

  return events.map((e, idx): LiveCompetition => ({
    id: `${providerId}:${idx}:${encodeURIComponent(e.name).slice(0, 40)}`,
    provider: providerId,
    name: e.name,
    starts_at: e.starts_at,
    ends_at: null,
    city: e.city,
    state: e.state,
    country: "Brasil",
    venue_name: null,
    organizer: provider.label,
    external_url: absoluteUrl(e.url, provider.listUrl),
    registration_deadline: null,
    banner_url: null,
  }));
}


function absoluteUrl(u: string | null | undefined, base: string): string {
  if (!u) return base;
  try {
    return new URL(u, base).toString();
  } catch {
    return base;
  }
}

export const scrapeCompetitions = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ providers: z.array(z.string()).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const targetIds: ProviderId[] = (data.providers && data.providers.length > 0
      ? data.providers
      : PROVIDERS.map((p) => p.id)) as ProviderId[];

    const results = await Promise.allSettled(targetIds.map((id) => scrapeProvider(id)));

    const competitions: LiveCompetition[] = [];
    const summary: { provider: ProviderId; count: number; error?: string }[] = [];

    results.forEach((r, idx) => {
      const providerId = targetIds[idx];
      if (r.status === "fulfilled") {
        competitions.push(...r.value);
        summary.push({ provider: providerId, count: r.value.length });
      } else {
        summary.push({
          provider: providerId,
          count: 0,
          error: String(r.reason?.message ?? r.reason).slice(0, 200),
        });
      }
    });

    competitions.sort((a, b) => {
      if (!a.starts_at && !b.starts_at) return 0;
      if (!a.starts_at) return 1;
      if (!b.starts_at) return -1;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    return { competitions, summary, fetchedAt: new Date().toISOString() };
  });
