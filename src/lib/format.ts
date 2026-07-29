export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const intFmt = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n || 0);

export const pct = (n: number, digits = 1) =>
  `${(n || 0).toFixed(digits)}%`;

/**
 * Formata datas no padrão brasileiro DD/MM/AAAA sem sofrer deslocamento de
 * fuso horário: datas ISO "YYYY-MM-DD" são lidas literalmente (nunca UTC).
 */
export const brDate = (v: string | Date | null | undefined) => {
  if (!v) return "—";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR");
};
