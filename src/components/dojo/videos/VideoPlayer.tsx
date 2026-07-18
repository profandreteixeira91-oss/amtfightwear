import { useEffect, useRef } from "react";

function parseYouTube(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function parseVimeo(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export function VideoPlayer({
  src,
  source,
  poster,
  onProgress,
  onEnded,
}: {
  src: string;
  source: string;
  poster?: string | null;
  onProgress?: (current: number, duration: number) => void;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastReport = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onProgress) return;
    const onTime = () => {
      const now = Date.now();
      if (now - lastReport.current < 5000) return;
      lastReport.current = now;
      onProgress(el.currentTime, el.duration || 0);
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [onProgress]);

  if (source === "youtube") {
    const id = parseYouTube(src);
    if (!id) return <div className="p-8 text-center text-sm text-muted-foreground">URL do YouTube inválida.</div>;
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Vídeo"
        />
      </div>
    );
  }

  if (source === "vimeo") {
    const id = parseVimeo(src);
    if (!id) return <div className="p-8 text-center text-sm text-muted-foreground">URL do Vimeo inválida.</div>;
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vídeo"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-xl">
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        controls
        controlsList="nodownload"
        playsInline
        onEnded={onEnded}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
