/**
 * Orçamento a partir de uma mensagem do cliente (WhatsApp ou texto colado).
 *
 * Leitura local, sem IA e sem enviar a mensagem para nenhum serviço: o texto é dividido em trechos e cada trecho
 * vira um pedido com tipo de produto (faixa, kimono, rashguard…), modalidade (jiu-jitsu/judô), linha (Premium,
 * Pro, Training), acabamento (padrão, bordada kanji, bordada personalizada), cores, infantil/adulto, tamanhos e
 * quantidades. Os atributos de cada produto saem do próprio nome e das categorias do catálogo, então produto novo
 * entra sozinho. O resultado é um rascunho: o vendedor revisa e edita no editor de orçamentos.
 */

export type CatalogSize = { size: string; price: number | null };
export type CatalogProduct = {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  price: number;
  category?: string | null;
  parent_category?: string | null;
  sizes: CatalogSize[];
};

export type Kind = "faixa" | "kimono" | "rashguard" | "patch" | "chaveiro" | "camiseta" | "short";
export type Modality = "jiujitsu" | "judo";
export type Line = "premium" | "pro" | "training";
export type Style = "padrao" | "kanji" | "personalizada";

export type QuoteLine = {
  ref: string;
  product_id: string | null;
  name: string;
  image_url: string | null;
  sku: string | null;
  quantity: number;
  size: string | null;
  unit_price: number;
  /** O que foi entendido do trecho (para mostrar na revisão). */
  understood: {
    kind: Kind | null;
    modality: Modality | null;
    line: Line | null;
    style: Style | null;
    colors: string[];
    kids: boolean | null;
  };
  confidence: "alta" | "media" | "baixa";
  source: string;
  issues: string[];
  alternatives: { product_id: string; name: string; price: number }[];
};

export type ParsedQuote = { lines: QuoteLine[]; ignored: string[] };

/* ------------------------------------------------------------------ */
/* Normalização                                                         */
/* ------------------------------------------------------------------ */

export function norm(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/jiu[\s-]*jitsu|jiu[\s-]*jitsu|jiujitsu|jiu\s+jtsu|\bbjj\b|\bjj\b/g, " jiujitsu ")
    .replace(/\bkimonos?\b|\bquimonos?\b|\bgis?\b/g, " kimono ")
    .replace(/\brash\s*-?\s*guards?\b|\brashs?\b/g, " rashguard ")
    .replace(/\bfaixas?\b/g, " faixa ")
    .replace(/[^a-z0-9/.,;:\n+x-]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const COLORS: [string, RegExp][] = [
  ["branco", /\bbranc[oa]s?\b/],
  ["cinza", /\bcinzas?\b/],
  ["amarelo", /\bamarel[oa]s?\b/],
  ["laranja", /\blaranjas?\b/],
  ["verde", /\bverdes?\b/],
  ["azul royal", /\bazul royal\b|\broyal\b/],
  ["azul claro", /\bazul clar[oa]\b|\bazul celeste\b/],
  ["azul", /\bazul\b|\bazuis\b/],
  ["roxo", /\brox[oa]s?\b/],
  ["marrom", /\bmarrons?\b/],
  ["preto", /\bpret[oa]s?\b/],
  ["vermelho", /\bvermelh[oa]s?\b/],
  ["coral", /\bcoral\b/],
  ["dourado", /\bdourad[oa]s?\b/],
];

/** Cores na ordem em que aparecem: principal, "com X" (secundária) e "ponteira/ponta X". */
function colorsOf(text: string): {
  main: string | null;
  second: string | null;
  tip: string | null;
  all: string[];
} {
  const found: { c: string; at: number }[] = [];
  for (const [c, re] of COLORS) {
    const g = new RegExp(re.source, "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(text))) {
      if (!found.some((f) => Math.abs(f.at - m!.index) < 2)) found.push({ c, at: m.index });
    }
  }
  found.sort((a, b) => a.at - b.at);
  // "azul royal" também casa "azul": fica só o mais específico na mesma posição
  const all = found.map((f) => f.c).filter((c, i, arr) => arr.indexOf(c) === i);
  const tipM = text.match(
    /\b(?:ponteira|ponta)\s+(?:na\s+cor\s+)?([a-z]+(?:\s+(?:royal|clar[oa]))?)/,
  );
  const tip = tipM ? (COLORS.find(([, re]) => re.test(tipM[1]))?.[0] ?? null) : null;
  const secM = text.match(/\bcom\s+(?:a\s+|o\s+)?(?:listra\s+|faixa\s+)?([a-z]+)/);
  const second = secM ? (COLORS.find(([, re]) => re.test(secM[1]))?.[0] ?? null) : null;
  const main = all.find((c) => c !== tip && c !== second) ?? null;
  return { main, second, tip, all };
}

const NUMEROS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  quinze: 15,
  vinte: 20,
  trinta: 30,
  cinquenta: 50,
  cem: 100,
  meia: 6,
};

