// Helpers para exibir grau/Dan de acordo com a modalidade.
// Judô usa "Dan"; demais modalidades usam "grau".

export function isJudoModality(modality?: string | null): boolean {
  const m = (modality ?? "").toString().toLowerCase().trim();
  return m === "judo" || m === "judô" || m.startsWith("judo") || m.startsWith("judô");
}

export function degreeUnit(modality?: string | null): "Dan" | "grau" {
  return isJudoModality(modality) ? "Dan" : "grau";
}

/**
 * Rótulo do grau conforme modalidade.
 * - Judô + degree > 0  => "3º Dan"
 * - Outros + degree > 0 => "3º grau"
 * - degree = 0/null    => "Sem grau" (ou "Sem Dan" para judô)
 */
export function formatDegree(
  degree: number | null | undefined,
  modality?: string | null,
): string {
  const d = Number(degree ?? 0);
  const unit = degreeUnit(modality);
  if (!d || d <= 0) return unit === "Dan" ? "Sem Dan" : "Sem grau";
  return `${d}º ${unit}`;
}

/**
 * Sufixo pronto para concatenar em labels de faixa.
 * - degree > 0  => " · 3º Dan"  (com separador)
 * - degree = 0  => "" (nada)
 */
export function degreeSuffix(
  degree: number | null | undefined,
  modality?: string | null,
  separator: string = " · ",
): string {
  const d = Number(degree ?? 0);
  if (!d || d <= 0) return "";
  return `${separator}${d}º ${degreeUnit(modality)}`;
}
