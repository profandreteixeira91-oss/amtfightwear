import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listFavorites } from "@/lib/dojo/videos.functions";
import { VideoCard, VideoCardSkeleton } from "@/components/dojo/videos/VideoCard";

export const Route = createFileRoute("/dojo/app/videos/favoritos")({
  head: () => ({ meta: [{ title: "Favoritos — AMT Dojo Manager" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const favs = useQuery({ queryKey: ["dojo-video-favorites"], queryFn: () => listFavorites() });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight">Meus Favoritos</h2>
        <p className="text-sm text-muted-foreground">Acesso rápido aos vídeos que você marcou como favoritos.</p>
      </div>
      {favs.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
        </div>
      ) : (favs.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Star className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-bold">Nenhum favorito ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Marque vídeos com a estrela para acessá-los rapidamente aqui.</p>
          <Button asChild className="mt-4"><Link to="/dojo/app/videos">Ir para a biblioteca</Link></Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {favs.data!.map((v: any, i: number) => (
            <VideoCard
              key={v.id}
              index={i}
              favorited
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
