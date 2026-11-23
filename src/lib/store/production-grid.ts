/**
 * Visão "planilha" da fila de produção: cada linha é um modelo (produto + cor),
 * cada coluna é um tamanho e a célula é a quantidade de peças.
 *
 * O tamanho vem de onde o pedido o escreveu:
 *   - grade no detalhe do orçamento: "Tamanhos: PP - 23 / P - 34 / M - 4";
 *   - nome do item do orçamento: "… — Tam. M3 - 235cm";
 *   - detalhe: "TAM. 3,40", "TAM A4", "TAM. 4 METROS";
 *   - variante do pedido da loja: "A3 - 300cm", "M0 - 200cm / DOURADO", "A0".
 * Client-safe: nada aqui depende do banco.
 */
import { DISCIPLINE_LABEL, EMBROIDERY_LABEL, beltColorText, jobBelt } from "./belt";
import type { BeltSpec } from "./belt";
import { STAGES } from "./production-stages";
import type { Stage } from "./production-stages";
import type { ProductionJob } from "./production.functions";

/** Coluna para peças sem tamanho informado. */
export const NO_SIZE = "—";

const SIZE_TOKEN = /^(?:[AMFKP]\d{1,2}|PP|P|M|G|GG|XG|XGG|EG|EGG|G\d|U|UNICO|ÚNICO)$/i;

function normSize(raw: string): string {
  const s = raw.trim().toUpperCase();
  const meters = /^(\d+(?:[.,]\d+)?)\s*(?:M|METROS?)?$/.exec(s);
  if (meters) return `${meters[1].replace(".", ",")}m`;
  if (s === "UNICO" || s === "ÚNICO" || s === "U") return "Único";
  return s;
}

/** "TAM. 3,40", "Tam. M3", "TAMANHO: G", "TAM 4 METROS". */
function tamFrom(text: string | null | undefined): string | null {
  if (!text) return null;
  const m =
    /\bTAM(?:ANHO)?\.?\s*:?\s*(\d+(?:[.,]\d+)?(?:\s*(?:METROS?|M)\b)?|[A-Z]{1,3}\d{0,2})(?![A-Z])/i.exec(
      text,
    );
  return m ? normSize(m[1]) : null;
}

/** "Tamanhos: PP - 23 / P - 34 / M-18" → [["PP",23],["P",34],["M",18]]. */
function gradeFrom(text: string | null | undefined): Array<[string, number]> | null {
  const m = /\bTAMANHOS?\s*:\s*(.+)$/i.exec(text ?? "");
  if (!m) return null;
  const out: Array<[string, number]> = [];
  for (const part of m[1].split(/[/;|]/)) {
    const p = /^\s*([A-Z0-9][A-Z0-9.,]*)\s*[-:=x]\s*(\d+)\s*$/i.exec(part);
    if (p) out.push([normSize(p[1]), Number(p[2])]);
  }
  return out.length ? out : null;
}

/** Primeiro pedaço da variante quando ele é um tamanho: "A3 - 300cm", "M0 - 200cm / DOURADO". */
function variantSize(variant: string | null | undefined): string | null {
  const first = (variant ?? "").split(/[/·|,]/)[0]?.trim() ?? "";
  const token = /^([A-Z]{1,3}\d{0,2})(?:\s*-\s*\d+\s*cm)?$/i.exec(first)?.[1];
  return token && SIZE_TOKEN.test(token) ? normSize(token) : null;
}

/** Peças do item por tamanho. A soma sempre fecha com a quantidade do item. */
export function jobSizes(job: ProductionJob): Array<[string, number]> {
  const qty = Number(job.quantity || 0);
  const grade = gradeFrom(job.variant_label);
  if (grade) {
    const sum = grade.reduce((a, [, n]) => a + n, 0);
    if (sum < qty) grade.push([NO_SIZE, qty - sum]);
    return grade;
  }
  const belt = jobBelt(job);
  const size =
    tamFrom(job.product_name) ??
    tamFrom(job.variant_label) ??
    variantSize(job.variant_label) ??
    (belt?.size ? normSize(belt.size) : null);
  return [[size ?? NO_SIZE, qty]];
}

