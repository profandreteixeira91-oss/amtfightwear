/**
 * Funções puras da Calculadora de Ticket Médio (ferramenta pública).
 * Sem efeitos colaterais, sem persistência. Valores em reais (number).
 */

/** Converte texto digitado (pt-BR ou ponto) em número ≥ 0; null se vazio/inválido. */
export function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export type CurrentInput = { revenue: number; students: number; expenses: number };
export type CurrentResult = {
  ticket: number;
  revenue: number;
  expenses: number;
  operatingResult: number;
  breakEvenPerStudent: number;
};

/** Parte A. Retorna null se alunos = 0 (sem divisão). */
export function calcCurrent(i: CurrentInput): CurrentResult | null {
  if (i.students <= 0) return null;
  return {
    ticket: round2(i.revenue / i.students),
    revenue: i.revenue,
    expenses: i.expenses,
    operatingResult: round2(i.revenue - i.expenses),
    breakEvenPerStudent: round2(i.expenses / i.students),
  };
}

export type IdealInput = {
  fixed: number;
  variable: number;
  profitGoal: number;
  feePercent: number;
  classesPerWeek: number;
  seatsPerClass: number;
  classesPerStudent: number;
  currentStudents: number;
};

export type IdealResult =
  | { ok: false; reason: "fee" | "frequency" | "capacity" }
  | {
      ok: true;
      capacity: number;
      projectedStudents: number;
      usesFullCapacity: boolean;
      exceedsCapacity: boolean;
      breakEvenRevenue: number;
      breakEvenTicket: number;
      requiredRevenue: number;
      idealTicket: number;
    };

/** Parte B. Capacidade = floor(aulas × vagas / frequência). */
export function calcIdeal(i: IdealInput): IdealResult {
  const fee = i.feePercent / 100;
  if (fee >= 1) return { ok: false, reason: "fee" };
  if (i.classesPerStudent <= 0) return { ok: false, reason: "frequency" };
  const capacity = Math.floor((i.classesPerWeek * i.seatsPerClass) / i.classesPerStudent);
  if (capacity <= 0) return { ok: false, reason: "capacity" };

  const current = Math.max(0, Math.floor(i.currentStudents));
  const usesFullCapacity = current === 0;
  const exceedsCapacity = current > capacity;
  const projectedStudents = usesFullCapacity ? capacity : Math.min(current, capacity);

  const costs = i.fixed + i.variable;
  const breakEvenRevenue = costs / (1 - fee);
  const requiredRevenue = (costs + i.profitGoal) / (1 - fee);
  return {
    ok: true,
    capacity,
    projectedStudents,
    usesFullCapacity,
    exceedsCapacity,
    breakEvenRevenue: round2(breakEvenRevenue),
    breakEvenTicket: round2(breakEvenRevenue / projectedStudents),
    requiredRevenue: round2(requiredRevenue),
    idealTicket: round2(requiredRevenue / projectedStudents),
  };
}
