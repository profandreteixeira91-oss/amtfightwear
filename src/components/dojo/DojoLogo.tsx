import logoAsset from "@/assets/amt-dojo-manager-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface DojoLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Marca oficial do AMT Dojo Manager — imagem única servida pelo CDN.
 * Use `className` para controlar o tamanho (ex.: h-12 w-auto).
 */
export function DojoLogo({ className, alt = "AMT Dojo Manager" }: DojoLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={cn("h-10 w-auto select-none", className)}
      draggable={false}
      loading="eager"
      decoding="async"
    />
  );
}
