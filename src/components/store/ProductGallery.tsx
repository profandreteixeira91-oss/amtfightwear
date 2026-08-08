import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Play, X, ZoomIn } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { cn } from "@/lib/utils";

export interface GalleryMedia {
  url: string;
  alt?: string | null;
  /** Quando presente, o item é tratado como vídeo (mp4/webm ou embed). */
  video_url?: string | null;
}

interface ProductGalleryProps {
  media: GalleryMedia[];
  name: string;
  className?: string;
  activeImageIndex?: number;
  onImageChange?: (index: number) => void;
}

/**
 * Galeria premium do produto: miniaturas, swipe no mobile, zoom com o mouse,
 * modo tela cheia, suporte a vídeo e navegação por teclado.
 */
export function ProductGallery({ 
  media, 
  name, 
  className, 
  activeImageIndex, 
  onImageChange 
}: ProductGalleryProps) {
  const items = media.length > 0 ? media : [];
  const [internalIndex, setInternalIndex] = useState(0);
  
  const index = activeImageIndex !== undefined ? activeImageIndex : internalIndex;
  const setIndex = (val: number | ((prev: number) => number)) => {
    const next = typeof val === "function" ? val(index) : val;
    if (onImageChange) onImageChange(next);
    else setInternalIndex(next);
  };
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const touchStart = useRef<number | null>(null);

  const total = items.length;
  const go = useCallback(
    (dir: 1 | -1) => {
      if (total < 2) return;
      setIndex((i) => (i + dir + total) % total);
      setZoom(false);
    },
    [total],
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, go]);

  if (total === 0) {
    return (
      <div className={cn("aspect-square rounded-2xl bg-muted", className)} aria-hidden />
    );
  }

  const active = items[Math.min(index, total - 1)];
  const isVideo = Boolean(active?.video_url);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="group relative overflow-hidden rounded-2xl bg-neutral-50 shadow-[var(--store-shadow-sm)] ring-1 ring-black/5"
        onMouseMove={handleMove}
        onMouseLeave={() => setZoom(false)}
        onTouchStart={(e) => { touchStart.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchStart.current = null;
          if (start === null || end === null) return;
          const delta = end - start;
          if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1);
        }}
      >
        {isVideo ? (
          <video
            src={active.video_url ?? undefined}
            poster={active.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-square w-full bg-black object-contain"
            aria-label={`Vídeo de ${name}`}
          />
        ) : (
          <button
            type="button"
            onClick={() => setZoom((z) => !z)}
            onDoubleClick={() => setFullscreen(true)}
            aria-label={zoom ? "Reduzir zoom da imagem" : "Ampliar imagem"}
            className="block w-full cursor-zoom-in"
          >
            <div className="overflow-hidden">
              <ProductImage
                src={active?.url}
                alt={active?.alt ?? name}
                aspect="square"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                imgClassName={cn(
                  "transition-transform duration-300 ease-out",
                  zoom ? "scale-[1.9]" : "scale-100",
                )}
                imgStyle={zoom ? { transformOrigin: origin } : undefined}
              />
            </div>
          </button>
        )}

        {/* Ações flutuantes */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label="Ver em tela cheia"
            className="grid h-10 w-10 min-h-11 min-w-11 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
          >
            <Expand className="h-4 w-4" />
          </button>
          {!isVideo && (
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              aria-label="Zoom na imagem"
              className={cn(
                "grid h-10 w-10 min-h-11 min-w-11 place-items-center rounded-full shadow-sm backdrop-blur transition active:scale-95",
                zoom ? "bg-primary text-primary-foreground" : "bg-white/90 text-foreground hover:bg-white",
              )}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-foreground shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-foreground shadow-sm backdrop-blur transition hover:bg-white active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
              {items.map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/25",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`Fotos de ${name}`}>
          {items.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              role="tab"
              aria-selected={i === index}
              aria-label={`Mídia ${i + 1} de ${total}`}
              onClick={() => { setIndex(i); setZoom(false); }}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition",
                i === index
                  ? "border-primary shadow-[var(--store-ring-ruby)]"
                  : "border-transparent hover:border-neutral-300",
              )}
            >
              <ProductImage src={img.url} alt="" aspect="square" />
              {img.video_url && (
                <span className="absolute inset-0 grid place-items-center bg-black/35 text-white">
                  <Play className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tela cheia */}
      {fullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de ${name}`}
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="Fechar galeria"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center px-4 pb-8"
            onTouchStart={(e) => { touchStart.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              const end = e.changedTouches[0]?.clientX ?? null;
              touchStart.current = null;
              if (start === null || end === null) return;
              if (Math.abs(end - start) > 45) go(end - start < 0 ? 1 : -1);
            }}
          >
            {isVideo ? (
              <video src={active.video_url ?? undefined} controls autoPlay playsInline className="max-h-full max-w-full" />
            ) : (
              <img
                src={active?.url}
                alt={active?.alt ?? name}
                className="max-h-[80vh] max-w-full object-contain"
              />
            )}
          </div>
          {total > 1 && (
            <div className="flex items-center justify-center gap-4 pb-8">
              <button type="button" onClick={() => go(-1)} aria-label="Anterior" className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Próxima" className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