/* ------------------------------------------------------------------ */
/* Atributos de um produto do catálogo (pelo nome e categorias)         */
/* ------------------------------------------------------------------ */

type Attrs = {
  kind: Kind | null;
  modality: Modality | null;
  line: Line | null;
  style: Style | null;
  kids: boolean | null;
  colors: { main: string | null; second: string | null; tip: string | null; all: string[] };
  sleeve: "curta" | "longa" | null;
  fullColor: boolean;
};

function kindOf(t: string): Kind | null {
  if (/\bfaixa\b/.test(t) && !/\bchaveir/.test(t)) return "faixa";
  if (/\bkimono\b/.test(t)) return "kimono";
  if (/\brashguard\b/.test(t)) return "rashguard";
  if (/\bpatch(es)?\b/.test(t)) return "patch";
  if (/\bchaveir/.test(t)) return "chaveiro";
  if (/\bcamis(a|eta)s?\b/.test(t)) return "camiseta";
  if (/\bshorts?\b|\bbermudas?\b/.test(t)) return "short";
  return null;
}

function attrsOf(text: string): Attrs {
  const t = norm(text);
  const kind = kindOf(t);
  const modality: Modality | null = /\bjudo\b/.test(t)
    ? "judo"
    : /\bjiujitsu\b/.test(t)
      ? "jiujitsu"
      : null;
  const line: Line | null = /\btraining\b|\btreino\b/.test(t)
    ? "training"
    : /\bpremium\b/.test(t)
      ? "premium"
      : /\bpro\b/.test(t)
        ? "pro"
        : null;
  const style: Style | null = /\bpersonalizad[ao]s?\b|\bcom (o )?nome\b|\bnome bordado\b/.test(t)
    ? "personalizada"
    : /\bkanji\b|\bbordad[ao]s?\b/.test(t)
      ? "kanji"
      : /\bpadrao\b|\blisas?\b|\bsimples\b/.test(t)
        ? "padrao"
        : null;
  const kids: boolean | null = /\binfantil\b|\bkids?\b|\bcrianc|\bmirim\b|\bfilh[oa]\b/.test(t)
    ? true
    : /\badulto\b/.test(t)
      ? false
      : null;
  return {
    kind,
    modality,
    line,
    style,
    kids,
    colors: colorsOf(t.replace(/\b(linha|bordado kanji)\b/g, " ")),
    sleeve: /manga curta/.test(t) ? "curta" : /manga longa/.test(t) ? "longa" : null,
    fullColor: /full color|sublimad/.test(t),
  };
}

type Indexed = { p: CatalogProduct; a: Attrs };

export function indexCatalog(catalog: CatalogProduct[]): Indexed[] {
  return catalog.map((p) => {
    const a = attrsOf(`${p.name} ${p.category ?? ""} ${p.parent_category ?? ""}`);
    // a cor do produto vem só do nome (as categorias falam de linha, não de cor)
    a.colors = colorsOf(norm(p.name).replace(/\b(linha|bordado kanji)\b/g, " "));
    if (!a.style && a.kind === "faixa") a.style = "padrao";
    if (a.kids === null) a.kids = false;
    return { p, a };
  });
}

/* ------------------------------------------------------------------ */
/* Tamanhos e quantidades de um trecho                                  */
/* ------------------------------------------------------------------ */

const SIZE_AM = /\b([am])\s*-?\s*([0-6])\b/g;
const SIZE_LETRA = /\b(?:tam(?:anho)?\.?\s*)?(pp|p|m|g|gg|xg|xgg|eg|egg)\b/g;