/** Texto do detalhe que não é tamanho (nomes para bordar, cor da linha, etiqueta…). */
function variantNote(job: ProductionJob): string | null {
  const v = (job.variant_label ?? "").trim();
  if (!v || gradeFrom(v)) return null;
  const parts = v
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p && !variantSize(p) && !/^\d+\s*cm$/i.test(p));
  // O tamanho já está na coluna: sai da observação ("… TAM. 3,40" → "…").
  const text = parts
    .join(" / ")
    .replace(
      /\s*\bTAM(?:ANHO)?\.?\s*:?\s*(?:\d+(?:[.,]\d+)?(?:\s*(?:METROS?|M)\b)?|[A-Z]{1,3}\d{0,2})(?![A-Z])/gi,
      "",
    )
    .replace(/^[\s\-–—/]+|[\s\-–—/]+$/g, "")
    .replace(/\s+-\s+-\s+/g, " - ");
  return text || null;
}

/** Nome do modelo sem o tamanho: "FAIXA … — Tam. M3 - 235cm" → "FAIXA …". */
function modelName(name: string): string {
  return name
    .replace(/\s*[—–-]\s*TAM(?:ANHO)?\.?\s*.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type GridModel = {
  key: string;
  label: string;
  /** Detalhe curto do modelo (linha, infantil, bordado). */
  sub: string | null;
  belt: BeltSpec | null;
};

/** Modelo da linha: faixas iguais (cor, listra, ponteira, linha, bordado) somam juntas, sem olhar o tamanho. */
export function jobModel(job: ProductionJob): GridModel {
  const belt = jobBelt(job);
  if (belt) {
    const sub = [
      belt.line ? `Linha ${belt.line}` : null,
      belt.kids ? "Infantil" : null,
      belt.embroidery ? EMBROIDERY_LABEL[belt.embroidery] : null,
    ].filter(Boolean);
    return {
      key: [
        "faixa",
        belt.discipline,
        belt.color,
        belt.stripe,
        belt.tips,
        belt.bar,
        belt.kids,
        belt.line,
        belt.embroidery,
      ].join("|"),
      label: `${DISCIPLINE_LABEL[belt.discipline]} · ${beltColorText(belt)}`,
      sub: sub.length ? sub.join(" · ") : null,
      belt: { ...belt, size: null },
    };
  }
  const name = modelName(job.product_name);
  return { key: `item|${name.toUpperCase()}`, label: name, sub: null, belt: null };
}

export type GridRow = {
  key: string;
  model: GridModel;
  /** Peças por tamanho. */
  cells: Map<string, number>;
  /** Itens da fila em cada tamanho (para abrir o item certo). */
  cellJobs: Map<string, ProductionJob[]>;
  total: number;
  jobs: ProductionJob[];
  /** Nomes para bordar e observações do detalhe, sem repetição. */
  notes: string[];
  stages: Stage[];
};

export type GridOrder = {
  key: string;
  customer: string;
  references: string[];
  deadline: string | null;
  rows: GridRow[];
  sizes: string[];
  total: number;
  jobs: ProductionJob[];
};

const orderKey = (j: ProductionJob) => `${j.source}:${j.source_id ?? j.id}`;

/** Ordem de tamanhos de confecção: infantil M0–M4, adulto A0–A6, letras, metros, o resto e "sem tamanho". */
export function sizeRank(size: string): [number, number, string] {
  if (size === NO_SIZE) return [9, 0, size];
  const lettered = /^([A-Z])(\d{1,2})$/.exec(size);
  if (lettered) {
    const group = { M: 0, F: 0, K: 0, P: 0, A: 1 }[lettered[1]] ?? 4;
    return [group, Number(lettered[2]), size];
  }
  const apparel = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG"].indexOf(size);
  if (apparel >= 0) return [2, apparel, size];
  const meters = /^(\d+(?:,\d+)?)m$/.exec(size);
  if (meters) return [3, Number(meters[1].replace(",", ".")), size];
  if (size === "Único") return [5, 0, size];
  return [4, 0, size];
}

export function sortSizes(sizes: Iterable<string>): string[] {
  return [...new Set(sizes)].sort((a, b) => {
    const ra = sizeRank(a);
    const rb = sizeRank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2].localeCompare(rb[2], "pt-BR");
  });
}

function buildRows(jobs: ProductionJob[]): GridRow[] {
  const rows = new Map<string, GridRow>();
  for (const j of jobs) {
    const model = jobModel(j);
    const row =
      rows.get(model.key) ??
      ({
        key: model.key,
        model,
        cells: new Map(),
        cellJobs: new Map(),
        total: 0,
        jobs: [],
        notes: [],
        stages: [],
      } as GridRow);
    for (const [size, n] of jobSizes(j)) {
      row.cells.set(size, (row.cells.get(size) ?? 0) + n);
      row.cellJobs.set(size, [...(row.cellJobs.get(size) ?? []), j]);
      row.total += n;
    }
    row.jobs.push(j);
    const emb = j.custom_config?.embroidery_name;
    for (const note of [typeof emb === "string" ? emb.trim() : null, variantNote(j)]) {
      if (note && !row.notes.includes(note)) row.notes.push(note);
    }
    if (!row.stages.includes(j.stage)) row.stages.push(j.stage);
    rows.set(model.key, row);
  }
  return [...rows.values()].map((r) => ({
    ...r,
    stages: [...r.stages].sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b)),
  }));
}

