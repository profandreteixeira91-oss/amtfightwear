import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit, Star, Trash2, Copy, Archive, Send, MessageCircle, Pin, ChevronRight, ChevronLeft, Paperclip, Eye, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getVideo,
  listVideos,
  listComments,
  addComment,
  deleteComment,
  pinComment,
  toggleFavorite,
  listFavorites,
  registerView,
  upsertProgress,
  duplicateVideo,
  archiveVideo,
  deleteVideo,
} from "@/lib/dojo/videos.functions";
import { VideoPlayer } from "@/components/dojo/videos/VideoPlayer";
import { VideoCard } from "@/components/dojo/videos/VideoCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dojo/app/videos/$id")({
  head: () => ({ meta: [{ title: "Vídeo — AMT Dojo Manager" }] }),
  component: VideoPage,
});

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function VideoPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const video = useQuery({ queryKey: ["dojo-video", id], queryFn: () => getVideo({ data: { id } }) });
  const related = useQuery({
    queryKey: ["dojo-video-related", id, (video.data as any)?.category_id],
    queryFn: () =>
      listVideos({
        data: {
          category_id: (video.data as any)?.category_id ?? undefined,
          status: "published",
          limit: 12,
        },
      }),
    enabled: !!video.data,
  });
  const comments = useQuery({ queryKey: ["dojo-video-comments", id], queryFn: () => listComments({ data: { video_id: id } }) });
  const favs = useQuery({ queryKey: ["dojo-video-favorites"], queryFn: () => listFavorites() });

  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user ? { id: data.user.id, email: data.user.email ?? null } : null));
  }, []);

  useEffect(() => {
    if (video.data) registerView({ data: { video_id: id } }).catch(() => {});
  }, [video.data, id]);

  const isFavorited = (favs.data ?? []).some((v: any) => v?.id === id);
  const v = video.data as any;
  const relatedList = ((related.data ?? []) as any[]).filter((r) => r.id !== id).slice(0, 6);

  async function handleFavorite() {
    await toggleFavorite({ data: { video_id: id } });
    qc.invalidateQueries({ queryKey: ["dojo-video-favorites"] });
  }
  async function handleDuplicate() {
    const row = await duplicateVideo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-videos"] });
    nav({ to: "/dojo/app/videos/novo", search: { id: (row as any).id, step: undefined } });
  }
  async function handleArchive() {
    await archiveVideo({ data: { id, archive: v?.status !== "archived" } });
    toast.success(v?.status === "archived" ? "Restaurado" : "Arquivado");
    qc.invalidateQueries({ queryKey: ["dojo-videos"] });
    qc.invalidateQueries({ queryKey: ["dojo-video", id] });
  }
  async function handleDelete() {
    if (!confirm("Excluir este vídeo permanentemente?")) return;
    await deleteVideo({ data: { id } });
    qc.invalidateQueries({ queryKey: ["dojo-videos"] });
    nav({ to: "/dojo/app/videos" });
  }
  async function handlePost() {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await addComment({
        data: {
          video_id: id,
          body: commentText.trim(),
          author_name: me?.email ?? "Usuário",
        },
      });
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["dojo-video-comments", id] });
    } finally {
      setPosting(false);
    }
  }

  if (video.isLoading) {
    return <div className="grid min-h-[40vh] place-items-center text-muted-foreground">Carregando...</div>;
  }
  if (!v) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">Vídeo não encontrado.</p>
        <Button asChild className="mt-4"><Link to="/dojo/app/videos">Voltar</Link></Button>
      </div>
    );
  }

  const idx = relatedList.findIndex((r) => r.id === id);
  const prev = idx > 0 ? relatedList[idx - 1] : null;
  const next = idx >= 0 && idx < relatedList.length - 1 ? relatedList[idx + 1] : relatedList[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/dojo/app/videos"><ArrowLeft className="mr-2 h-4 w-4" />Biblioteca</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleFavorite} className="flex-1 sm:flex-none">
            <Star className={`mr-2 h-4 w-4 ${isFavorited ? "fill-primary text-primary" : ""}`} />
            <span className="truncate">{isFavorited ? "Favoritado" : "Favoritar"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} className="flex-1 sm:flex-none">
            <Copy className="mr-2 h-4 w-4" />
            <span className="truncate">Duplicar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleArchive} className="flex-1 sm:flex-none">
            <Archive className="mr-2 h-4 w-4" />
            <span className="truncate">{v.status === "archived" ? "Restaurar" : "Arquivar"}</span>
          </Button>
          <Button asChild size="sm" className="flex-1 sm:flex-none">
            <Link to="/dojo/app/videos/novo" search={{ id, step: undefined }}>
              <Edit className="mr-2 h-4 w-4" />
              <span className="truncate">Editar</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span className="truncate">Excluir</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {v.video_url ? (
            <VideoPlayer
              src={v.video_url}
              source={v.video_source ?? "url"}
              poster={v.thumbnail_url}
              onProgress={(current, dur) => {
                if (!dur) return;
                upsertProgress({
                  data: {
                    video_id: id,
                    watched_seconds: Math.round(current),
                    percent: Math.min(100, Math.round((current / dur) * 100)),
                  },
                }).catch(() => {});
              }}
            />
          ) : (
            <div className="grid aspect-video place-items-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
              Nenhuma fonte de vídeo configurada
            </div>
          )}

          <div>
            <h1 className="text-2xl font-black tracking-tight">{v.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {v.teacher_name && <span>Prof. {v.teacher_name}</span>}
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{v.views_count ?? 0} visualizações</span>
              {v.published_at && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(v.published_at)}</span>}
            </div>
            {v.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{v.description}</p>
            )}
          </div>

          {Array.isArray(v.attachments) && v.attachments.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Paperclip className="h-4 w-4" />Materiais
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {v.attachments.map((a: any, i: number) => (
                  <li key={i}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hover:bg-accent">
                      <span className="truncate">
                        <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">{a.kind}</span>
                        {a.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Comments */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              Comentários ({(comments.data ?? []).length})
            </h3>
            <div className="mb-4 flex gap-3">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicione um comentário..."
                rows={2}
                className="flex-1"
              />
              <Button onClick={handlePost} disabled={posting || !commentText.trim()}>
                <Send className="mr-2 h-4 w-4" />Enviar
              </Button>
            </div>
            <ul className="space-y-3">
              {(comments.data ?? []).map((c: any) => (
                <li key={c.id} className={`rounded-lg border p-3 ${c.pinned ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">{c.author_name ?? "Usuário"}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {c.pinned && <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary"><Pin className="h-3 w-3" />Fixado</span>}
                      <span>{fmtDate(c.created_at)}</span>
                      <button
                        onClick={() => pinComment({ data: { id: c.id, pinned: !c.pinned } }).then(() => qc.invalidateQueries({ queryKey: ["dojo-video-comments", id] }))}
                        className="ml-2 rounded p-1 hover:bg-accent"
                        title="Fixar"
                      ><Pin className="h-3 w-3" /></button>
                      <button
                        onClick={() => deleteComment({ data: { id: c.id } }).then(() => qc.invalidateQueries({ queryKey: ["dojo-video-comments", id] }))}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                        title="Excluir"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm">{c.body}</p>
                </li>
              ))}
              {(comments.data ?? []).length === 0 && (
                <li className="py-4 text-center text-xs text-muted-foreground">Nenhum comentário ainda</li>
              )}
            </ul>
          </section>
        </div>

        {/* Sidebar: navigation + related */}
        <aside className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={!prev}
              onClick={() => prev && nav({ to: "/dojo/app/videos/$id", params: { id: prev.id } })}>
              <ChevronLeft className="mr-1 h-4 w-4" />Anterior
            </Button>
            <Button variant="outline" size="sm" className="flex-1" disabled={!next}
              onClick={() => next && nav({ to: "/dojo/app/videos/$id", params: { id: next.id } })}>
              Próximo<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Vídeos relacionados</h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {relatedList.map((r: any, i) => (
                <VideoCard
                  key={r.id}
                  index={i}
                  video={{
                    id: r.id,
                    title: r.title,
                    thumbnail_url: r.thumbnail_url,
                    teacher_name: r.teacher_name,
                    duration_seconds: r.duration_seconds,
                    views_count: r.views_count,
                    published_at: r.published_at,
                    status: r.status,
                  }}
                />
              ))}
              {relatedList.length === 0 && (
                <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">Nada relacionado</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
