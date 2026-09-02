import type { WholesaleProduct, WholesaleVariant } from "./WholesaleProductCard";

/** Vocabulário de cores usado no catálogo (ordem importa: compostas antes das simples). */
const COLOR_TERMS: { label: string; patterns: RegExp[] }[] = [
  { label: "Azul Claro", patterns: [/\bazul\s+clara?\b/] },
  { label: "Azul Escuro", patterns: [/\bazul\s+escura?\b/] },
  { label: "Azul", patterns: [/\bazul\b/] },
  { label: "Branco", patterns: [/\bbranc[ao]s?\b/] },
  { label: "Preto", patterns: [/\bpret[ao]s?\b/] },
  { label: "Vermelho", patterns: [/\bvermelh[ao]s?\b/] },
  { label: "Verde", patterns: [/\bverdes?\b/] },
  { label: "Amarelo", patterns: [/\bamarel[ao]s?\b/] },
  { label: "Laranja", patterns: [/\blaranjas?\b/] },
  { label: "Roxo", patterns: [/\brox[ao]s?\b/] },
  { label: "Marrom", patterns: [/\bmarrom\b/] },
  { label: "Cinza", patterns: [/\bcinzas?\b/] },
  { label: "Bordô", patterns: [/\bbord[oôó]\b/] },
  { label: "Rosa", patterns: [/\brosas?\b/] },
  { label: "Lilás", patterns: [/\blil[aá]s\b/] },
  { label: "Bege", patterns: [/\bbeges?\b/] },
  { label: "Coral", patterns: [/\bcorais?\b|\bcoral\b/] },
  { label: "Dourado", patterns: [/\bdourad[ao]s?\b/] },
  { label: "Prata", patterns: [/\bpratead[ao]s?\b|\bprata\b/] },
  { label: "Rosa Choque", patterns: [/\bpink\b/] },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const NORMALIZED = COLOR_TERMS.map((t) => ({
  label: t.label,
  patterns: t.patterns.map((p) => new RegExp(normalize(p.source), p.flags)),
}));

export const UNCOLORED = "Outras";

/** Extrai a primeira cor reconhecida de um texto livre. */
export function detectColor(text: string | null | undefined): string | null {
  if (!text) return null;
  const hay = normalize(text);
  let best: { label: string; index: number } | null = null;
  for (const term of NORMALIZED) {
    for (const re of term.patterns) {
      const m = hay.match(re);
      if (!m || m.index === undefined) continue;
      if (!best || m.index < best.index) best = { label: term.label, index: m.index };
      break;
    }
  }
  return best?.label ?? null;
}

/**
 * Cores de um produto: prioriza as cores cadastradas nas variantes e cai para a
 * detecção pelo nome quando o cadastro não traz cor (maioria do catálogo).
 */
export function colorsOfProduct(p: WholesaleProduct, variants: WholesaleVariant[]): string[] {
  // O nome do produto descreve a cor da peça; a cor da variante costuma ser
  // apenas a linha/bordado, por isso só é usada como fallback.
  const fromName = detectColor(p.name);
  if (fromName) return [fromName];
  const fromVariants = new Set<string>();
  for (const v of variants) {
    const c = detectColor(v.color) ?? (v.color ? v.color.trim() : null);
    if (c) fromVariants.add(c);
  }
  return fromVariants.size > 0 ? Array.from(fromVariants) : [UNCOLORED];
}
