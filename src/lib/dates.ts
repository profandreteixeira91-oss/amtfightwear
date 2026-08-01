/**
 * Fonte ÚNICA de verdade para datas do sistema (Dojo Manager, Portal do Aluno,
 * cobranças, agenda, check-ins, relatórios e crons).
 *
 * Por que este arquivo existe:
 * - `new Date().toISOString().slice(0, 10)` devolve o dia em UTC. No servidor
 *   (que roda em UTC) e no Brasil (UTC-3) isso jogava datas para o dia
 *   ANTERIOR ou SEGUINTE — vencimentos com 1 dia de diferença, check-ins
 *   noturnos caindo no dia seguinte, agenda desalinhada.
 * - `new Date(y, m, d).toISOString()` sofre o mesmo problema, porque converte
 *   a meia-noite local para UTC.
 * - `new Date("2026-05-10")` é interpretado como meia-noite UTC; ao formatar
 *   com o fuso local o dia volta 1.
 *
 * Regra do sistema: toda data "de calendário" (vencimento, aula, graduação,
 * matrícula) é uma string `YYYY-MM-DD` tratada literalmente, sem fuso.
 * Todo timestamp (`created_at`, `checked_in_at`) é convertido para o dia
 * usando o fuso do Brasil.
 */

export const BR_TZ = "America/Sao_Paulo";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Monta `YYYY-MM-DD` a partir de ano/mês(1-12)/dia, normalizando overflow. */
export function ymd(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Dia (`YYYY-MM-DD`) de um timestamp/Date no fuso do Brasil.
 * Strings que já são datas de calendário são devolvidas intactas.
 */
export function dayISO(value: string | number | Date | null | undefined): string {
  if (value == null) return todayISO();
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
    return dayFormatter.format(parsed);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return todayISO();
  return dayFormatter.format(d);
}

/** Hoje (`YYYY-MM-DD`) no fuso do Brasil — vale no browser e no servidor. */
export function todayISO(): string {
  return dayFormatter.format(new Date());
}

/** Hora atual "HH:MM" no fuso do Brasil. */
export function nowTimeBR(): string {
  const parts = partsFormatter.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/** Converte `YYYY-MM-DD` num Date "âncora" (meio-dia UTC) livre de drift. */
export function isoToDate(iso: string): Date {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const fallback = new Date(iso);
    return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

/** Soma (ou subtrai) dias a uma data de calendário, sem drift de fuso. */
export function addDaysISO(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Soma meses preservando o dia quando possível (clampa em meses curtos). */
export function addMonthsISO(iso: string, months: number): string {
  const d = isoToDate(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 12));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  return ymd(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(day, lastDay));
}

/** Diferença em dias inteiros entre duas datas de calendário (b - a). */
export function diffDaysISO(a: string, b: string): number {
  return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000);
}

/** Primeiro dia do mês da data informada (default: hoje no Brasil). */
export function monthStartISO(iso: string = todayISO()): string {
  const d = isoToDate(iso);
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

/** Último dia do mês da data informada. */
export function monthEndISO(iso: string = todayISO()): string {
  const d = isoToDate(iso);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12));
  return ymd(last.getUTCFullYear(), last.getUTCMonth() + 1, last.getUTCDate());
}

/** Dia da semana (0=domingo) de uma data de calendário, sem drift. */
export function weekdayISO(iso: string): number {
  return isoToDate(iso).getUTCDay();
}

/** Segunda-feira da semana da data informada. */
export function weekStartISO(iso: string = todayISO()): string {
  const wd = weekdayISO(iso);
  return addDaysISO(iso, wd === 0 ? -6 : 1 - wd);
}

/** Lista de datas de `from` até `to` (inclusive). */
export function eachDayISO(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 3660) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
  }
  return out;
}

/** Formata `YYYY-MM-DD` (ou timestamp) como DD/MM/AAAA no padrão brasileiro. */
export function formatBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const iso = dayISO(value as string | Date);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
}

/** Data + hora no fuso do Brasil (DD/MM/AAAA HH:MM). */
export function formatBRDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR", {
    timeZone: BR_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Alias histórico usado em todo o app. */
export const brDate = formatBR;

/** ISO de uma Date construída com componentes LOCAIS (`new Date(y, m, d)`). */
export function calendarISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ISO de uma Date construída em UTC (`new Date(Date.UTC(...))`). */
export function utcCalendarISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