/** Pares (quantidade, tamanho) do trecho. "5 A1, 3 A2" · "A2 x 4" · "2 faixas A2" · "tamanho M". */
export function sizesAndQty(
  seg: string,
  kind: Kind | null,
): { size: string | null; qty: number | null }[] {
  const t = seg;
  const pares: { size: string | null; qty: number | null; at: number }[] = [];
  const usados: [number, number][] = [];
  const livre = (i: number, j: number) => !usados.some(([a, b]) => i < b && j > a);
  const marcar = (i: number, j: number) => usados.push([i, j]);
  // quantidade antes do tamanho: "5 a1", "5x a1", "5 un a1", "8 amarelas m2", "15 faixa brancas de jiujitsu a2"
  const antes =
    /\b(\d{1,4})\s*(?:x\s*)?((?:[a-z]+\s+){0,5}?)(?:tam(?:anho)?\.?\s*)?([am])\s*-?\s*([0-6])\b/g;
  let m: RegExpExecArray | null;
  while ((m = antes.exec(t))) {
    pares.push({ qty: Number(m[1]), size: `${m[3].toUpperCase()}${m[4]}`, at: m.index });
    marcar(m.index, m.index + m[0].length);
  }
  // tamanho antes da quantidade: "a1: 5", "a1 x 5", "a1 - 5 unidades", "a1 (5)"
  const depois = /\b([am])\s*-?\s*([0-6])\s*(?:[:=x(-]|com)\s*(\d{1,4})\b/g;
  while ((m = depois.exec(t))) {
    if (!livre(m.index, m.index + m[0].length)) continue;
    pares.push({ qty: Number(m[3]), size: `${m[1].toUpperCase()}${m[2]}`, at: m.index });
    marcar(m.index, m.index + m[0].length);
  }
  // tamanhos soltos
  const soltos = new RegExp(SIZE_AM.source, "g");
  while ((m = soltos.exec(t))) {
    if (!livre(m.index, m.index + m[0].length)) continue;
    pares.push({ qty: null, size: `${m[1].toUpperCase()}${m[2]}`, at: m.index });
  }
  if (kind === "rashguard" || kind === "camiseta" || kind === "short") {
    const letras = new RegExp(SIZE_LETRA.source, "g");
    while ((m = letras.exec(t))) {
      if (!livre(m.index, m.index + m[0].length)) continue;
      // "m" sozinho só vale com "tamanho" antes ou numa lista de tamanhos
      if (m[1] === "m" && !/tam/.test(m[0]) && !/\b(pp|p|g|gg)\b/.test(t)) continue;
      const q = t.slice(Math.max(0, m.index - 8), m.index).match(/(\d{1,4})\s*(?:x|un\w*)?\s*$/);
      pares.push({ qty: q ? Number(q[1]) : null, size: m[1].toUpperCase(), at: m.index });
    }
  }
  pares.sort((a, b) => a.at - b.at);
  const geral = qtyGeral(t);
  // um tamanho só, com a quantidade longe dele ("2 faixas azuis linha pro tamanho A2")
  if (pares.length === 1 && pares[0].qty === null) pares[0].qty = geral;
  if (pares.length) return pares.map(({ size, qty }) => ({ size, qty }));
  return [{ size: null, qty: geral }];
}

/** Quantidade do trecho sem olhar o tamanho: "2 kimonos", "10x faixa", "duas faixas", "um kimono". */
function qtyGeral(t: string): number | null {
  const q =
    t.match(
      /\b(\d{1,4})\s*(?:x\s*)?(?:un\w*\s+|pecas?\s+)?(?:faixa|kimono|rashguard|patch|chaveiro|camis|short|kit)/,
    ) ??
    t.match(
      /\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|cinquenta|cem)\b/,
    );
  return q ? Number(q[1]) || NUMEROS[q[1]] || null : null;
}

/* ------------------------------------------------------------------ */
/* Trechos da mensagem                                                  */
/* ------------------------------------------------------------------ */

const SAUDACAO =
  /^(oi+|ola|bom dia|boa tarde|boa noite|tudo bem|td bem|obrigad[oa]|valeu|ok|blz|beleza|por favor|pfv|grato|grata)[\s!.,?]*$/;

const QTD = String.raw`(?:\d{1,4}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)`;
const TAM = String.raw`[am]\s*-?\s*[0-6]\b|(?:pp|gg|xg)\b`;
const PRODUTO = String.raw`(?:faixa|kimono|rashguard|patch|camis|short|chaveiro)`;

