/**
 * Fonte ÚNICA de verdade para janelas de período (ranking, performance,
 * frequência e relatórios do Dojo Manager / Portal do Aluno).
 *
 * Regras de negócio (fuso America/Sao_Paulo):
 * - all   → histórico completo (sem limite)
 * - year  → ano civil vigente: 01/01 00:00 até 01/01 do ano seguinte
 * - month → mês vigente: dia 01 00:00 até o 1º dia do mês seguinte
 * - week  → semana vigente iniciando no DOMINGO e terminando no SÁBADO
 *
 * As janelas são retornadas como instantes ISO (UTC) meio-abertos
 * `[since, until)` para uso direto em `.gte()` / `.lt()` no Supabase.
 */
import { addDaysISO, todayISO, weekdayISO, ymd, isoToDate } from "@/lib/dates";

export type RankingPeriod = "all" | "year" | "month" | "week";

/** Instante UTC correspondente à meia-noite (00:00) de um dia no Brasil. */
export function brDayStartInstant(iso: string): string {
  return new Date(`${iso}T00:00:00-03:00`).toISOString();
}

/** Domingo da semana da data informada (semana domingo → sábado). */
export function weekStartSundayISO(iso: string = todayISO()): string {
  return addDaysISO(iso, -weekdayISO(iso));
}

export interface PeriodRange {
  /** Início inclusivo (ISO UTC) ou null para histórico completo. */
  since: string | null;
  /** Fim exclusivo (ISO UTC) ou null para histórico completo. */
  until: string | null;
  /** Dia inicial de calendário (YYYY-MM-DD) ou null. */
  startDay: string | null;
  /** Último dia de calendário incluído (YYYY-MM-DD) ou null. */
  endDay: string | null;
}

/** Calcula a janela de calendário do período, no fuso do Brasil. */
export function resolvePeriodRange(
  period: RankingPeriod | undefined,
  reference: string = todayISO(),
): PeriodRange {
  if (!period || period === "all") {
    return { since: null, until: null, startDay: null, endDay: null };
  }

  const ref = isoToDate(reference);
  let startDay: string;
  let endExclusiveDay: string;

  if (period === "year") {
    startDay = ymd(ref.getUTCFullYear(), 1, 1);
    endExclusiveDay = ymd(ref.getUTCFullYear() + 1, 1, 1);
  } else if (period === "month") {
    startDay = ymd(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1);
    endExclusiveDay = ymd(ref.getUTCFullYear(), ref.getUTCMonth() + 2, 1);
  } else {
    startDay = weekStartSundayISO(reference);
    endExclusiveDay = addDaysISO(startDay, 7);
  }

  return {
    since: brDayStartInstant(startDay),
    until: brDayStartInstant(endExclusiveDay),
    startDay,
    endDay: addDaysISO(endExclusiveDay, -1),
  };
}

/** Rótulos exibidos na UI para cada período. */
export const PERIOD_LABELS: Record<RankingPeriod, string> = {
  all: "Histórico completo",
  year: "Ano vigente (01/01 a 31/12)",
  month: "Mês vigente (dia 01 ao último dia)",
  week: "Semana vigente (domingo a sábado)",
};

/**
 * Desloca a data de referência em N períodos (negativo = passado).
 * Usado pelos filtros de navegação de período no ranking.
 */
export function shiftPeriodReference(
  period: RankingPeriod,
  reference: string,
  delta: number,
): string {
  if (period === "all" || delta === 0) return reference;
  if (period === "week") return addDaysISO(reference, delta * 7);
  if (period === "month") {
    const d = isoToDate(reference);
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1 + delta, 1);
  }
  const d = isoToDate(reference);
  return ymd(d.getUTCFullYear() + delta, 1, 1);
}

const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function brShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Rótulo amigável da janela selecionada (ex.: "julho de 2026"). */
export function formatPeriodRangeLabel(period: RankingPeriod, reference: string): string {
  if (period === "all") return "Histórico completo";
  const range = resolvePeriodRange(period, reference);
  const d = isoToDate(reference);
  if (period === "year") return `Ano ${d.getUTCFullYear()}`;
  if (period === "month") return `${MONTHS_PT[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  return `${brShort(range.startDay!)} a ${brShort(range.endDay!)}`;
}
