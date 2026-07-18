import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PROVIDERS, PROVIDER_BY_ID, type ProviderId } from "@/lib/dojo/competitions/providers";

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

const eventSchema = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome do evento/campeonato" },
          starts_at: { type: "string", description: "Data de início em ISO 8601 (YYYY-MM-DD). null se desconhecida." },
          ends_at: { type: "string", description: "Data final em ISO 8601. null se não houver." },
          city: { type: "string" },
          state: { type: "string", description: "UF (2 letras) ou estado/região" },
          country: { type: "string" },
          venue: { type: "string", description: "Local/ginásio" },
          registration_url: { type: "string", description: "URL absoluta da página de inscrição no site do provedor" },
          registration_deadline: { type: "string", description: "Data limite de inscrição ISO 8601 se disponível" },
        },
        required: ["name"],
      },
    },
  },
  required: ["events"],
};

async function scrapeProvider(providerId: ProviderId): Promise<LiveCompetition[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");
  const provider = PROVIDER_BY_ID[providerId];
  if (!provider) return [];

  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: provider.listUrl,
      onlyMainContent: true,
      waitFor: 2000,
      formats: [
        {
          type: "json",
          schema: eventSchema,
          prompt:
            "Extraia a lista de competições/campeonatos de jiu-jitsu (ou artes marciais) listadas nesta página. Para cada evento inclua nome, data de início (ISO), data final se houver, cidade, estado/UF, país, local, e a URL absoluta da página de inscrição no próprio site. Ignore eventos já encerrados. Se um campo não for visível, omita-o.",
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${body.slice(0, 300)}`);
  }

  const payload = await res.json();
  const json = payload?.data?.json ?? payload?.json ?? {};
  const events: ScrapedEvent[] = Array.isArray(json?.events) ? json.events : [];

  return events
    .filter((e) => e && e.name)
    .map((e, idx): LiveCompetition => ({
      id: `${providerId}:${idx}:${encodeURIComponent(e.name).slice(0, 40)}`,
      provider: providerId,
      name: e.name.trim(),
      starts_at: normalizeDate(e.starts_at),
      ends_at: normalizeDate(e.ends_at),
      city: e.city ?? null,
      state: e.state ?? null,
      country: e.country ?? null,
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
  if (!s) return null;
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
    z
      .object({
        providers: z.array(z.string()).optional(),
      })
      .parse(i ?? {}),
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
        summary.push({ provider: providerId, count: 0, error: String(r.reason?.message ?? r.reason).slice(0, 200) });
      }
    });

    // Ordena por data (próximas primeiro, sem data no fim)
    competitions.sort((a, b) => {
      if (!a.starts_at && !b.starts_at) return 0;
      if (!a.starts_at) return 1;
      if (!b.starts_at) return -1;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });

    return { competitions, summary, fetchedAt: new Date().toISOString() };
  });
