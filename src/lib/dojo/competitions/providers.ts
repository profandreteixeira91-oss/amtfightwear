// Fontes de competições consultadas ao vivo via Firecrawl.
// Cada provedor aponta para a página pública de calendário/eventos.
// O sistema apenas lista; o cadastro/inscrição é feito no site do provedor.

export type ProviderId =
  | "smoothcomp"
  | "sou_competidor"
  | "bjj_tour"
  | "ibjjf"
  | "uaejjf"
  | "cbjj"
  | "cbjje";

export type ProviderDefinition = {
  id: ProviderId;
  label: string;
  homepage: string;
  /** Página(s) pública(s) com a lista de eventos/calendário a ser raspada. */
  listUrls: string[];
  /** URL parece uma página de detalhe de evento (link em que um usuário real clicaria para se inscrever). */
  isEventDetailUrl: (u: URL) => boolean;
  priority: "high" | "medium" | "low";
};

const anyOf = (...patterns: RegExp[]) => (u: URL) => patterns.some((r) => r.test(u.pathname));

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "smoothcomp",
    label: "Smoothcomp",
    homepage: "https://www.smoothcomp.com",
    listUrls: [
      "https://www.smoothcomp.com/en/events/upcoming?country=BR",
      "https://www.smoothcomp.com/en/events/upcoming?discipline=1&country=BR",
    ],
    // Detalhe: /en/event/12345 ou /en/event/slug
    isEventDetailUrl: anyOf(/^\/[a-z-]+\/event\/[^/]+/i),
    priority: "high",
  },
  {
    id: "sou_competidor",
    label: "Sou Competidor",
    homepage: "https://www.soucompetidor.com.br",
    listUrls: [
      "https://www.soucompetidor.com.br/pt-br/eventos/todos-os-eventos/",
      "https://www.soucompetidor.com.br/pt-br/eventos/proximos-eventos/",
    ],
    // Detalhe: /pt-br/eventos/todos-os-eventos/p2655-bad-boy-open-...
    isEventDetailUrl: anyOf(/\/eventos\/[^/]+\/p\d+[-a-z0-9]/i),
    priority: "high",
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
  },
  {
    id: "ibjjf",
    label: "IBJJF",
    homepage: "https://ibjjf.com",
    listUrls: [
      "https://ibjjf.com/events/calendar",
    ],
    // Detalhe: /events/slug ou subdomínio de inscrições
    isEventDetailUrl: (u) => /^\/events\/[a-z0-9][a-z0-9-]{3,}/i.test(u.pathname) || /(^|\.)ibjjf\.com$/i.test(u.hostname),
    priority: "high",
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
  },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderDefinition>;

export function providerLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return PROVIDER_BY_ID[id as ProviderId]?.label ?? id;
}