function segments(text: string): string[] {
  const t = norm(text);
  // corta em linhas, ";", ".", "," e em " e / mais / também " quando começa outro item
  // ("… A3 e 1 roxa A2", "… A3 e um branco A1", "… e 4 faixas amarelas")
  const novoItem = new RegExp(
    String.raw`\s+(?:e|mais|tambem)\s+(?=${QTD}\s+(?:x\s*)?(?:[a-z]+\s+){0,3}?(?:${TAM})|${QTD}\s+(?:x\s*)?${PRODUTO}|${PRODUTO}\b)`,
  );
  const partes = t
    .split(/\n+|;|\.\s+|\s*,\s*/)
    .flatMap((p) => p.split(novoItem))
    .map((s) => s.trim().replace(/^(e|mais|tambem)\s+/, ""))
    .filter(Boolean);
  // Pedaço sem produto, sem tamanho e sem número ("linha pro", "ponteira vermelha", "sou de judô") completa o
  // trecho anterior em vez de virar um item. Depois de um item já completo (com tamanho), só junta se falar de cor
  // ou de linha — uma pergunta solta ("vocês entregam em Maceió?") fica de fora.
  const tam = new RegExp(TAM);
  const juntos: string[] = [];
  for (const p of partes) {
    const solto = !kindOf(p) && !tam.test(p) && !/\d/.test(p);
    const anterior = juntos[juntos.length - 1];
    const completa =
      !!anterior &&
      (!tam.test(anterior) ||
        colorsOf(p).all.length > 0 ||
        /\b(linha|premium|pro|training|bordad|kanji|personalizad|infantil|adulto)\b/.test(p));
    if (solto && anterior && !SAUDACAO.test(anterior) && completa) juntos[juntos.length - 1] += ` ${p}`;
    else juntos.push(p);
  }
  return juntos;
}

/* ------------------------------------------------------------------ */
/* Casamento com o catálogo                                             */
/* ------------------------------------------------------------------ */

type Want = Attrs & { sizes: string[]; preferLine: Line | null };

function score(w: Want, x: Indexed): number {
  const a = x.a;
  if (w.kind && a.kind !== w.kind) return -999;
  let s = 0;
  if (w.modality) s += a.modality === w.modality ? 4 : a.modality ? -12 : 0;
  if (w.line) s += a.line === w.line ? 4 : -7;
  else if (w.preferLine && a.line === w.preferLine) s += 1; // mesma linha dos outros itens do pedido
  if (w.style) s += a.style === w.style ? 4 : -5;
  else if (a.style === "padrao") s += 1; // sem pedir acabamento: a faixa lisa é o padrão
  if (w.kids !== null) s += a.kids === w.kids ? 3 : -4;
  else if (a.kids) s -= 2; // sem dizer "infantil": prefere adulto
  const c = w.colors;
  if (c.main) s += a.colors.main === c.main ? 6 : a.colors.all.includes(c.main) ? -2 : -9;
  if (c.second) s += a.colors.second === c.second ? 4 : -4;
  else if (a.colors.second && a.kind === "faixa") s -= 3;
  if (c.tip) s += a.colors.tip === c.tip ? 4 : -4;
  else if (a.colors.tip && a.kind === "faixa") s -= 3;
  if (w.sleeve) s += a.sleeve === w.sleeve ? 3 : -4;
  if (w.fullColor) s += a.fullColor ? 3 : -3;
  else if (a.fullColor) s -= 1;
  // tamanho que o produto não tem
  const tem = new Set(x.p.sizes.map((z) => sizeKey(z.size)));
  for (const sz of w.sizes) if (tem.size && !tem.has(sizeKey(sz))) s -= 5;
  // medida do patch ("15x15")
  return s;
}

/** "A2 - 290cm" → "A2"; "a 2" → "A2"; "GG" → "GG". */
export function sizeKey(s: string): string {
  const t = String(s).toUpperCase().replace(/\s+/g, "");
  const m = t.match(/^([AM])-?([0-6])/);
  return m ? `${m[1]}${m[2]}` : t.split("-")[0];
}

let refSeq = 0;

