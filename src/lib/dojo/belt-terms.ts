/**
 * Registry síncrono do termo (Faixa/Grau) por modalidade.
 *
 * A fonte de verdade é o **Belt Studio**: se o usuário renomear as faixas
 * de uma modalidade para começar com "Grau " (ex.: "Grau Verde"), o
 * sistema inteiro passa a exibir "Grau" naquela modalidade — e o mesmo
 * vale para "Faixa". A varredura é feita ao carregar qualquer lista de
 * faixas (`syncBeltTerms`).
 *
 * O registry é síncrono para que os helpers em `degree-label.ts` continuem
 * puros (sem hooks / async). O valor é cacheado em localStorage para
 * sobreviver a reloads sem "flash" do termo antigo.
 */

export type BeltTerm = "Faixa" | "Grau";

type Registry = Record<string, BeltTerm>;

const LS_KEY = "amt.dojo.beltTerms.v1";
let memory: Registry = {};

// Hidrata a partir do localStorage no primeiro import (safe no SSR).
if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) memory = JSON.parse(raw) as Registry;
  } catch {
    memory = {};
  }
}

function normalizeModality(m?: string | null): string {
  return (m ?? "").toString().toLowerCase().trim();
}

/** Lê o termo customizado por modalidade (ou undefined se não houver). */
export function getModalityTerm(modality?: string | null): BeltTerm | undefined {
  const key = normalizeModality(modality);
  if (!key) return undefined;
  return memory[key];
}

/** Define manualmente o termo (útil no Belt Studio ao salvar). */
export function setModalityTerm(modality: string, term: BeltTerm): void {
  const key = normalizeModality(modality);
  if (!key) return;
  memory[key] = term;
  persist();
}

/**
 * Deriva o termo de uma modalidade a partir das faixas carregadas.
 * Regra: se ao menos uma faixa começa com "Grau " (case-insensitive)
 * e nenhuma começa com "Faixa ", o termo passa a ser "Grau"; e
 * vice-versa. Se ambos aparecem, vence a maioria; se empatar,
 * mantém-se o valor anterior (ou não escreve nada).
 */
export function syncBeltTerms(
  belts: Array<{ modality?: string | null; name?: string | null }> | null | undefined,
): void {
  if (!belts?.length) return;
  const counts: Record<string, { faixa: number; grau: number }> = {};
  for (const b of belts) {
    const key = normalizeModality(b.modality);
    if (!key) continue;
    const n = (b.name ?? "").trim().toLowerCase();
    if (!counts[key]) counts[key] = { faixa: 0, grau: 0 };
    if (n.startsWith("grau ")) counts[key].grau += 1;
    else if (n.startsWith("faixa ")) counts[key].faixa += 1;
  }
  let changed = false;
  for (const [key, c] of Object.entries(counts)) {
    let next: BeltTerm | undefined;
    if (c.grau > c.faixa) next = "Grau";
    else if (c.faixa > c.grau) next = "Faixa";
    else next = undefined; // empate — não decide
    if (next && memory[key] !== next) {
      memory[key] = next;
      changed = true;
    }
  }
  if (changed) persist();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(memory));
  } catch {
    /* ignore quota */
  }
}
