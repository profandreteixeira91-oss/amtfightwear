// Exibição de nomes de produto: o catálogo guarda nomes em CAIXA ALTA (padrão de
// cadastro/NF-e); na loja eles aparecem em "Title Case", mais legível.
// Ex.: "FAIXA JIU-JITSU AZUL BORDADA PERSONALIZADA - LINHA TRAINING"
//    → "Faixa Jiu-Jitsu Azul Bordada Personalizada - Linha Training"

const KEEP_UPPER = new Set(["BJJ", "JJ", "AMT", "PIX", "MMA", "UFC", "XG", "XXG", "GG", "EG", "PP"]);
const LOWER_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "em", "a", "o"]);

function isMostlyUpper(text: string): boolean {
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  return upper / letters.length > 0.8;
}

function formatWord(word: string, index: number): string {
  if (KEEP_UPPER.has(word)) return word;
  // tamanhos (A0–A5, M0–M4) e medidas (15X15CM) ficam como estão
  if (/^[AM]\d$/.test(word)) return word;
  if (/^\d+X\d+CM$/.test(word)) return word.toLowerCase();
  const lower = word.toLocaleLowerCase("pt-BR");
  if (index > 0 && LOWER_WORDS.has(lower)) return lower;
  return lower.replace(/(^|-)(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("pt-BR"));
}

export function formatProductName(name: string | null | undefined): string {
  if (!name) return "";
  if (!isMostlyUpper(name)) return name;
  return name
    .split(/(\s+)/)
    .map((part, i, arr) => (/\s+/.test(part) ? part : formatWord(part, arr.slice(0, i).filter((p) => !/\s+/.test(p)).length)))
    .join("");
}