const BELT_ORDER = [
  "branca",
  "cinza",
  "amarela",
  "laranja",
  "verde",
  "azul_clara",
  "azul",
  "azul_escura",
  "roxa",
  "marrom",
  "bordo",
  "vermelha",
  "preta",
];

function sortBeltRows(rows: GridRow[]): GridRow[] {
  return rows.sort((a, b) => {
    const ba = a.model.belt;
    const bb = b.model.belt;
    if (!!ba !== !!bb) return ba ? -1 : 1;
    if (ba && bb) {
      const d =
        ["bjj", "judo", "outra"].indexOf(ba.discipline) -
        ["bjj", "judo", "outra"].indexOf(bb.discipline);
      if (d) return d;
      const ci = (c: string | null) => (c ? BELT_ORDER.indexOf(c) : 99);
      if (ci(ba.color) !== ci(bb.color)) return ci(ba.color) - ci(bb.color);
    }
    return a.model.label.localeCompare(b.model.label, "pt-BR");
  });
}

/** Uma tabela por pedido, na ordem em que os pedidos aparecem na fila (prioridade). */
export function gridByOrder(jobs: ProductionJob[]): GridOrder[] {
  const orders = new Map<string, ProductionJob[]>();
  for (const j of jobs) orders.set(orderKey(j), [...(orders.get(orderKey(j)) ?? []), j]);
  return [...orders.entries()].map(([key, list]) => {
    const rows = sortBeltRows(buildRows(list));
    const deadlines = list
      .map((j) => j.deadline)
      .filter(Boolean)
      .sort() as string[];
    return {
      key,
      customer: list[0].customer_name ?? "Sem cliente",
      references: [...new Set(list.map((j) => j.reference).filter(Boolean))] as string[],
      deadline: deadlines[0] ?? null,
      rows,
      sizes: sortSizes(rows.flatMap((r) => [...r.cells.keys()])),
      total: rows.reduce((a, r) => a + r.total, 0),
      jobs: list,
    };
  });
}

/** Tudo somado (para corte e separação): uma linha por modelo, com quantos pedidos levam cada um. */
export function gridConsolidated(jobs: ProductionJob[]) {
  const rows = sortBeltRows(buildRows(jobs));
  return {
    rows,
    sizes: sortSizes(rows.flatMap((r) => [...r.cells.keys()])),
    total: rows.reduce((a, r) => a + r.total, 0),
    ordersOf: (r: GridRow) => new Set(r.jobs.map(orderKey)).size,
  };
}

/** Planilha para abrir no Excel (separador ";" e BOM, padrão pt-BR). */
export function gridCsv(orders: GridOrder[]): string {
  const sizes = sortSizes(orders.flatMap((o) => o.sizes));
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    ["Pedido", "Cliente", "Prazo", "Produto", "Detalhes", ...sizes, "Total"].map(esc).join(";"),
  ];
  for (const o of orders) {
    for (const r of o.rows) {
      lines.push(
        [
          o.references.join(", "),
          o.customer,
          o.deadline ? o.deadline.split("-").reverse().join("/") : "",
          r.model.label,
          [r.model.sub, ...r.notes].filter(Boolean).join(" · "),
          ...sizes.map((s) => r.cells.get(s) ?? ""),
          r.total,
        ]
          .map(esc)
          .join(";"),
      );
    }
  }
  // BOM: o Excel abre a planilha com acentos.
  return String.fromCharCode(0xfeff) + lines.join("\r\n");
}
