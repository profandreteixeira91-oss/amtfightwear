import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";
import { storageImageSrcSet, storageImageUrl } from "@/lib/store/image-url";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  priority?: boolean;
  aspect?: "square" | "video" | "auto";
  sizes?: string;
}

/**
 * Otimização de imagens de produto:
 * - `loading="lazy"` por padrão (exceto priority).
 * - `decoding="async"` para não bloquear render.
 * - `fetchpriority="high"` na imagem LCP.
 * - Contêiner com `aspect-ratio` fixo — evita salto de layout.
 * - Fotos do Supabase Storage saem redimensionadas (srcset) em vez do original.
 */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  imgStyle,
  priority = false,
  aspect = "square",
  sizes,
}: ProductImageProps) {
  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "video" ? "aspect-video" : "";

  return (
    <div className={cn("relative overflow-hidden bg-muted", aspectClass, className)}>
      {src ? (
        <img
          src={storageImageUrl(src, 720) ?? undefined}
          srcSet={storageImageSrcSet(src)}
          alt={alt}
          sizes={sizes ?? "(max-width: 640px) 50vw, 25vw"}
          style={imgStyle}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={cn("h-full w-full object-contain p-2", imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageOff className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
