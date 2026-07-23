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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black tracking-tight">Biblioteca de Vídeos</h2>
          <p className="text-sm text-muted-foreground">Publique e organize os conteúdos da sua academia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/dojo/app/videos/favoritos">
              <StarIcon className="mr-2 h-4 w-4" />
              Favoritos
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dojo/app/videos/categorias">
              <FolderTree className="mr-2 h-4 w-4" />
              Categorias
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dojo/app/videos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Vídeo
            </Link>
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <VideoStat icon={Film} label="Publicados" value={dashboard.data?.published ?? 0} tint="success" index={0} />
        <VideoStat icon={Layers} label="Categorias" value={dashboard.data?.categoriesCount ?? 0} index={1} />
        <VideoStat icon={Eye} label="Visualizações" value={(dashboard.data?.totalViews ?? 0).toLocaleString("pt-BR")} tint="primary" index={2} />
        <VideoStat icon={Clock} label="Horas de conteúdo" value={`${dashboard.data?.totalHours ?? 0}h`} index={3} />
        <VideoStat icon={FileText} label="Rascunhos" value={dashboard.data?.drafts ?? 0} tint={(dashboard.data?.drafts ?? 0) > 0 ? "warning" : "muted"} index={4} />
        <VideoStat icon={TrendingUp} label="Total de vídeos" value={dashboard.data?.totalVideos ?? 0} index={5} />
      </div>

      {/* Top watched */}
      {(dashboard.data?.topWatched?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <TrendingUp className="h-4 w-4 text-primary" /> Mais assistidos
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="pl-9"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {rootCats.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="private">Privados</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="views">Mais assistidos</SelectItem>
            <SelectItem value="title">A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {videos.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : (videos.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Film className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-bold">Sua biblioteca está vazia</h3>
          <p className="mt-1 text-sm text-muted-foreground">Publique seu primeiro vídeo para os alunos da academia.</p>
          <Button asChild className="mt-4">
            <Link to="/dojo/app/videos/novo">
              <Plus className="mr-2 h-4 w-4" /> Novo Vídeo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
