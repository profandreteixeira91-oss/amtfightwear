import type { ReactNode } from "react";

type Props = {
  src: string;
  alt: string;
  caption?: ReactNode;
  /** Zoom aplicado apenas no mobile para deixar a tela legível. */
  zoom?: "lg" | "md";
  className?: string;
};

/**
 * Frame de captura real do sistema.
 * No mobile a imagem é ampliada e recebe rolagem horizontal interna
 * (nunca causa overflow da página), garantindo textos legíveis.
 */
export function ShotFrame({ src, alt, caption, zoom = "lg", className = "" }: Props) {
  const zoomClass = zoom === "lg" ? "w-[200%] sm:w-[150%]" : "w-[160%] sm:w-[130%]";
  return (
    <figure className={`min-w-0 ${className}`}>
      <div className="relative min-w-0 overflow-x-auto overscroll-x-contain bg-neutral-100 md:overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-auto max-w-none ${zoomClass} md:w-full`}
        />
      </div>
      {caption && (
        <figcaption className="min-w-0 break-words px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#111111]/45 sm:px-6 sm:text-xs">
          {caption}
          <span className="ml-1 normal-case tracking-normal text-[#111111]/35 md:hidden">
            · arraste para ver a tela completa
          </span>
        </figcaption>
      )}
    </figure>
  );
}
