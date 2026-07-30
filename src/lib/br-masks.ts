/**
 * Máscaras e formatadores brasileiros (camada de apresentação).
 *
 * Todos recebem o texto digitado e devolvem o valor já formatado,
 * limitando a quantidade de dígitos. Nenhuma regra de negócio aqui.
 */

export const onlyDigits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** CPF → XXX.XXX.XXX-XX */
export function maskCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CEP → XXXXX-XXX */
export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Telefone/celular → (XX)XXXX-XXXX ou (XX)XXXXX-XXXX */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd})${rest}`;
  if (rest.length <= 8) return `(${ddd})${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd})${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Dia de vencimento → texto de 1 a 31 (permite vazio durante a digitação). */
export function maskDueDay(value: string): string {
  const d = onlyDigits(value).slice(0, 2);
  if (!d) return "";
  const n = Number(d);
  if (n > 31) return "31";
  return d;
}

/** Normaliza o dia de vencimento para um número válido entre 1 e 31. */
export function clampDueDay(value: string | number, fallback = 5): number {
  const n = Number(onlyDigits(String(value)));
  if (!n) return fallback;
  return Math.max(1, Math.min(31, n));
}

export const isValidCPF = (value: string) => onlyDigits(value).length === 11;
export const isValidCEP = (value: string) => onlyDigits(value).length === 8;
export const isValidPhone = (value: string) => {
  const len = onlyDigits(value).length;
  return len === 10 || len === 11;
};

/**
 * Converte um valor monetário digitado em português (ex.: "150,50", "R$ 1.200,00",
 * "150.50") para número. Retorna `null` quando não há valor informado.
 *
 * Motivo: o usuário costuma digitar vírgula como separador decimal; `Number("150,50")`
 * resulta em NaN e o valor customizado acabava sendo ignorado silenciosamente.
 */
export function parseAmountBR(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = value.trim();
  if (!raw) return null;
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // O separador decimal é o que aparece por último; o outro é separador de milhar.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
