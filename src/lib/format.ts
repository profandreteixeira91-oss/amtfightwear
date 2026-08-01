export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const intFmt = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n || 0);

export const pct = (n: number, digits = 1) =>
  `${(n || 0).toFixed(digits)}%`;

/**
 * Datas: delegam para o módulo canônico `@/lib/dates` (fuso do Brasil,
 * sem deslocamento de dia). Mantidos aqui por compatibilidade de imports.
 */
export { brDate, todayISO, dayISO, addDaysISO, diffDaysISO } from "@/lib/dates";
