// Classificador determinístico (sem IA) de competições baseado em palavras-chave.
// Retorna scope + tier + tags aplicáveis. Regras editáveis via arquivo.

export type Scope = "international" | "national" | "regional" | "state" | "municipal";
export type Tier =
  | "worldchampionship"
  | "grand_slam"
  | "continental"
  | "open"
  | "ranking"
  | "festival"
  | "other";

export type Classification = {
  scope: Scope;
  tier: Tier;
  tags: string[];
  keywords: string[];
};

const TIER_RULES: Array<{ tier: Tier; patterns: RegExp[] }> = [
  { tier: "worldchampionship", patterns: [/mundial/i, /world\s*championship/i, /world\s*pro/i, /worlds\b/i] },
  { tier: "grand_slam", patterns: [/grand\s*slam/i] },
  { tier: "continental", patterns: [/pan[\s-]*american/i, /european/i, /asian/i, /panamericano/i, /europeu/i, /sul-?americano/i, /south\s*american/i] },
  { tier: "open", patterns: [/\bopen\b/i, /aberto/i] },
  { tier: "ranking", patterns: [/ranking/i, /circuito/i, /liga/i, /copa\s+.*etapa/i] },
  { tier: "festival", patterns: [/festival/i, /amistoso/i, /interno/i] },
];

const SCOPE_INTL = [
  /mundial/i, /world/i, /grand\s*slam/i, /pan[\s-]*american/i, /european/i, /asian/i,
  /international/i, /internacional/i, /abu\s*dhabi/i, /ajp\s*tour/i, /adcc/i, /ibjjf/i,
  /uaejjf/i,
];

const SCOPE_NAT = [
  /brasileir[oa]/i, /nacional/i, /cbjj/i, /cbjje/i, /liga\s+nacional/i, /copa\s+do\s+brasil/i,
];

const SCOPE_REG = [
  /regional/i, /nordeste/i, /sudeste/i, /sul\b/i, /norte\b/i, /centro-oeste/i, /interior/i,
];

const STATE_UF = /\b(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)\b/;

const MUNICIPAL_HINTS = [
  /municipal/i, /prefeitura/i, /interbairros/i,
];

const TAG_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "gi", patterns: [/\bgi\b/i, /kimono/i, /com\s+kimono/i] },
  { tag: "nogi", patterns: [/no[-\s]*gi/i, /sem\s+kimono/i] },
  { tag: "kids", patterns: [/kids/i, /infantil/i, /juvenil/i] },
  { tag: "master", patterns: [/master/i, /veteran/i] },
  { tag: "female", patterns: [/female/i, /women/i, /feminin/i] },
  { tag: "adcc", patterns: [/adcc/i] },
  { tag: "mma", patterns: [/\bmma\b/i] },
  { tag: "grappling", patterns: [/grappling/i, /submission[-\s]*only/i] },
];

/**
 * Roda a classificação. Analisa nome + organização + descrição + país/estado.
 */
export function classify(input: {
  name: string;
  organization?: string | null;
  description?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  scopeHint?: Scope | null;
}): Classification {
  const hay = [input.name, input.organization, input.description, input.country, input.state, input.city]
    .filter(Boolean)
    .join(" \n ");

  let scope: Scope = input.scopeHint ?? "national";
  if (SCOPE_INTL.some((r) => r.test(hay))) scope = "international";
  else if (SCOPE_NAT.some((r) => r.test(hay))) scope = "national";
  else if (MUNICIPAL_HINTS.some((r) => r.test(hay))) scope = "municipal";
  else if (SCOPE_REG.some((r) => r.test(hay))) scope = "regional";
  else if (STATE_UF.test(input.state ?? "") || STATE_UF.test(hay)) scope = "state";

  let tier: Tier = "other";
  for (const rule of TIER_RULES) {
    if (rule.patterns.some((r) => r.test(hay))) {
      tier = rule.tier;
      break;
    }
  }

  const tags: string[] = [];
  const keywords: string[] = [];
  for (const rule of TAG_RULES) {
    for (const p of rule.patterns) {
      const m = hay.match(p);
      if (m) {
        tags.push(rule.tag);
        keywords.push(m[0]);
        break;
      }
    }
  }

  return { scope, tier, tags: Array.from(new Set(tags)), keywords: Array.from(new Set(keywords)) };
}

export function scopeLabel(scope: string | null | undefined): string {
  switch (scope) {
    case "international": return "Internacional";
    case "national": return "Nacional";
    case "regional": return "Regional";
    case "state": return "Estadual";
    case "municipal": return "Municipal";
    default: return "—";
  }
}

export function tierLabel(tier: string | null | undefined): string {
  switch (tier) {
    case "worldchampionship": return "Mundial";
    case "grand_slam": return "Grand Slam";
    case "continental": return "Continental";
    case "open": return "Open";
    case "ranking": return "Ranking";
    case "festival": return "Festival";
    default: return "";
  }
}
