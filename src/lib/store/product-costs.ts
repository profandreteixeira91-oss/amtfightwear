/**
 * Formação de preço de um produto a partir do custo de produção (markup divisor).
 *
 * O custo de produção é a soma dos itens da ficha (tecido, mão de obra, aviamentos…),
 * cada um com sua perda. Os percentuais incidem sobre o PREÇO DE VENDA (imposto, taxa do
 * cartão, comissão, marketing, rateio das despesas fixas e o lucro desejado), por isso o
 * preço ideal é `custo / (1 - soma dos percentuais)` e não `custo × markup fixo`.
 *
 * Módulo puro (sem banco): usado pela tela /admin/produtos/custos e pelos testes.
 */

export const COST_ITEM_TYPES = [
  { value: "material", label: "Tecido / material" },
  { value: "labor", label: "Mão de obra / costura" },
  { value: "trim", label: "Aviamentos" },
  { value: "print", label: "Bordado / estampa" },
  { value: "packaging", label: "Embalagem" },
  { value: "other", label: "Outros" },
] as const;

export type CostItem = {
  name: string;
  type: string;
  quantity: number;
  unit_cost: number;
  waste_percent?: number | null;
};

/** Percentuais sobre o preço de venda. */
export type PricingPercents = {
  taxes: number;
  gateway: number;
  commission: number;
  marketing: number;
  reserve: number;
  profit: number;
};

export const PERCENT_FIELDS: { key: keyof PricingPercents; label: string; hint: string }[] = [
  { key: "taxes", label: "Impostos", hint: "Simples Nacional / DAS sobre a venda" },
  { key: "gateway", label: "Taxa de pagamento", hint: "Cartão, PIX, antecipação" },
  { key: "commission", label: "Comissão", hint: "Vendedor, representante, marketplace" },
  { key: "marketing", label: "Marketing", hint: "Anúncios e divulgação" },
  { key: "reserve", label: "Reserva / outros", hint: "Trocas, devoluções, imprevistos" },
  { key: "profit", label: "Lucro desejado", hint: "O que sobra limpo por venda" },
];

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export const round2 = (v: number) => Math.round(v * 100) / 100;

/** Custo de um item da ficha, já com a perda. */
export function itemTotal(item: CostItem): number {
  return n(item.quantity) * n(item.unit_cost) * (1 + n(item.waste_percent) / 100);
}

export function productionCost(items: CostItem[]): number {
  return items.reduce((acc, it) => acc + itemTotal(it), 0);
}

export function costByType(items: CostItem[]): { type: string; total: number }[] {
  const map = new Map<string, number>();
  for (const it of items) map.set(it.type, (map.get(it.type) ?? 0) + itemTotal(it));
  return [...map.entries()].map(([type, total]) => ({ type, total })).filter((r) => r.total > 0);
}

/** Percentual de despesas variáveis (tudo que não é lucro). */
export function variablePercent(p: PricingPercents): number {
  return n(p.taxes) + n(p.gateway) + n(p.commission) + n(p.marketing) + n(p.reserve);
}

/**
 * Preço que cobre custo + percentuais + lucro. `null` quando os percentuais somam 100% ou
 * mais (não existe preço que feche a conta).
 */
export function idealPrice(cost: number, p: PricingPercents, fixedPercent = 0): number | null {
  const divisor = 1 - (variablePercent(p) + n(fixedPercent) + n(p.profit)) / 100;
  if (divisor <= 0 || cost <= 0) return null;
  return cost / divisor;
}

/** Preço de equilíbrio: lucro zero, todas as despesas pagas. */
export function breakEvenPrice(cost: number, p: PricingPercents, fixedPercent = 0): number | null {
  const divisor = 1 - (variablePercent(p) + n(fixedPercent)) / 100;
  if (divisor <= 0 || cost <= 0) return null;
  return cost / divisor;
}

export type PriceAnalysis = {
  price: number;
  cost: number;
  variableCosts: number;
  fixedShare: number;
  /** Preço − custo − despesas variáveis (antes das despesas fixas). */
  contribution: number;
  profit: number;
  /** Lucro / preço, em %. */
  margin: number;
  /** Preço / custo de produção. */
  markup: number | null;
};

/** O que sobra de uma venda a um preço qualquer. */
export function analyzePrice(
  price: number,
  cost: number,
  p: PricingPercents,
  fixedPercent = 0,
): PriceAnalysis {
  const variableCosts = (price * variablePercent(p)) / 100;
  const fixedShare = (price * n(fixedPercent)) / 100;
  const contribution = price - cost - variableCosts;
  const profit = contribution - fixedShare;
  return {
    price,
    cost,
    variableCosts,
    fixedShare,
    contribution,
    profit,
    margin: price > 0 ? (profit / price) * 100 : 0,
    markup: cost > 0 ? price / cost : null,
  };
}

/** Arredonda para cima até o próximo final ,90 (ex.: 287,30 → 287,90; 287,95 → 288,90). */
export function roundToNinety(price: number): number {
  return round2(Math.ceil(price + 0.1) - 0.1);
}

/**
 * Percentual das despesas fixas sobre o faturamento: despesas fixas do mês divididas pelo
 * faturamento médio mensal. `null` sem faturamento (não dá para ratear).
 */
export function fixedExpensePercent(monthlyFixed: number, monthlyRevenue: number): number | null {
  if (!(monthlyRevenue > 0)) return null;
  return (n(monthlyFixed) / monthlyRevenue) * 100;
}

/** Converte o texto de um campo em número, aceitando vírgula decimal ("12,50"). */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(/\s/g, "");
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
}
