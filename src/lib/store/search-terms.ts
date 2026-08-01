/**
 * Expansão de termos de busca da loja: corrige erros comuns de digitação
 * (inclusive falta de acento) e adiciona sinônimos do universo das artes
 * marciais, aumentando a chance de o cliente encontrar o produto.
 */

/** Remove acentos e normaliza para minúsculas. */
export function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Correções de digitação frequentes (chave normalizada → termo correto). */
const TYPOS: Record<string, string> = {
  kimomo: "kimono",
  quimono: "kimono",
  kimonu: "kimono",
  kmono: "kimono",
  gimono: "kimono",
  faicha: "faixa",
  faxa: "faixa",
  faisha: "faixa",
  rashgard: "rashguard",
  rashguar: "rashguard",
  rachguard: "rashguard",
  raxguard: "rashguard",
  jiujitsu: "jiu-jitsu",
  jiujitso: "jiu-jitsu",
  jitsu: "jiu-jitsu",
  jujitsu: "jiu-jitsu",
  bjj: "jiu-jitsu",
  judo: "judô",
  jodo: "judô",
  muaythai: "muay thai",
  muai: "muay",
  tailandes: "muay thai",
  boxi: "boxe",
  bermuda: "shorts",
  short: "shorts",
  camizeta: "camiseta",
  camisa: "camiseta",
  luva: "luvas",
  protetor: "protetores",
  infantil: "infantil",
  kids: "infantil",
};

/** Sinônimos: termo normalizado → termos adicionais a pesquisar. */
const SYNONYMS: Record<string, string[]> = {
  kimono: ["gi", "quimono"],
  gi: ["kimono"],
  faixa: ["belt", "cinturão"],
  "jiu-jitsu": ["bjj", "jiujitsu"],
  judô: ["judo"],
  "muay thai": ["thai", "muay"],
  shorts: ["bermuda", "short"],
  camiseta: ["t-shirt", "camisa"],
  rashguard: ["rash guard", "manga longa"],
  luvas: ["luva", "glove"],
  infantil: ["kids", "criança", "juvenil"],
  feminino: ["feminina", "mulher"],
  masculino: ["masculina", "homem"],
  preta: ["preto", "black"],
  branca: ["branco", "white"],
  azul: ["blue"],
  vermelha: ["vermelho", "red"],
};

/**
 * Recebe o texto digitado e devolve a lista de palavras a pesquisar
 * (originais + corrigidas + sinônimos), sem duplicatas.
 */
export function expandSearchTerms(input: string): string[] {
  const base = normalizeTerm(input);
  if (!base) return [];

  const words = base.split(/[\s,]+/).filter((w) => w.length >= 2);
  const out = new Set<string>();

  // Expressão completa (ex.: "muay thai") também vale como termo.
  if (words.length > 1) out.add(base);

  for (const word of words) {
    const corrected = TYPOS[word] ?? word;
    out.add(word);
    out.add(corrected);
    for (const syn of SYNONYMS[corrected] ?? []) out.add(normalizeTerm(syn));
  }

  // Plural/singular simples em português.
  for (const w of Array.from(out)) {
    if (w.length > 4 && w.endsWith("s")) out.add(w.slice(0, -1));
    else if (w.length > 3) out.add(`${w}s`);
  }

  return Array.from(out).filter((w) => w.length >= 2).slice(0, 24);
}
