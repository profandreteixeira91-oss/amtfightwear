/**
 * Leitura da faixa a partir do nome do item (pedido, orçamento ou produção).
 *
 * O catálogo segue o padrão
 *   FAIXA <MODALIDADE> <COR> [COM <COR>] [PONTA <COR>] [PONTEIRA <COR|AUTISMO>]
 *         [INFANTIL] [BORDADA PERSONALIZADA | BORDADO KANJI (BJJ|JJ)] - LINHA <LINHA>
 * e os orçamentos acrescentam "— Tam. <TAMANHO>". Nada aqui depende do banco:
 * serve para a tela e para o PDF. Client-safe.
 */

export const BELT_COLORS = {
  branca: { label: "Branca", hex: "#F7F7F5" },
  cinza: { label: "Cinza", hex: "#9CA3AF" },
  amarela: { label: "Amarela", hex: "#FACC15" },
  laranja: { label: "Laranja", hex: "#F97316" },
  verde: { label: "Verde", hex: "#16A34A" },
  azul: { label: "Azul", hex: "#1D4ED8" },
  azul_clara: { label: "Azul clara", hex: "#60A5FA" },
  azul_escura: { label: "Azul escura", hex: "#1E3A8A" },
  roxa: { label: "Roxa", hex: "#7E22CE" },
  marrom: { label: "Marrom", hex: "#7C3F12" },
  preta: { label: "Preta", hex: "#141414" },
  bordo: { label: "Bordô", hex: "#7F1D1D" },
  vermelha: { label: "Vermelha", hex: "#DC2626" },
} as const;

export type BeltColor = keyof typeof BELT_COLORS;
export type BeltBar = BeltColor | "autismo";
export type BeltDiscipline = "bjj" | "judo" | "outra";

/** Ordem de graduação, usada para ordenar listas de separação. */
export const BELT_COLOR_ORDER: BeltColor[] = [
  "branca", "cinza", "amarela", "laranja", "verde", "azul_clara", "azul", "azul_escura",
  "roxa", "marrom", "bordo", "vermelha", "preta",
];

/** Cores do padrão da ponteira autismo (quebra-cabeça). */
export const AUTISM_COLORS = ["#E11D48", "#FACC15", "#2563EB", "#22C55E"];

export type BeltSpec = {
  discipline: BeltDiscipline;
  /** null = o nome não diz a cor (definir no painel). */
  color: BeltColor | null;
  /** "COM <cor>": listra no meio, ao longo da faixa (jiu-jitsu infantil). */
  stripe: BeltColor | null;
  /** "PONTA <cor>": pontas da faixa (judô). */
  tips: BeltColor | null;
  /** Ponteira (jiu-jitsu): preta nas coloridas, vermelha na preta, salvo se o nome disser outra. */
  bar: BeltBar | null;
  kids: boolean;
  /** Bordado do produto: nome do cliente ou kanji. */
  embroidery: "nome" | "kanji_bjj" | "kanji_jj" | "kanji" | null;
  line: string | null;
  size: string | null;
};

const COLOR_WORDS: Array<[string, BeltColor]> = [
  ["AZUL CLARA", "azul_clara"], ["AZUL CLARO", "azul_clara"],
  ["AZUL ESCURA", "azul_escura"], ["AZUL ESCURO", "azul_escura"],
  ["AZUL", "azul"], ["BRANCA", "branca"], ["BRANCO", "branca"], ["CINZA", "cinza"],
  ["AMARELA", "amarela"], ["AMARELO", "amarela"], ["LARANJA", "laranja"], ["VERDE", "verde"],
  ["ROXA", "roxa"], ["ROXO", "roxa"], ["MARROM", "marrom"], ["PRETA", "preta"], ["PRETO", "preta"],
  ["BORDO", "bordo"], ["VINHO", "bordo"], ["VERMELHA", "vermelha"], ["VERMELHO", "vermelha"],
];
const COLOR_RE = COLOR_WORDS.map(([w]) => w).join("|");

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

