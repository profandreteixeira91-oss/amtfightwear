// Regras de idade para faixas de Jiu-Jitsu.
// - Alunos com idade < 15 anos: somente faixas infantis (cinza/amarela/laranja/verde e variantes).
// - Alunos com idade ≥ 15 anos: somente faixas adultas (branca, azul, roxa, marrom, preta).
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
    "Branca",
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

const KIDS_SEQUENCE = [
  "Branca",
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
].map(canonicalize);

const ADULT_SEQUENCE = [
  "Branca",
  "Azul",
  "Roxa",
  "Marrom",
  "Preta",
  "Vermelha e Preta",
  "Vermelha e Branca",
  "Vermelha",
].map(canonicalize);

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
  if (age < 15) return "kids";
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
  const category = modality === "jiu-jitsu" ? ageCategory(age) : "any";
  const sequence = category === "kids"
    ? KIDS_SEQUENCE
    : category === "adult"
      ? ADULT_SEQUENCE
      : null;
  const sequenceIndex = (belt: { name: string; sort_order?: number | null }) => {
    const index = sequence?.indexOf(canonicalize(belt.name)) ?? -1;
    return index >= 0 ? index : (sequence?.length ?? 0) + (belt.sort_order ?? 0);
  };
  const inModality = belts
    .filter((b) => (b.modality ?? "jiu-jitsu") === modality)
    .filter((b) => isBeltAllowedForAge(b, age))
    .slice()
    .sort((a, b) => sequenceIndex(a) - sequenceIndex(b));
  if (inModality.length === 0) return null;

  if (!current || !current.belt) {
    const first = inModality[0];
    return { beltId: first.id, degree: 0 };
  }

  const currentDeg = current.degree ?? 0;
  const currentCanonical = canonicalize(current.belt.name);
  const currentInAllowed = inModality.find((b) =>
    b.id === current.belt.id || canonicalize(b.name) === currentCanonical,
  );

  // Lógica de transição automática de branca para cinza desabilitada para permitir graus na branca
  /*
  if (category === "kids" && currentCanonical === canonicalize("Branca")) {
    const firstKidsBelt = inModality[0];
    return { beltId: firstKidsBelt.id, degree: 0 };
  }
  */

  // O limite cadastrado na faixa carregada da lista é a fonte principal.
  // O objeto da graduação atual pode ser antigo/incompleto, então só o usamos
  // como fallback. Para as faixas regulares do Jiu-Jitsu, o padrão é 4 graus.
  const defaultMaxDegrees = modality === "jiu-jitsu" && (KIDS_CANON.has(currentCanonical) || ADULT_CANON.has(currentCanonical))
    ? 4
    : 0;
  const maxDeg = currentInAllowed?.max_degrees ?? current.belt.max_degrees ?? defaultMaxDegrees;

  // Enquanto não chegou ao último grau, mantém a faixa e soma exatamente um grau.
  if (currentInAllowed && maxDeg > 0 && currentDeg < maxDeg) {
    return { beltId: currentInAllowed.id, degree: currentDeg + 1 };
  }

  // Ao concluir o último grau, avança para a próxima faixa da sequência etária.
  if (currentInAllowed) {
    const currentIndex = inModality.findIndex((b) => b.id === currentInAllowed.id);
    const nextBelt = inModality[currentIndex + 1];
    return nextBelt ? { beltId: nextBelt.id, degree: 0 } : null;
  }

  // Faixa atual não pertence à sequência permitida para a idade: começa na
  // primeira faixa correta da categoria (por exemplo, branca → cinza/branca).
  return { beltId: inModality[0].id, degree: 0 };
}
