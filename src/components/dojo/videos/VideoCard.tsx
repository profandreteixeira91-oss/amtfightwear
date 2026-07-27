import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Clock, Eye, Star } from "lucide-react";

export type VideoCardData = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  teacher_name: string | null;
  duration_seconds: number | null;
  views_count: number;
  published_at: string | null;
  status: string;
  category_id?: string | null;
};

function fmtDuration(s: number | null | undefined) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoCard({
  video,
  index = 0,
  favorited,
  showStatus,
}: {
  video: VideoCardData;
  index?: number;
  favorited?: boolean;
  showStatus?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
    >
      <Link
        to="/dojo/app/videos/$id"
        params={{ id: video.id }}
        className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg"
      >
        <div className="relative aspect-video overflow-hidden bg-muted">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-primary/60">
              <Play className="h-10 w-10" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/95 text-primary-foreground shadow-lg">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </div>
          </div>
          {video.duration_seconds ? (
            <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {fmtDuration(video.duration_seconds)}
            </div>
          ) : null}
          {showStatus && video.status !== "published" && (
            <div className="absolute left-2 top-2 rounded bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {video.status === "draft" ? "Rascunho" : video.status === "private" ? "Privado" : video.status === "archived" ? "Arquivado" : video.status}
            </div>
          )}
          {favorited && (
            <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-primary">
              <Star className="h-3.5 w-3.5" fill="currentColor" />
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="line-clamp-2 min-h-[2.5rem] text-xs sm:text-sm font-semibold leading-tight tracking-tight">
            {video.title}
          </div>
          {video.teacher_name && (
            <div className="mt-1 truncate text-[10px] sm:text-xs text-muted-foreground">{video.teacher_name}</div>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {video.views_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtDuration(video.duration_seconds)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-video animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