const colorOf = (word: string | undefined): BeltColor | null =>
  (word && COLOR_WORDS.find(([w]) => w === word)?.[1]) || null;

/** Tamanho: variante do pedido ("A2 / Azul", "A2 · 10 un") ou "— Tam. A2" do orçamento. */
export function sizeFrom(name: string, variant?: string | null): string | null {
  const tam = /\bTAM\.?\s*([A-Z0-9][A-Z0-9/.-]{0,6})/i.exec(name);
  if (tam) return tam[1].toUpperCase();
  const first = (variant ?? "").split(/[/·|,]/)[0]?.trim();
  if (first && /^(?:[AMFKP]\d{1,2}|\d{1,2}|PP|P|M|G|GG|XG|XGG|EG|EGG|INFANTIL|ADULTO)$/i.test(first)) return first.toUpperCase();
  return null;
}

/** Interpreta o nome. null = não é faixa (ou é pacote/chaveiro, sem cor por item). */
export function parseBelt(name: string, variant?: string | null): BeltSpec | null {
  const s = norm(name);
  if (!/\bFAIXAS?\b/.test(s)) return null;
  if (/\bCHAVEIROS?\b|\bPACOTE\b|\bKIT\b/.test(s)) return null;

  const discipline: BeltDiscipline = /\bJIU[ -]?JITSU\b|\bBJJ\b/.test(s)
    ? "bjj"
    : /\bJUDO\b/.test(s)
      ? "judo"
      : "outra";

  const lineMatch = /\bLINHA (\w+)/.exec(s);
  const line = lineMatch ? lineMatch[1].charAt(0) + lineMatch[1].slice(1).toLowerCase() : null;

  // A cor principal vem logo depois da modalidade (ou de "FAIXA"); "COM/PONTA/PONTEIRA" vêm depois.
  const afterHead = s.replace(/^.*?\bFAIXAS?\b/, "").replace(/\bJIU[ -]?JITSU\b|\bBJJ\b|\bJUDO\b/, " ");
  const head = afterHead.split(/\b(?:COM|PONTA|PONTEIRA)\b/)[0] ?? "";
  const color = colorOf(new RegExp(`\\b(${COLOR_RE})\\b`).exec(head)?.[1]);
  const stripe = colorOf(new RegExp(`\\bCOM (${COLOR_RE})\\b`).exec(s)?.[1]);
  const tips = colorOf(new RegExp(`\\bPONTA (${COLOR_RE})\\b`).exec(s)?.[1]);

  let bar: BeltBar | null = null;
  if (/\bPONTEIRA AUTISMO\b/.test(s)) bar = "autismo";
  else bar = colorOf(new RegExp(`\\bPONTEIRA (${COLOR_RE})\\b`).exec(s)?.[1]);
  if (!bar && discipline === "bjj" && color) bar = color === "preta" ? "vermelha" : "preta";

  const embroidery = /\bKANJI BJJ\b/.test(s)
    ? "kanji_bjj"
    : /\bKANJI JJ\b/.test(s)
      ? "kanji_jj"
      : /\bKANJI\b/.test(s)
        ? "kanji"
        : /\bPERSONALIZAD[AO]\b/.test(s)
          ? "nome"
          : null;

  return {
    discipline,
    color,
    stripe,
    tips,
    bar,
    kids: /\bINFANTIL\b(?! E ADULTO)/.test(s),
    embroidery,
    line,
    size: sizeFrom(name, variant),
  };
}

