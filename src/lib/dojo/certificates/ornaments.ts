/** Curated SVG ornaments & icons for the certificate studio.
 * Each entry returns an SVG string with a single `currentColor` fill/stroke
 * so it can be tinted via the `color` argument, then encoded as a data URL
 * and inserted as an ImageElement.
 */

export type SvgAsset = {
  id: string;
  label: string;
  category: "ornament" | "icon" | "divider" | "frame";
  svg: (color: string) => string;
};

const wrap = (viewBox: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const filled = (viewBox: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${body}</svg>`;

export const ORNAMENTS: SvgAsset[] = [
  // Icons
  { id: "star", label: "Estrela", category: "icon", svg: () => filled("0 0 24 24", `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>`) },
  { id: "trophy", label: "Troféu", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 5h12v6a6 6 0 0 1-12 0V5z"/><path d="M9 20h6"/><path d="M12 15v5"/>`) },
  { id: "medal", label: "Medalha", category: "icon", svg: () => wrap("0 0 24 24", `<circle cx="12" cy="15" r="6"/><path d="M8 4l4 7 4-7"/><path d="M5 4h14"/>`) },
  { id: "shield", label: "Escudo", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/>`) },
  { id: "crown", label: "Coroa", category: "icon", svg: () => filled("0 0 24 24", `<path d="M2 7l4 5 6-8 6 8 4-5v11H2z"/>`) },
  { id: "laurel", label: "Louros", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M6 3c0 6 3 11 6 15"/><path d="M18 3c0 6-3 11-6 15"/><path d="M4 7c1 1 3 1 4 0"/><path d="M4 12c1 1 3 1 4 0"/><path d="M20 7c-1 1-3 1-4 0"/><path d="M20 12c-1 1-3 1-4 0"/>`) },
  { id: "check", label: "Selo Aprovado", category: "icon", svg: () => wrap("0 0 24 24", `<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/>`) },
  { id: "sun", label: "Sol", category: "icon", svg: () => wrap("0 0 24 24", `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`) },
  { id: "flame", label: "Chama", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M12 22c4 0 7-3 7-7 0-4-4-6-4-10-2 1-4 4-4 7-1-1-2-2-2-4-2 2-4 4-4 7 0 4 3 7 7 7z"/>`) },
  { id: "book", label: "Livro", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>`) },
  { id: "diploma", label: "Pergaminho", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M4 4h14v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 8h8M8 12h8M8 16h5"/>`) },
  { id: "swords", label: "Espadas", category: "icon", svg: () => wrap("0 0 24 24", `<path d="M3 3l7 7-2 2-7-7z"/><path d="M21 3l-7 7 2 2 7-7z"/><path d="M10 12l4 4-4 4-4-4z"/><path d="M14 12l-4 4"/>`) },

  // Dividers
  { id: "divider-simple", label: "Divisor simples", category: "divider", svg: () => wrap("0 0 200 20", `<line x1="10" y1="10" x2="190" y2="10"/><circle cx="100" cy="10" r="3" fill="currentColor"/>`) },
  { id: "divider-fancy", label: "Divisor ornamental", category: "divider", svg: () => wrap("0 0 240 24", `<line x1="10" y1="12" x2="90" y2="12"/><line x1="150" y1="12" x2="230" y2="12"/><path d="M100 12c4-6 8-6 12 0s8 6 12 0" fill="none"/><circle cx="120" cy="12" r="2" fill="currentColor"/>`) },
  { id: "divider-double", label: "Divisor duplo", category: "divider", svg: () => wrap("0 0 240 24", `<line x1="10" y1="8" x2="230" y2="8"/><line x1="10" y1="16" x2="230" y2="16"/>`) },
  { id: "divider-diamond", label: "Divisor diamante", category: "divider", svg: () => wrap("0 0 240 24", `<line x1="10" y1="12" x2="110" y2="12"/><line x1="130" y1="12" x2="230" y2="12"/><path d="M120 4l8 8-8 8-8-8z" fill="currentColor" stroke="none"/>`) },

  // Frames / borders
  { id: "frame-classic", label: "Moldura clássica", category: "frame", svg: () => wrap("0 0 400 260", `<rect x="10" y="10" width="380" height="240"/><rect x="20" y="20" width="360" height="220"/>`) },
  { id: "frame-double", label: "Moldura dupla", category: "frame", svg: () => wrap("0 0 400 260", `<rect x="8" y="8" width="384" height="244" stroke-width="2"/><rect x="20" y="20" width="360" height="220" stroke-width="0.6"/>`) },
  { id: "frame-corner", label: "Cantos ornamentais", category: "frame", svg: () => wrap("0 0 400 260", `<path d="M10 40V10h30M370 10h30v30M400 220v30h-30M40 250H10v-30"/>`) },
  { id: "frame-vintage", label: "Moldura vintage", category: "frame", svg: () => wrap("0 0 400 260", `<rect x="12" y="12" width="376" height="236"/><path d="M12 40l28-28M388 40l-28-28M12 220l28 28M388 220l-28 28"/>`) },

  // Ornaments (flourishes)
  { id: "flourish-left", label: "Ornamento esquerda", category: "ornament", svg: () => wrap("0 0 200 40", `<path d="M10 20c30-20 60 20 90 0s60-20 90 0"/>`) },
  { id: "flourish-symmetric", label: "Ornamento simétrico", category: "ornament", svg: () => wrap("0 0 240 40", `<path d="M20 20c20-15 40-15 60 0s40 15 60 0 40-15 40-5"/><path d="M220 20c-20-15-40-15-60 0"/><circle cx="120" cy="20" r="3" fill="currentColor"/>`) },
  { id: "flourish-star-bar", label: "Barra com estrelas", category: "ornament", svg: () => wrap("0 0 240 30", `<line x1="10" y1="15" x2="90" y2="15"/><line x1="150" y1="15" x2="230" y2="15"/><path d="M120 5l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="currentColor" stroke="none"/>`) },
];

/** Convert an SVG string into a data URL that <img> can render, with the color baked in. */
export function svgToDataUrl(svgString: string, color: string): string {
  const colored = svgString.replace(/currentColor/g, color);
  const encoded = encodeURIComponent(colored).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

/** Suggested font pairings (title + body). */
export const FONT_PAIRINGS = [
  { id: "classic", label: "Clássico", title: "Cinzel", body: "Cormorant Garamond" },
  { id: "elegant", label: "Elegante", title: "Playfair Display", body: "Libre Baskerville" },
  { id: "romantic", label: "Romântico", title: "Great Vibes", body: "Cormorant Garamond" },
  { id: "modern", label: "Moderno", title: "Montserrat", body: "Inter" },
  { id: "editorial", label: "Editorial", title: "DM Serif Display", body: "Poppins" },
  { id: "bold", label: "Impacto", title: "Bebas Neue", body: "Inter" },
  { id: "handwritten", label: "Manuscrito", title: "Pinyon Script", body: "Merriweather" },
  { id: "sober", label: "Sóbrio", title: "Oswald", body: "Merriweather" },
] as const;
