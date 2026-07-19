// Fontes de competições consultadas ao vivo via Firecrawl.
// Cada provedor aponta para a página pública de calendário/eventos.
// O sistema apenas lista; o cadastro/inscrição é feito no site do provedor.

export type ProviderId =
  | "smoothcomp"
  | "smoothcomp_intl"
  | "sou_competidor"
  | "bjj_tour"
  | "ibjjf"
  | "ibjjf_intl"
  | "uaejjf"
  | "cbjj"
  | "cbjje"
  | "adcc"
  | "grappling_industries"
  | "flograppling"
  | "who_prevails"
  | "naga";

export type ProviderScope = "national" | "international";

export type ProviderDefinition = {
  id: ProviderId;
  label: string;
  homepage: string;
  /** Página(s) pública(s) com a lista de eventos/calendário a ser raspada. */
  listUrls: string[];
  /** URL parece uma página de detalhe de evento (link em que um usuário real clicaria para se inscrever). */
  isEventDetailUrl: (u: URL) => boolean;
  priority: "high" | "medium" | "low";
  scope: ProviderScope;
  /** Rótulo do país para exibição/filtro (fallback quando o parser não consegue extrair). */
  countryLabel: string;
};

const anyOf = (...patterns: RegExp[]) => (u: URL) => patterns.some((r) => r.test(u.pathname));

