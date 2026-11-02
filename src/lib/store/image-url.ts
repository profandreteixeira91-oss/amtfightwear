// Imagens do Supabase Storage redimensionadas na borda (Image Transformations).
// As fotos originais do catálogo têm ~1,4 MB em média; uma miniatura de 480 px
// sai com ~20–40 KB. URLs fora do Storage público são devolvidas sem mudança.

const OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";
const DEFAULT_WIDTHS = [320, 480, 720, 960, 1280];

function isTransformable(src: string): boolean {
  return src.includes(".supabase.co" + OBJECT_PATH) && !/\.(svg|gif)(\?|$)/i.test(src);
}

export function storageImageUrl(src: string | null | undefined, width: number, quality = 75): string | null | undefined {
  if (!src || !isTransformable(src)) return src;
  const sep = src.includes("?") ? "&" : "?";
  // resize=contain mantém a proporção; só com width o Storage recorta e preserva a altura original.
  return `${src.replace(OBJECT_PATH, RENDER_PATH)}${sep}width=${width}&resize=contain&quality=${quality}`;
}

export function storageImageSrcSet(src: string | null | undefined, widths: number[] = DEFAULT_WIDTHS): string | undefined {
  if (!src || !isTransformable(src)) return undefined;
  return widths.map((w) => `${storageImageUrl(src, w)} ${w}w`).join(", ");
}
