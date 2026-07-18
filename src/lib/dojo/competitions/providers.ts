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
  /** Página pública com a lista de eventos/calendário a ser raspada. */
  listUrl: string;
  priority: "high" | "medium" | "low";
};

export const PROVIDERS: ProviderDefinition[] = [
  { id: "smoothcomp", label: "Smoothcomp", homepage: "https://www.smoothcomp.com", listUrl: "https://www.smoothcomp.com/en/events/upcoming?country=BR", priority: "high" },
  { id: "sou_competidor", label: "Sou Competidor", homepage: "https://www.soucompetidor.com.br", listUrl: "https://www.soucompetidor.com.br/", priority: "high" },
  { id: "bjj_tour", label: "BJJ Tour", homepage: "https://www.bjjtour.com.br", listUrl: "https://www.bjjtour.com.br/", priority: "high" },
  { id: "ibjjf", label: "IBJJF", homepage: "https://ibjjf.com", listUrl: "https://ibjjf.com/events/calendar", priority: "high" },
  { id: "uaejjf", label: "UAEJJF / AJP Tour", homepage: "https://ajptour.com", listUrl: "https://ajptour.com/en/events", priority: "high" },
  { id: "cbjj", label: "CBJJ", homepage: "https://cbjj.com.br", listUrl: "https://cbjj.com.br/eventos", priority: "high" },
  { id: "cbjje", label: "CBJJE", homepage: "https://cbjje.com.br", listUrl: "https://cbjje.com.br/", priority: "high" },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderDefinition>;

export function providerLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return PROVIDER_BY_ID[id as ProviderId]?.label ?? id;
}
