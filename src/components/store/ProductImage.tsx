import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

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
 */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  aspect = "square",
  sizes,
}: ProductImageProps) {
  const aspectClass = aspect === "square" ? "aspect-square" : aspect === "video" ? "aspect-video" : "";

  return (
    <div className={cn("relative overflow-hidden bg-muted", aspectClass, className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error — fetchpriority is a valid attribute
          fetchpriority={priority ? "high" : "auto"}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageOff className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