export function parseQuoteMessage(
  text: string,
  catalog: CatalogProduct[] | Indexed[],
): ParsedQuote {
  const idx: Indexed[] =
    catalog.length && "a" in (catalog[0] as Indexed)
      ? (catalog as Indexed[])
      : indexCatalog(catalog as CatalogProduct[]);
  const lines: QuoteLine[] = [];
  const ignored: string[] = [];
  const geral = attrsOf(text); // modalidade/linha dita uma vez vale para a mensagem toda
  let ctx: Attrs | null = null; // o produto do trecho anterior ("faixa branca: 5 A1" + "3 A2")
  // Linha "cabeçalho" (produto sem tamanho nem quantidade, ex.: "Faixa branca:"): some se os trechos seguintes
  // trouxerem os tamanhos desse mesmo produto.
  let cabecalho: string | null = null;
  const linhaUsada = new Map<Kind, Line>(); // sem linha no pedido: mantém a mesma linha entre itens do mesmo tipo

  for (const seg of segments(text)) {
    const own = attrsOf(seg);
    const temTamanho = /\b[am]\s*-?\s*[0-6]\b/.test(seg) || /\b(pp|gg|xg)\b/.test(seg);
    if (!own.kind && !temTamanho && !own.colors.main) {
      if (!SAUDACAO.test(seg) && seg.length > 2) ignored.push(seg);
      continue;
    }
    let w: Attrs;
    // A linha dita uma vez na mensagem (Premium, Pro, Training) é das faixas: não passa para kimono, rashguard…
    const linhaGeral = (k: Kind | null) => (k === "faixa" || k === null ? geral.line : null);
    if (own.kind) {
      w = { ...own, modality: own.modality ?? geral.modality, line: own.line ?? linhaGeral(own.kind) };
    } else if (ctx) {
      // trecho sem produto ("3 A2", "e 2 azuis A3"): herda o produto anterior, trocando só o que foi dito
      if (cabecalho && temTamanho) {
        const i = lines.findIndex((l) => l.ref === cabecalho);
        if (i >= 0) lines.splice(i, 1);
      }
      w = {
        ...ctx,
        colors: own.colors.main ? own.colors : ctx.colors,
        kids: own.kids ?? ctx.kids,
        style: own.style ?? ctx.style,
        line: own.line ?? ctx.line,
      };
    } else {
      // tamanho/cor sem dizer o produto: pela modalidade, o mais provável é faixa
      w = {
        ...own,
        kind: geral.kind ?? "faixa",
        modality: own.modality ?? geral.modality,
        line: own.line ?? linhaGeral(geral.kind ?? "faixa"),
      };
    }
    ctx = w;
    const pares = sizesAndQty(seg, w.kind);
    const ehCabecalho = !!own.kind && pares.length === 1 && !pares[0].size && !pares[0].qty;
    cabecalho = null;
    const want: Want = {
      ...w,
      sizes: pares.map((p) => p.size).filter(Boolean) as string[],
      preferLine: (w.kind && linhaUsada.get(w.kind)) ?? null,
    };
    const ranked = idx
      .map((x) => ({ x, s: score(want, x) }))
      .filter((r) => r.s > -999)
      .sort((a, b) => b.s - a.s || a.x.p.price - b.x.p.price);
    const best = ranked[0];
    if (best && w.kind && best.x.a.line && !linhaUsada.has(w.kind))
      linhaUsada.set(w.kind, best.x.a.line);
    const issues: string[] = [];
    if (!best) issues.push("Produto não encontrado no catálogo — escolha o modelo.");
    const gap = best && ranked[1] ? best.s - ranked[1].s : 99;
    if (best && w.kind === "faixa" && !w.colors.main)
      issues.push("A cor da faixa não foi informada.");
    if (
      best &&
      (w.kind === "faixa" || w.kind === "kimono") &&
      !w.line &&
      ranked.some((r) => r !== best && r.x.a.line !== best.x.a.line && r.s >= best.s - 4)
    )
      issues.push("A linha (Premium, Pro ou Training) não foi informada — confira o modelo.");
    if (best && best.x.a.style === "personalizada")
      issues.push("Faixa personalizada: peça os nomes para o bordado.");
    // pedido que o catálogo não tem: avisa o que foi usado no lugar
    if (best && w.line && best.x.a.line && best.x.a.line !== w.line)
      issues.push(
        `Não há este modelo na ${LINE_LABEL[w.line]}: usei a ${LINE_LABEL[best.x.a.line]}.`,
      );
    if (best && w.colors.main && best.x.a.colors.main !== w.colors.main)
      issues.push(`Não encontrei a cor ${w.colors.main} neste produto — confira o modelo.`);
    if (best && w.modality && best.x.a.modality && best.x.a.modality !== w.modality)
      issues.push(`Não há este modelo para ${MODALITY_LABEL[w.modality]} — confira.`);
    const alternatives = ranked
      .slice(1)
      .filter((r) => r.s >= (best?.s ?? 0) - 6)
      .slice(0, 6)
      .map((r) => ({ product_id: r.x.p.id, name: r.x.p.name, price: r.x.p.price }));
    // alta: vários atributos bateram (ex.: modalidade + linha + cor) e nenhum outro modelo empata
    const confidence: QuoteLine["confidence"] =
      !best || best.s < 0 ? "baixa" : best.s >= 10 && gap >= 1 ? "alta" : "media";

    for (const par of pares) {
      if (
        best &&
        par.size &&
        best.x.p.sizes.length &&
        !best.x.p.sizes.some((z) => sizeKey(z.size) === par.size)
      )
        issues.push(`O modelo escolhido não tem o tamanho ${par.size}.`);
      const sizeRow = best?.x.p.sizes.find((z) => par.size && sizeKey(z.size) === par.size);
      const sizeLabel = sizeRow?.size ?? par.size;
      const needsSize = best && best.x.p.sizes.length > 0 && !par.size;
      lines.push({
        ref: `l${++refSeq}`,
        product_id: best?.x.p.id ?? null,
        name: best ? `${best.x.p.name}${sizeLabel ? ` — Tam. ${sizeLabel}` : ""}` : seg,
        image_url: best?.x.p.image_url ?? null,
        sku: best?.x.p.slug ?? null,
        quantity: par.qty && par.qty > 0 ? par.qty : 1,
        size: sizeLabel ?? null,
        unit_price: best ? Number(sizeRow?.price ?? best.x.p.price ?? 0) : 0,
        understood: {
          kind: w.kind,
          modality: w.modality,
          line: w.line,
          style: w.style,
          colors: w.colors.all,
          kids: w.kids,
        },
        confidence,
        source: seg,
        issues: [
          ...new Set([
            ...issues,
            ...(needsSize ? ["Tamanho não informado."] : []),
            ...(!par.qty ? ["Quantidade não informada (ficou 1)."] : []),
          ]),
        ],
        alternatives,
      });
      if (ehCabecalho) cabecalho = lines[lines.length - 1].ref;
    }
  }
  return { lines, ignored };
}

