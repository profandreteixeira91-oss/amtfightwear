// Registry of competition providers. Architected so new sources can be added
// without touching consumers. Each provider optionally implements `fetchUpcoming`
// (returns normalized competitions to be upserted). If not implemented, the
// provider is still shown for manual entries / attribution.

export type ProviderId =
  | "manual"
  | "smoothcomp"
  | "sou_competidor"
  | "bjj_tour"
  | "ibjjf"
  | "uaejjf"
  | "cbjj"
  | "cbjje"
  | "fjjrio"
  | "fpjjb"
  | "fjjsp"
  | "other";

export type NormalizedCompetition = {
  provider: ProviderId;
  external_id?: string | null;
  external_url?: string | null;
  name: string;
  banner_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  registration_deadline?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  venue_name?: string | null;
  address?: string | null;
  organizer?: string | null;
  description?: string | null;
  modality?: string | null;
  with_gi?: boolean | null;
  age_groups?: string[];
  belts?: string[];
  categories?: string[];
  entry_fee?: number | null;
  currency?: string | null;
  source_data?: Record<string, unknown>;
};

export type ProviderDefinition = {
  id: ProviderId;
  label: string;
  homepage?: string;
  priority: "high" | "medium" | "low";
  /** When implemented, returns competitions to be upserted for the given owner scope. */
  fetchUpcoming?: () => Promise<NormalizedCompetition[]>;
};

// Stubs — real integrations plug in here progressively. Returning [] keeps the
// UI functional and lets manual entries land under the same provider label.
export const PROVIDERS: ProviderDefinition[] = [
  { id: "manual", label: "Cadastro manual", priority: "high" },
  { id: "smoothcomp", label: "Smoothcomp", homepage: "https://www.smoothcomp.com", priority: "high", fetchUpcoming: async () => [] },
  { id: "sou_competidor", label: "Sou Competidor", homepage: "https://www.soucompetidor.com.br", priority: "high", fetchUpcoming: async () => [] },
  { id: "bjj_tour", label: "BJJ Tour", homepage: "https://www.bjjtour.com.br", priority: "high", fetchUpcoming: async () => [] },
  { id: "ibjjf", label: "IBJJF", homepage: "https://ibjjf.com", priority: "high", fetchUpcoming: async () => [] },
  { id: "uaejjf", label: "UAEJJF / AJP Tour", homepage: "https://ajptour.com", priority: "high", fetchUpcoming: async () => [] },
  { id: "cbjj", label: "CBJJ", homepage: "https://cbjj.com.br", priority: "high", fetchUpcoming: async () => [] },
  { id: "cbjje", label: "CBJJE", homepage: "https://cbjje.com.br", priority: "high", fetchUpcoming: async () => [] },
  { id: "fjjrio", label: "FJJ-Rio", priority: "medium", fetchUpcoming: async () => [] },
  { id: "fpjjb", label: "FPJJB", priority: "medium", fetchUpcoming: async () => [] },
  { id: "fjjsp", label: "FJJSP", priority: "medium", fetchUpcoming: async () => [] },
  { id: "other", label: "Outro / Federação estadual", priority: "medium" },
];

export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderDefinition>;

export function providerLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return PROVIDER_BY_ID[id as ProviderId]?.label ?? id;
}
