/**
 * Fonte única de verdade para "o que conta como presença".
 *
 * Historicamente os check-ins entravam com status diferentes dependendo da
 * origem (`present` no lançamento manual/aula ministrada, `checked_in` no
 * app do aluno, QR fixo e retroativo). Isso gerava divergência entre os
 * números de check-ins exibidos em Performance, Ranking, Frequência e Metas.
 *
 * Agora todos os registros são gravados como `present`, e a leitura aceita
 * ambos os status para permanecer compatível com dados antigos.
 */
export const PRESENT_STATUSES = ["present", "checked_in"] as const;

export function isPresentStatus(status: unknown): boolean {
  return status == null || (PRESENT_STATUSES as readonly string[]).includes(String(status));
}

/**
 * Dia do check-in no fuso do Brasil (America/Sao_Paulo).
 * Usar `toISOString()` (UTC) jogava treinos noturnos para o dia seguinte,
 * desalinhando heatmap, dias distintos, sequência e distribuição semanal.
 */
export function localDayISO(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Dia da semana (0=domingo) considerando o fuso do Brasil. */
export function localWeekday(dayISO: string): number {
  const [y, m, d] = dayISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
