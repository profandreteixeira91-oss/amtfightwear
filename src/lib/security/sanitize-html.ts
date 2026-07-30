import DOMPurify from "dompurify";

/**
 * Sanitiza HTML antes de renderizar com dangerouslySetInnerHTML.
 *
 * - No browser usa DOMPurify (remove scripts, handlers inline, javascript: etc).
 * - No servidor (SSR) aplica uma remoção conservadora dos vetores perigosos,
 *   já que DOMPurify precisa de DOM.
 *
 * A formatação visual do conteúdo (tags de texto, tabelas, estilos) é
 * preservada — apenas conteúdo executável é removido.
 */
const SERVER_PATTERNS: Array<[RegExp, string]> = [
  [/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, ""],
  [/<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi, ""],
  [/<\s*object[\s\S]*?<\s*\/\s*object\s*>/gi, ""],
  [/<\s*embed[^>]*>/gi, ""],
  [/\son[a-z]+\s*=\s*"[^"]*"/gi, ""],
  [/\son[a-z]+\s*=\s*'[^']*'/gi, ""],
  [/\son[a-z]+\s*=\s*[^\s>]+/gi, ""],
  [/javascript\s*:/gi, ""],
];

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof document === "undefined") {
    return SERVER_PATTERNS.reduce((acc, [re, rep]) => acc.replace(re, rep), html);
  }
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true } });
}
