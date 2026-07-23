// Regras de idade para faixas de Jiu-Jitsu.
// - Alunos com idade ≤ 15 anos: somente faixas infantis (cinza/amarela/laranja/verde e variantes).
// - Alunos com idade ≥ 16 anos: somente faixas adultas (branca, azul, roxa, marrom, preta).
// - Outras modalidades não são filtradas por idade.
// - Sem data de nascimento cadastrada: não filtra (mostra tudo).

function canonicalize(name: string): string {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcom\b|\be\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/[oa]$/, "");
}

const KIDS_CANON = new Set(
  [
    "Cinza com Branco",
    "Cinza",
    "Cinza com Preto",
    "Amarela com Branco",
    "Amarela",
    "Amarela com Preto",
    "Laranja com Branco",
    "Laranja",
    "Laranja com Preto",
    "Verde com Branco",
    "Verde",
    "Verde com Preto",
  ].map(canonicalize),
);

const ADULT_CANON = new Set(
  ["Branca", "Azul", "Roxa", "Marrom", "Preta"].map(canonicalize),
);

export type AgeCategory = "kids" | "adult" | "any";

export function computeAge(birthDate?: string | null, ref: Date = new Date()): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age -= 1;
  return age;
}

export function ageCategory(age: number | null): AgeCategory {
  if (age == null) return "any";
  if (age <= 15) return "kids";
  return "adult";
}

/**
 * Retorna true se a faixa é permitida para o aluno considerando idade.
 * Apenas a modalidade "jiu-jitsu" é filtrada. Faixas globais avançadas
 * (Vermelha e Preta / Vermelha e Branca / Vermelha) são consideradas adultas.
 */
export function isBeltAllowedForAge(belt: { name?: string; modality?: string | null }, age: number | null): boolean {
  const mod = (belt.modality ?? "jiu-jitsu").toString();
  if (mod !== "jiu-jitsu") return true;
  const cat = ageCategory(age);
  if (cat === "any") return true;
  const c = canonicalize(belt.name ?? "");
  // Faixas "vermelhas" (graduações avançadas de preta) são adultas.
  const isRed = /^vermelh/.test(c);
  if (cat === "kids") return KIDS_CANON.has(c);
  // adult
  return ADULT_CANON.has(c) || isRed;
}

export function filterBeltsByAge<T extends { name?: string; modality?: string | null }>(
  belts: T[],
  age: number | null,
): T[] {
  return belts.filter((b) => isBeltAllowedForAge(b, age));
}

/**
 * Sugere a próxima graduação para o aluno na modalidade indicada.
 * - Se a faixa atual ainda tem graus disponíveis, sugere mesma faixa com grau+1.
 * - Caso contrário, avança para a próxima faixa permitida (por sort_order).
 * - Sem faixa atual: primeira faixa permitida.
 * Retorna null quando não há sugestão possível.
 */
export function suggestNextBelt(params: {
  current: { belt: { id: string; name: string; modality?: string | null; max_degrees?: number | null }; degree?: number | null } | null;
  belts: Array<{ id: string; name: string; modality?: string | null; max_degrees?: number | null; sort_order?: number | null }>;
  modality: string;
  age: number | null;
}): { beltId: string; degree: number } | null {
  const { current, belts, modality, age } = params;
  const inModality = belts
    .filter((b) => (b.modality ?? "jiu-jitsu") === modality)
    .filter((b) => isBeltAllowedForAge(b, age))
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (inModality.length === 0) return null;

  if (!current || !current.belt) {
    const first = inModality[0];
    return { beltId: first.id, degree: 0 };
  }

  const currentDeg = current.degree ?? 0;
  const maxDeg = current.belt.max_degrees ?? 4;

  // Faixa atual ainda cabe na lista permitida? Se sim e tem grau disponível, avança grau.
  const currentInAllowed = inModality.find((b) => b.id === current.belt.id);
  if (currentInAllowed && currentDeg < maxDeg) {
    return { beltId: currentInAllowed.id, degree: currentDeg + 1 };
  }

  // Localiza a faixa atual entre TODAS as faixas da modalidade para achar a próxima por ordem.
  const allInMod = belts
    .filter((b) => (b.modality ?? "jiu-jitsu") === modality)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const idxAll = allInMod.findIndex((b) => b.id === current.belt.id);
  if (idxAll >= 0) {
    for (let i = idxAll + 1; i < allInMod.length; i++) {
      if (isBeltAllowedForAge(allInMod[i], age)) return { beltId: allInMod[i].id, degree: 0 };
    }
    // Sem próxima permitida — fica na atual sem novo grau.
    return null;
  }

  // Faixa atual não pertence à modalidade (não deveria acontecer) — primeira permitida.
  return { beltId: inModality[0].id, degree: 0 };
}
