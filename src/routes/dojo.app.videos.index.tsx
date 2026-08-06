import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Film,
  Layers,
  Eye,
  Clock,
  FileText,
  TrendingUp,
  Plus,
  Search,
  Filter,
  FolderTree,
  Star as StarIcon,
  Flame,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVideosDashboard, listVideos, listVideoCategories } from "@/lib/dojo/videos.functions";
import { VideoStat } from "@/components/dojo/videos/VideoStat";
import { VideoCard, VideoCardSkeleton } from "@/components/dojo/videos/VideoCard";

export const Route = createFileRoute("/dojo/app/videos/")({
  head: () => ({ meta: [{ title: "Vídeos — AMT Dojo Manager" }] }),
  component: VideosLibrary,
});

function VideosLibrary() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "published" | "draft" | "private" | "archived">("all");
  const [sort, setSort] = useState<"recent" | "views" | "title">("recent");

  const dashboard = useQuery({ queryKey: ["dojo-videos", "dashboard"], queryFn: () => getVideosDashboard() });
  const categories = useQuery({ queryKey: ["dojo-videos", "categories"], queryFn: () => listVideoCategories() });
  const videos = useQuery({
    queryKey: ["dojo-videos", "list", search, categoryId, status, sort],
    queryFn: () =>
      listVideos({
        data: {
          search: search || undefined,
          category_id: categoryId === "all" ? undefined : categoryId,
          status,
          sort,
        },
      }),
  });

  const rootCats = useMemo(
    () => (categories.data ?? []).filter((c: any) => !c.parent_id),
    [categories.data],
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 text-white shadow-[0_30px_80px_-40px_rgba(220,38,38,0.65)]">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-600/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 top-8 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.06),transparent_45%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 sm:p-7">
          <div className="flex items-start gap-4 min-w-0">
            <div className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white shadow-[0_10px_25px_-10px_rgba(220,38,38,0.9)] ring-1 ring-white/20">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200 backdrop-blur">
                <Flame className="h-3 w-3" /> Biblioteca
              </div>
              <h1 className="mt-2 font-display text-xl font-black leading-tight tracking-tight sm:text-2xl md:text-3xl lg:text-4xl break-words">
                Cada aula gravada, um legado técnico.
              </h1>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-neutral-300 break-words">
                Publique, organize e acompanhe o consumo dos conteúdos da sua academia.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button asChild variant="outline" className="flex-1 md:flex-none h-9 text-xs border-white/15 bg-white/5 text-white hover:bg-white/10 px-3">
              <Link to="/dojo/app/videos/favoritos">
                <StarIcon className="mr-2 h-3.5 w-3.5" />
                <span className="truncate">Favoritos</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 md:flex-none h-9 text-xs border-white/15 bg-white/5 text-white hover:bg-white/10 px-3">
              <Link to="/dojo/app/videos/categorias">
                <FolderTree className="mr-2 h-3.5 w-3.5" />
                <span className="truncate">Categorias</span>
              </Link>
            </Button>
            <Button asChild className="flex-1 md:flex-none h-9 text-xs bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-400 px-3">
              <Link to="/dojo/app/videos/novo" search={{ step: "1" }}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                <span className="truncate">Novo Vídeo</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <VideoStat icon={Film} label="Publicados" value={dashboard.data?.published ?? 0} tint="success" index={0} />
        <VideoStat icon={Layers} label="Categorias" value={dashboard.data?.categoriesCount ?? 0} index={1} />
        <VideoStat icon={Eye} label="Views" value={(dashboard.data?.totalViews ?? 0).toLocaleString("pt-BR")} tint="primary" index={2} />
        <VideoStat icon={Clock} label="Conteúdo" value={`${dashboard.data?.totalHours ?? 0}h`} index={3} />
        <VideoStat icon={FileText} label="Rascunhos" value={dashboard.data?.drafts ?? 0} tint={(dashboard.data?.drafts ?? 0) > 0 ? "warning" : "muted"} index={4} />
        <VideoStat icon={TrendingUp} label="Total" value={dashboard.data?.totalVideos ?? 0} index={5} />
      </div>

      {/* Top watched */}
      {(dashboard.data?.topWatched?.length ?? 0) > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/70 p-5 text-white shadow-[0_20px_50px_-30px_rgba(220,38,38,0.5)] backdrop-blur">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/15 blur-3xl" />
          <div className="relative mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_10px_25px_-12px_rgba(220,38,38,0.9)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">Em destaque</div>
              <div className="text-base font-semibold">Mais assistidos</div>
            </div>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {dashboard.data!.topWatched.map((v: any, i: number) => (
              <VideoCard
                key={v.id}
                index={i}
                video={{
                  id: v.id,
                  title: v.title,
                  thumbnail_url: v.thumbnail_url,
                  teacher_name: null,
                  duration_seconds: v.duration_seconds,
                  views_count: v.views_count,
                  published_at: null,
                  status: v.status,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-neutral-950/60 p-3 text-white backdrop-blur lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar vídeos..."
            className="h-9 border-white/10 bg-white/5 pl-9 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus-visible:ring-red-500/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-full border-white/10 bg-white/5 text-xs text-white sm:w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {rootCats.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="h-9 w-full border-white/10 bg-white/5 text-xs text-white sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="private">Privados</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="h-9 w-full border-white/10 bg-white/5 text-xs text-white sm:w-40 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 truncate">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recentes</SelectItem>
              <SelectItem value="views">Mais vistos</SelectItem>
              <SelectItem value="title">A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {videos.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : (videos.data?.length ?? 0) === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-neutral-950/60 p-12 text-center text-white backdrop-blur">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-red-600/15 blur-3xl" />
          <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_10px_25px_-12px_rgba(220,38,38,0.9)]">
            <Film className="h-7 w-7" />
          </div>
          <h3 className="relative mt-4 font-display text-xl font-black tracking-tight">Sua biblioteca está vazia</h3>
          <p className="relative mt-1 text-sm text-neutral-300">Publique seu primeiro vídeo para os alunos da academia.</p>
          <Button asChild className="relative mt-5 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-400">
            <Link to="/dojo/app/videos/novo" search={{ step: "1" }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Vídeo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.data!.map((v: any, i: number) => (
            <VideoCard
              key={v.id}
              index={i}
              showStatus
              video={{
                id: v.id,
                title: v.title,
                thumbnail_url: v.thumbnail_url,
                teacher_name: v.teacher_name,
                duration_seconds: v.duration_seconds,
                views_count: v.views_count,
                published_at: v.published_at,
                status: v.status,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