/** Correção manual gravada no item da produção (custom_config.belt_*). */
export function applyBeltOverride(spec: BeltSpec, config: Record<string, unknown> | null | undefined): BeltSpec {
  if (!config) return spec;
  const pick = <T extends string>(key: string, ok: (v: string) => v is T): T | null | undefined => {
    const v = config[key];
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    return typeof v === "string" && ok(v) ? v : undefined;
  };
  const isColor = (v: string): v is BeltColor => v in BELT_COLORS;
  const isBar = (v: string): v is BeltBar => v === "autismo" || v in BELT_COLORS;
  const color = pick("belt_color", isColor);
  const stripe = pick("belt_stripe", isColor);
  const tips = pick("belt_tips", isColor);
  const bar = pick("belt_bar", isBar);
  return {
    ...spec,
    ...(color !== undefined ? { color } : {}),
    ...(stripe !== undefined ? { stripe } : {}),
    ...(tips !== undefined ? { tips } : {}),
    ...(bar !== undefined ? { bar } : {}),
  };
}

const colorName = (c: BeltColor) => BELT_COLORS[c].label;

export const DISCIPLINE_LABEL: Record<BeltDiscipline, string> = { bjj: "Jiu-jitsu", judo: "Judô", outra: "Faixa" };

/** "Cinza com branco · ponteira preta" — texto que acompanha o desenho (útil também em P&B). */
export function beltColorText(spec: BeltSpec): string {
  if (!spec.color) return "Cor a definir";
  const parts: string[] = [colorName(spec.color)];
  // "com branco/preto": a listra é dita no masculino, como no catálogo.
  const masc: Partial<Record<BeltColor, string>> = { branca: "branco", preta: "preto", amarela: "amarelo", roxa: "roxo" };
  if (spec.stripe) parts[0] += ` com ${masc[spec.stripe] ?? colorName(spec.stripe).toLowerCase()}`;
  if (spec.tips) parts[0] += ` ponta ${colorName(spec.tips).toLowerCase()}`;
  if (spec.bar) parts.push(spec.bar === "autismo" ? "ponteira autismo" : `ponteira ${colorName(spec.bar).toLowerCase()}`);
  return parts.join(" · ");
}

export const EMBROIDERY_LABEL: Record<NonNullable<BeltSpec["embroidery"]>, string> = {
  nome: "Bordado com nome",
  kanji_bjj: "Bordado kanji BJJ",
  kanji_jj: "Bordado kanji JJ",
  kanji: "Bordado kanji",
};

/** Chave para somar peças iguais na lista de separação. */
export function beltGroupKey(spec: BeltSpec): string {
  return [spec.discipline, spec.color, spec.stripe, spec.tips, spec.bar, spec.kids, spec.line, spec.size, spec.embroidery].join("|");
}

/**
 * Geometria do desenho (unidades relativas 0..1 do comprimento/altura),
 * compartilhada pelo SVG da tela e pelo PDF.
 */
export function beltShapes(spec: BeltSpec): Array<{ x: number; y: number; w: number; h: number; fill: string }> {
  const fill = (c: BeltColor | null) => (c ? BELT_COLORS[c].hex : "#E5E7EB");
  const shapes = [{ x: 0, y: 0, w: 1, h: 1, fill: fill(spec.color) }];
  if (spec.stripe) shapes.push({ x: 0, y: 0.36, w: 1, h: 0.28, fill: fill(spec.stripe) });
  if (spec.tips) {
    shapes.push({ x: 0, y: 0, w: 0.13, h: 1, fill: fill(spec.tips) });
    shapes.push({ x: 0.87, y: 0, w: 0.13, h: 1, fill: fill(spec.tips) });
  }
  if (spec.bar === "autismo") {
    AUTISM_COLORS.forEach((c, i) => shapes.push({ x: 0.74 + i * 0.045, y: 0, w: 0.045, h: 1, fill: c }));
  } else if (spec.bar) {
    shapes.push({ x: 0.74, y: 0, w: 0.18, h: 1, fill: fill(spec.bar) });
  }
  return shapes;
}

/** Faixa de um item da produção: leitura do nome + correção manual, se houver. */
export function jobBelt(job: {
  product_name: string;
  variant_label: string | null;
  custom_config?: Record<string, unknown> | null;
}): BeltSpec | null {
  const spec = parseBelt(job.product_name, job.variant_label);
  return spec ? applyBeltOverride(spec, job.custom_config) : null;
}