export const PROVIDERS: ProviderDefinition[] = [
  // ============ NACIONAIS (Brasil) ============
  {
    id: "smoothcomp",
    label: "Smoothcomp (Brasil)",
    homepage: "https://www.smoothcomp.com",
    listUrls: [
      "https://www.smoothcomp.com/en/events/upcoming?country=BR",
      "https://www.smoothcomp.com/en/events/upcoming?discipline=1&country=BR",
    ],
    isEventDetailUrl: anyOf(/^\/[a-z-]+\/event\/[^/]+/i),
    priority: "high",
    scope: "national",
    countryLabel: "Brasil",
  },
  {
    id: "sou_competidor",
    label: "Sou Competidor",
    homepage: "https://www.soucompetidor.com.br",
    listUrls: [
      "https://www.soucompetidor.com.br/pt-br/eventos/todos-os-eventos/",
      "https://www.soucompetidor.com.br/pt-br/eventos/proximos-eventos/",
    ],
    isEventDetailUrl: anyOf(/\/eventos\/[^/]+\/p\d+[-a-z0-9]/i),
    priority: "high",
    scope: "national",
    countryLabel: "Brasil",
  },
  {
    id: "bjj_tour",
    label: "BJJ Tour",
    homepage: "https://www.bjjtour.com.br",
    listUrls: [
      "https://www.bjjtour.com.br/eventos",
      "https://www.bjjtour.com.br/",
    ],
    isEventDetailUrl: anyOf(/^\/eventos?\/[a-z0-9][a-z0-9-]{3,}/i, /^\/[a-z0-9][a-z0-9-]{4,}$/i),
    priority: "high",
    scope: "national",
    countryLabel: "Brasil",
  },
  {
    id: "cbjj",
    label: "CBJJ",
    homepage: "https://cbjj.com.br",
    listUrls: [
      "https://cbjj.com.br/eventos",
      "https://cbjj.com.br/",
    ],
    isEventDetailUrl: anyOf(/^\/eventos?\/[a-z0-9][a-z0-9-]{3,}/i),
    priority: "high",
    scope: "national",
    countryLabel: "Brasil",
  },
  {
    id: "cbjje",
    label: "CBJJE",
    homepage: "https://cbjje.com.br",
    listUrls: [
      "https://cbjje.com.br/eventos",
      "https://cbjje.com.br/",
    ],
    isEventDetailUrl: anyOf(/^\/eventos?\/[a-z0-9][a-z0-9-]{3,}/i, /^\/campeonato/i),
    priority: "high",
    scope: "national",
    countryLabel: "Brasil",
  },

  // ============ INTERNACIONAIS ============
  {
    id: "ibjjf",
    label: "IBJJF (Mundial)",
    homepage: "https://ibjjf.com",
    listUrls: [
      "https://ibjjf.com/events/calendar",
    ],
    isEventDetailUrl: (u) =>
      /^\/events\/[a-z0-9][a-z0-9-]{3,}/i.test(u.pathname) || /(^|\.)ibjjf\.com$/i.test(u.hostname),
    priority: "high",
    scope: "international",
    countryLabel: "Internacional",
  },
  {
    id: "ibjjf_intl",
    label: "IBJJF (Europa/EUA/Ásia)",
    homepage: "https://ibjjf.com",
    listUrls: [
      "https://ibjjf.com/events?continent=europe",
      "https://ibjjf.com/events?continent=north-america",
      "https://ibjjf.com/events?continent=asia",
    ],
    isEventDetailUrl: (u) =>
      /^\/events\/[a-z0-9][a-z0-9-]{3,}/i.test(u.pathname) || /(^|\.)ibjjf\.com$/i.test(u.hostname),
    priority: "medium",
    scope: "international",
    countryLabel: "Internacional",
  },
  {
    id: "uaejjf",
    label: "UAEJJF / AJP Tour",
    homepage: "https://ajptour.com",
    listUrls: [
      "https://ajptour.com/en/events",
      "https://ajptour.com/en/tournaments",
    ],
    isEventDetailUrl: anyOf(/^\/[a-z-]+\/(events?|tournaments?)\/[a-z0-9][a-z0-9-]{3,}/i),
    priority: "high",
    scope: "international",
    countryLabel: "Emirados Árabes",
  },
  {
    id: "smoothcomp_intl",
    label: "Smoothcomp (Mundial)",
    homepage: "https://www.smoothcomp.com",
    listUrls: [
      "https://www.smoothcomp.com/en/events/upcoming",
      "https://www.smoothcomp.com/en/events/upcoming?discipline=1",
    ],
    isEventDetailUrl: anyOf(/^\/[a-z-]+\/event\/[^/]+/i),
    priority: "high",
    scope: "international",
    countryLabel: "Internacional",
  },
  {
    id: "adcc",
    label: "ADCC",
    homepage: "https://adcombat.com",
    listUrls: [
      "https://adcombat.com/adcc-events/",
      "https://adcombat.com/events/",
    ],
    isEventDetailUrl: anyOf(/\/(adcc-)?events?\/[a-z0-9][a-z0-9-]{3,}/i),
    priority: "high",
    scope: "international",
    countryLabel: "Mundial",
  },
  {
    id: "grappling_industries",
    label: "Grappling Industries",
    homepage: "https://grapplingindustries.com",
    listUrls: [
      "https://grapplingindustries.com/events/",
      "https://grapplingindustries.com/",
    ],
    isEventDetailUrl: anyOf(/\/events?\/[a-z0-9][a-z0-9-]{3,}/i),
    priority: "medium",
    scope: "international",
    countryLabel: "EUA/Canadá",
  },
  {
    id: "flograppling",
    label: "FloGrappling",
    homepage: "https://www.flograppling.com",
    listUrls: [
      "https://www.flograppling.com/events",
    ],
    isEventDetailUrl: anyOf(/\/events\/\d+[-a-z0-9]/i),
    priority: "medium",
    scope: "international",
    countryLabel: "Internacional",
  },
  {
    id: "who_prevails",
    label: "Who's Number One / WNO",
    homepage: "https://www.flograppling.com",
    listUrls: [
      "https://www.flograppling.com/events?series=who-s-number-one",
    ],
    isEventDetailUrl: anyOf(/\/events\/\d+[-a-z0-9]/i),
    priority: "low",
    scope: "international",
    countryLabel: "EUA",
  },
  {
    id: "naga",
    label: "NAGA Fighter",
    homepage: "https://www.nagafighter.com",
    listUrls: [
      "https://www.nagafighter.com/events",
      "https://www.nagafighter.com/",
    ],
    isEventDetailUrl: anyOf(/\/events?\/[a-z0-9][a-z0-9-]{3,}/i),
    priority: "medium",
    scope: "international",
    countryLabel: "EUA/Europa",
  },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderDefinition>;

export function providerLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return PROVIDER_BY_ID[id as ProviderId]?.label ?? id;
}

export function providerScope(id: string | null | undefined): ProviderScope | null {
  if (!id) return null;
  return PROVIDER_BY_ID[id as ProviderId]?.scope ?? null;
}