/** Troca o modelo de uma linha mantendo tamanho e quantidade (botão "outros modelos" da revisão). */
export function swapProduct(line: QuoteLine, product: CatalogProduct): QuoteLine {
  const row = product.sizes.find((z) => line.size && sizeKey(z.size) === sizeKey(line.size));
  const sizeLabel = row?.size ?? line.size;
  return {
    ...line,
    product_id: product.id,
    name: `${product.name}${sizeLabel ? ` — Tam. ${sizeLabel}` : ""}`,
    image_url: product.image_url ?? null,
    sku: product.slug ?? null,
    size: sizeLabel,
    unit_price: Number(row?.price ?? product.price ?? 0),
  };
}

export const KIND_LABEL: Record<Kind, string> = {
  faixa: "Faixa",
  kimono: "Kimono",
  rashguard: "Rashguard",
  patch: "Patch",
  chaveiro: "Chaveiro",
  camiseta: "Camiseta",
  short: "Short",
};
export const MODALITY_LABEL: Record<Modality, string> = { jiujitsu: "Jiu-Jitsu", judo: "Judô" };
export const LINE_LABEL: Record<Line, string> = {
  premium: "Linha Premium",
  pro: "Linha Pro",
  training: "Linha Training",
};
export const STYLE_LABEL: Record<Style, string> = {
  padrao: "Padrão",
  kanji: "Bordada kanji",
  personalizada: "Bordada personalizada",
};

/** Item do editor de orçamentos a partir de uma linha lida (o `_ref` liga ao painel de revisão; não é salvo). */
export type DraftItem = {
  product_id: string | null;
  name: string;
  sku?: string | null;
  description?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  _ref?: string;
};

export function lineToItem(l: QuoteLine): DraftItem {
  return {
    product_id: l.product_id,
    name: l.name,
    sku: l.sku,
    description: "",
    image_url: l.image_url,
    quantity: l.quantity,
    unit_price: l.unit_price,
    _ref: l.ref,
  };
}
