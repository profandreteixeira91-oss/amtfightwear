// Helpers para exibir grau/Dan de acordo com a modalidade.
// Judô usa "Dan"; demais modalidades usam "grau".
//
// O prefixo do nome da faixa ("Faixa" ou "Grau") vem, em ordem:
//   1) do próprio `name` (se já começar com "Faixa "/"Grau ");
//   2) do registry sincronizado com o Belt Studio (`belt-terms`);
//   3) do fallback por modalidade (Muay Thai => "Grau", outros => "Faixa").
// Assim, renomear as faixas no Belt Studio propaga o termo em todo o sistema.

import { getModalityTerm } from "@/lib/dojo/belt-terms";

export function isJudoModality(modality?: string | null): boolean {
  const m = (modality ?? "").toString().toLowerCase().trim();
  return m === "judo" || m === "judô" || m.startsWith("judo") || m.startsWith("judô");
}

export function isMuayThaiModality(modality?: string | null): boolean {
  const m = (modality ?? "").toString().toLowerCase().trim();
  return m.includes("muay");
}

export function isJiuJitsuModality(modality?: string | null): boolean {
  const m = (modality ?? "jiu-jitsu").toString().toLowerCase().replace(/[^a-z]/g, "");
  return m === "" || m === "jiujitsu" || m === "bjj";
}

/** True when the belt is the consolidated BJJ black belt row ("Preta" — jiu-jitsu). */
export function isBjjBlackBelt(name?: string | null, modality?: string | null): boolean {
  const n = (name ?? "").trim();
  return isJiuJitsuModality(modality) && /^preta$/i.test(n);
}

/**
 * Encoding of the BJJ black-belt "degree" field into a human variant label.
 *   0 → "" (Preta base)
 *   1 → "com aparador"
 *   2..7 → "1º grau"..."6º grau"
 */
export function formatBjjPretaVariant(degree: number | null | undefined): string {
  const d = Number(degree ?? 0);
  if (d <= 0) return "";
  if (d === 1) return "com aparador";
  if (d >= 2 && d <= 7) return `${d - 1}º grau`;
  return "";
}

export function degreeUnit(modality?: string | null): "Dan" | "grau" {
  return isJudoModality(modality) ? "Dan" : "grau";
}

/** Prefixo do nome da faixa conforme modalidade.
 *  Prioridade: registry do Belt Studio > Muay Thai ("Grau") > default ("Faixa"). */
export function beltNamePrefix(modality?: string | null): "Grau" | "Faixa" {
  const override = getModalityTerm(modality);
  if (override) return override;
  return isMuayThaiModality(modality) ? "Grau" : "Faixa";
}

/** Nome completo formatado: "Faixa Roxa" ou "Grau Verde". */
export function formatBeltName(name: string | null | undefined, modality?: string | null): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  const lower = n.toLowerCase();
  if (lower.startsWith("faixa ") || lower.startsWith("grau ")) return n;
  return `${beltNamePrefix(modality)} ${n}`;
}

/**
 * Rótulo do grau conforme modalidade.
 * - BJJ + belt "Preta"  => "Com aparador" / "1º grau" / ... / "Sem grau"
 * - Judô + degree > 0   => "3º Dan"
 * - Outros + degree > 0 => "3º grau"
 * - degree = 0/null     => "Sem grau" (ou "Sem Dan" para judô)
 */
export function formatDegree(
  degree: number | null | undefined,
  modality?: string | null,
  name?: string | null,
): string {
  const d = Number(degree ?? 0);
  if (isBjjBlackBelt(name, modality)) {
    if (!d || d <= 0) return "Sem grau";
    if (d === 1) return "Com aparador";
    return `${d - 1}º grau`;
  }
  const unit = degreeUnit(modality);
  if (!d || d <= 0) return unit === "Dan" ? "Sem Dan" : "Sem grau";
  return `${d}º ${unit}`;
}

/**
 * Sufixo pronto para concatenar em labels de faixa.
 * - BJJ + Preta   => " com aparador" / " · 1º grau" / ...
 * - degree > 0    => " · 3º Dan"
 * - degree = 0    => "" (nada)
 */
export function degreeSuffix(
  degree: number | null | undefined,
  modality?: string | null,
  separator: string = " · ",
  name?: string | null,
): string {
  const d = Number(degree ?? 0);
  if (isBjjBlackBelt(name, modality)) {
    if (!d || d <= 0) return "";
    if (d === 1) return ` com aparador`;
    return `${separator}${d - 1}º grau`;
  }
  if (!d || d <= 0) return "";
  return `${separator}${d}º ${degreeUnit(modality)}`;
}

/** Rótulo completo pronto para exibição: "Faixa Preta com aparador", "Faixa Roxa · 2º grau". */
export function formatBeltFull(
  name: string | null | undefined,
  modality?: string | null,
  degree?: number | null,
): string {
  const base = formatBeltName(name, modality);
  if (!base) return "";
  return `${base}${degreeSuffix(degree, modality, " · ", name)}`;
}
