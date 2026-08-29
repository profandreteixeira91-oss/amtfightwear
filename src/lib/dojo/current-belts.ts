/**
 * Contrato único de leitura das faixas atuais de um aluno.
 *
 * Invariante do servidor: `current_belts` contém UMA entrada por modalidade em
 * que o aluno tem graduação OU está matriculado em turma. Quando existe turma
 * sem nenhuma graduação registrada (dojo novo, sem faixas cadastradas), a
 * entrada é emitida com `belt: null` — comportamento legítimo do domínio.
 *
 * Regra de blindagem: nenhuma tela deve acessar `entry.belt.x` diretamente.
 * Use `rankedBelts()` quando precisar de faixa real, `currentBeltEntries()`
 * quando precisar de todas as modalidades, e `beltLabel()` para exibição.
 */

import type { BeltSpec } from "@/components/dojo/BeltSpecVisual";
import { formatBeltFull } from "@/lib/dojo/degree-label";

export const UNRANKED_BELT_LABEL = "Sem faixa";

export type BeltRef = {
  id?: string;
  name?: string | null;
  color_hex?: string | null;
  stripe_hex?: string | null;
  max_degrees?: number | null;
  modality?: string | null;
  sort_order?: number | null;
  visual?: BeltSpec | null;
  variants?: Array<{
    id?: string;
    name?: string;
    degree: number;
    kind?: "degree" | "variant";
    visual?: BeltSpec | null;
  }> | null;
};

export type CurrentBeltEntry = {
  modality: string;
  belt: BeltRef | null;
  degree: number;
  graduation_date?: string | null;
  class_ids: string[];
};

/** True quando o objeto tem forma mínima de faixa utilizável na UI. */
export function isBeltRef(value: unknown): value is BeltRef {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toEntry(raw: unknown): CurrentBeltEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const belt = isBeltRef(r["belt"]) ? (r["belt"] as BeltRef) : null;
  const modality =
    (typeof r["modality"] === "string" && r["modality"]) ||
    (typeof belt?.modality === "string" && belt.modality) ||
    "jiu-jitsu";
  const classIds = Array.isArray(r["class_ids"])
    ? (r["class_ids"] as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const degreeRaw = Number(r["degree"] ?? 0);
  return {
    modality,
    belt,
    degree: Number.isFinite(degreeRaw) ? degreeRaw : 0,
    graduation_date: typeof r["graduation_date"] === "string" ? r["graduation_date"] : null,
    class_ids: classIds,
  };
}

/**
 * Normaliza qualquer payload em entradas bem formadas. Nunca lança e nunca
 * devolve `undefined`/`null` dentro do array.
 */
export function normalizeCurrentBelts(raw: unknown): CurrentBeltEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toEntry).filter((e): e is CurrentBeltEntry => e !== null);
}

type StudentLike = {
  current_belts?: unknown;
  belt?: unknown;
  current_degree?: number | null;
};

/**
 * Todas as modalidades do aluno (inclui as sem graduação, com `belt: null`).
 * Faz fallback para a faixa desnormalizada `student.belt` quando o servidor
 * não anexou `current_belts` (rotas legadas).
 */
export function currentBeltEntries(student: StudentLike | null | undefined): CurrentBeltEntry[] {
  if (!student) return [];
  const list = normalizeCurrentBelts(student.current_belts);
  if (list.length > 0) return list;
  const belt = isBeltRef(student.belt) ? (student.belt as BeltRef) : null;
  if (!belt) return [];
  const degree = Number(student.current_degree ?? 0);
  return [
    {
      modality: typeof belt.modality === "string" ? belt.modality : "jiu-jitsu",
      belt,
      degree: Number.isFinite(degree) ? degree : 0,
      graduation_date: null,
      class_ids: [],
    },
  ];
}

/** Somente modalidades com faixa real — seguro para acessar `entry.belt`. */
export function rankedBelts(
  student: StudentLike | null | undefined,
): Array<CurrentBeltEntry & { belt: BeltRef }> {
  return currentBeltEntries(student).filter(
    (e): e is CurrentBeltEntry & { belt: BeltRef } => e.belt !== null,
  );
}

/** Rótulo pronto para exibição, com fallback "Sem faixa". */
export function beltLabel(entry: Pick<CurrentBeltEntry, "belt" | "degree" | "modality"> | null | undefined): string {
  const name = entry?.belt?.name ?? null;
  if (!name) return UNRANKED_BELT_LABEL;
  return formatBeltFull(name, entry?.belt?.modality ?? entry?.modality, entry?.degree ?? 0) || UNRANKED_BELT_LABEL;
}

/** Chave estável de render (evita `key={index}` e colisões com faixa nula). */
export function beltEntryKey(entry: CurrentBeltEntry, index: number): string {
  return `${entry.belt?.id ?? "sem-faixa"}-${entry.modality}-${index}`;
}
