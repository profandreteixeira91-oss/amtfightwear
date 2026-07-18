import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PROVIDERS, PROVIDER_BY_ID, type ProviderId } from "@/lib/dojo/competitions/providers";
import { openrouterChat } from "@/lib/ai-gateway.server";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

type ScrapedEvent = {
  name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  venue?: string | null;
  registration_url?: string | null;
  registration_deadline?: string | null;
};

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

async function firecrawlMarkdown(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");

  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      onlyMainContent: true,
      waitFor: 3500,
      formats: ["markdown"],
      // Geolocaliza a requisição para o Brasil para provedores com filtro por IP (ex.: Smoothcomp).
      location: { country: "BR", languages: ["pt-BR", "pt", "en"] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${body.slice(0, 200)}`);
  }
  const payload = (await res.json()) as { data?: { markdown?: string } };
  return payload?.data?.markdown ?? "";
}

const EVENTS_INSTRUCTIONS = `Você recebe o conteúdo (em markdown) da página de eventos/calendário de um organizador de campeonatos de artes marciais.
Extraia SOMENTE os eventos que ainda vão acontecer (upcoming/futuros). Ignore eventos passados.
Prefira eventos no Brasil quando o organizador tiver eventos internacionais, mas inclua todos os brasileiros listados.
Retorne um JSON no formato:
{"events":[{"name":"...","starts_at":"YYYY-MM-DD","ends_at":"YYYY-MM-DD|null","city":"...","state":"UF","country":"Brasil","venue":"...","registration_url":"URL absoluta","registration_deadline":"YYYY-MM-DD|null"}]}
Regras:
- Nunca invente informação; use null quando não estiver no texto.
- registration_url deve ser link absoluto encontrado no próprio texto (não invente domínios).
- Datas em formato ISO YYYY-MM-DD; se só houver mês/ano use o dia 1.
- Se o texto não trouxer eventos futuros, retorne {"events":[]}.`;

async function extractEventsFromMarkdown(md: string): Promise<ScrapedEvent[]> {
  const trimmed = md.slice(0, 18000); // controla tokens
  if (!trimmed.trim()) return [];
  const raw = await openrouterChat({
    json: true,
    temperature: 0,
    messages: [
      { role: "system", content: EVENTS_INSTRUCTIONS },
      { role: "user", content: trimmed },
    ],
  });
  try {
    const parsed = JSON.parse(raw);
    const events = Array.isArray(parsed?.events) ? parsed.events : [];
    return events as ScrapedEvent[];
  } catch {
    return [];
  }
}

async function scrapeProvider(providerId: ProviderId): Promise<LiveCompetition[]> {
  const provider = PROVIDER_BY_ID[providerId];
  if (!provider) return [];

  const md = await firecrawlMarkdown(provider.listUrl);
  const events = await extractEventsFromMarkdown(md);

  return events
    .filter((e) => e && e.name)
    .map((e, idx): LiveCompetition => ({
      id: `${providerId}:${idx}:${encodeURIComponent(e.name).slice(0, 40)}`,
      provider: providerId,
      name: String(e.name).trim(),
      starts_at: normalizeDate(e.starts_at),
      ends_at: normalizeDate(e.ends_at),
      city: e.city ?? null,
      state: e.state ?? null,
      country: e.country ?? "Brasil",
      venue_name: e.venue ?? null,
      organizer: provider.label,
      external_url: absoluteUrl(e.registration_url, provider.listUrl),
      registration_deadline: normalizeDate(e.registration_deadline),
      banner_url: null,
    }));
}

function normalizeDate(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null") return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
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
