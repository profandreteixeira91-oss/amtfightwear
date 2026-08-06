import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Megaphone, Search, Pin, Star, Heart, MessageCircle, Check, ChevronLeft, Share2,
  Bell, AlertTriangle,
} from "lucide-react";
import {
  listMyAnnouncements, getMyAnnouncement, confirmRead, toggleLike, addComment, deleteMyComment,
} from "@/lib/student/announcements.functions";

export const Route = createFileRoute("/app/_student/announcements")({
  head: () => ({ meta: [{ title: "Quadro de Avisos — Portal do Aluno" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ open: typeof s.open === "string" ? s.open : undefined, filter: typeof s.filter === "string" ? s.filter : undefined }),
  component: MyAnnouncements,
});

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 ring-slate-200",
  normal: "bg-blue-50 text-blue-700 ring-blue-200",
  high: "bg-amber-50 text-amber-800 ring-amber-200",
  urgent: "bg-red-50 text-red-700 ring-red-200 animate-pulse",
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "unread", label: "Não lidos" },
  { key: "featured", label: "Destaques" },
  { key: "read", label: "Lidos" },
];

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function MyAnnouncements() {
  const listFn = useServerFn(listMyAnnouncements);
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [detailId, setDetailId] = useState<string | null>(search.open ?? null);

  useEffect(() => {
    if (search.open && search.open !== detailId) setDetailId(search.open);
  }, [search.open]);


  const { data, isLoading } = useQuery({
    queryKey: ["student", "announcements", q, filter, priority],
    queryFn: () => listFn({ data: { q, filter: filter as any, priority: priority as any } }),
    refetchOnWindowFocus: true,
  });

  const items = data?.items ?? [];
  const featured = useMemo(() => items.filter((i: any) => i.featured || i.pinned).slice(0, 5), [items]);
  const unread = items.filter((i: any) => !i.is_read).length;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold" style={{ color: "var(--sa-title)" }}>
            <Megaphone className="h-5 w-5" /> Quadro de Avisos
          </h1>
          <p className="text-xs text-neutral-500">
            {unread > 0 ? `${unread} aviso${unread > 1 ? "s" : ""} não lido${unread > 1 ? "s" : ""}` : "Você está em dia"}
          </p>
        </div>
        {unread > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>
        )}
      </header>

      {featured.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex gap-3 whitespace-nowrap">
            {featured.map((f: any) => (
              <button
                key={f.id}
                onClick={() => setDetailId(f.id)}
                className="relative w-64 shrink-0 overflow-hidden rounded-2xl text-left ring-1 ring-black/5 shadow-sm"
                style={{ background: "var(--sa-card, #fff)" }}
              >
                {f.cover_image ? (
                  <img src={f.cover_image} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="grid h-32 w-full place-items-center" style={{ background: "var(--sa-primary, #dc2626)" }}>
                    <Megaphone className="h-8 w-8 text-white" />
                  </div>
                )}
                <div className="p-2.5">
                  <div className="flex items-center gap-1">
                    {f.pinned && <Pin className="h-3 w-3 text-neutral-500" />}
                    {f.featured && <Star className="h-3 w-3 text-yellow-500" />}
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">{fmtDate(f.publish_at)}</span>
                  </div>
                  <p className="mt-1 break-words whitespace-normal text-sm font-semibold leading-tight" style={{ color: "var(--sa-title)" }}>
                    {f.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar avisos..."
          className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 whitespace-nowrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                filter === f.key ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white text-neutral-600 ring-neutral-200"
              }`}
            >
              {f.label}
            </button>
          ))}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-full border border-neutral-200 bg-white px-3 text-xs text-neutral-700"
          >
            <option value="all">Prioridade</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-100">
          <Megaphone className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 text-sm font-medium text-neutral-600">Nenhum aviso por aqui</p>
          <p className="mt-1 text-xs text-neutral-400">Quando sua academia publicar algo, você verá aqui.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a: any) => (
            <li key={a.id}>
              <button
                onClick={() => setDetailId(a.id)}
                className="flex w-full items-start gap-3 rounded-2xl p-3 text-left shadow-sm ring-1 ring-neutral-100 transition hover:ring-neutral-200"
                style={{ background: "var(--sa-card, #fff)" }}
              >
                {a.cover_image ? (
                  <img src={a.cover_image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl"
                    style={{ background: a.color ? `${a.color}20` : "#f5f5f5", color: a.color ?? "#666" }}>
                    <Megaphone className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {!a.is_read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    {a.pinned && <Pin className="h-3 w-3 text-neutral-500" />}
                    {a.featured && <Star className="h-3 w-3 text-yellow-500" />}
                    {a.priority === "urgent" && (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ring-1 ${PRIORITY_BADGE[a.priority]}`}>
                        <AlertTriangle className="h-2.5 w-2.5" /> Urgente
                      </span>
                    )}
                    {a.category && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                        style={{ background: `${a.category.color}20`, color: a.category.color }}>
                        {a.category.name}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-neutral-400">{fmtDate(a.publish_at)}</span>
                  </div>
                  <p className={`mt-1 break-words text-sm font-semibold leading-tight ${a.is_read ? "text-neutral-600" : ""}`}
                     style={{ color: a.is_read ? undefined : "var(--sa-title)" }}>
                    {a.title}
                  </p>
                  {a.summary && <p className="mt-0.5 line-clamp-3 break-words text-xs text-neutral-500 leading-normal">{a.summary}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detailId && <AnnouncementDetail id={detailId} onClose={() => { setDetailId(null); if (search.open) navigate({ to: "/app/announcements", search: {} as any, replace: true }); }} />}
    </div>
  );
}

// ============ Detail modal (full-screen on mobile) ============
function AnnouncementDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const fn = useServerFn(getMyAnnouncement);
  const confirmFn = useServerFn(confirmRead);
  const likeFn = useServerFn(toggleLike);
  const commentFn = useServerFn(addComment);
  const delCommentFn = useServerFn(deleteMyComment);
  const [comment, setComment] = useState("");

  const qc2 = useQueryClient();
  const cached: any = (qc2.getQueriesData({ queryKey: ["student", "announcements"] }) as any[])
    .flatMap(([, v]: any) => v?.items ?? [])
    .find((it: any) => it?.id === id);
  const q = useQuery({
    queryKey: ["student", "announcement", id],
    queryFn: () => fn({ data: { id } }),
    placeholderData: cached ? { announcement: cached, comments: [], like_count: 0, liked: false, read: !!cached.is_read, read_at: null, student_id: null } as any : undefined,
  });


  const confirmMut = useMutation({
    mutationFn: () => confirmFn({ data: { id, device: navigator.userAgent } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "announcement", id] }),
  });
  const likeMut = useMutation({
    mutationFn: () => likeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "announcement", id] }),
  });
  const addMut = useMutation({
    mutationFn: () => commentFn({ data: { id, comment: comment.trim() } }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["student", "announcement", id] });
    },
  });
  const delMut = useMutation({
    mutationFn: (cid: string) => delCommentFn({ data: { id: cid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "announcement", id] }),
  });

  const a: any = q.data?.announcement;
  const embed = useMemo(() => toEmbed(a?.video_url), [a?.video_url]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden bg-white sm:max-h-[92vh] sm:rounded-2xl">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">Aviso</span>
          <button
            onClick={() => {
              if (navigator.share) navigator.share({ title: a?.title, text: a?.summary ?? "", url: location.href }).catch(() => {});
            }}
            className="ml-auto grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {q.isLoading ? (
            <div className="p-6 text-center text-sm text-neutral-500">Carregando...</div>
          ) : !a ? (
            <div className="p-6 text-center text-sm text-neutral-500">Aviso indisponível.</div>
          ) : (
            <article className="space-y-4">
              {a.cover_image && <img src={a.cover_image} alt="" className="w-full object-cover" style={{ maxHeight: 260 }} />}
              <div className="space-y-3 px-4 pb-4">
                <div className="flex flex-wrap items-center gap-1">
                  {a.category && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: `${a.category.color}20`, color: a.category.color }}>
                      {a.category.name}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${PRIORITY_BADGE[a.priority]}`}>
                    {a.priority === "urgent" ? "Urgente" : a.priority === "high" ? "Alta" : a.priority === "low" ? "Baixa" : "Normal"}
                  </span>
                  {a.pinned && <Pin className="h-3.5 w-3.5 text-neutral-500" />}
                  {a.featured && <Star className="h-3.5 w-3.5 text-yellow-500" />}
                </div>
                <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--sa-title)" }}>{a.title}</h1>
                {a.subtitle && <p className="text-sm text-neutral-600">{a.subtitle}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                  <span>{new Date(a.publish_at).toLocaleString("pt-BR")}</span>
                  {a.author_name && <span>· por {a.author_name}</span>}
                  <span>· {Math.max(1, Math.ceil((a.content?.length ?? 0) / 800))} min de leitura</span>
                </div>
                {a.content && (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                    {a.content}
                  </div>
                )}
                {embed && (
                  <div className="aspect-video overflow-hidden rounded-xl">
                    <iframe src={embed} className="h-full w-full" allowFullScreen title="video" />
                  </div>
                )}
                {(a.attachments ?? []).length > 0 && (
                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Anexos</p>
                    <ul className="space-y-1">
                      {a.attachments.map((att: any, i: number) => (
                        <li key={i}>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                            {att.name || att.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(a.gallery ?? []).length > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    {a.gallery.map((g: string, i: number) => (
                      <a key={i} href={g} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md">
                        <img src={g} alt="" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 border-t pt-3">
                  {a.allow_likes && (
                    <button
                      onClick={() => likeMut.mutate()}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                        q.data?.liked ? "bg-red-50 text-red-600 ring-red-200" : "bg-white text-neutral-600 ring-neutral-200"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${q.data?.liked ? "fill-current" : ""}`} /> {q.data?.like_count ?? 0}
                    </button>
                  )}
                  {a.require_read_confirmation && (
                    <button
                      onClick={() => confirmMut.mutate()}
                      disabled={q.data?.read}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                        q.data?.read ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-neutral-900 text-white ring-neutral-900"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" /> {q.data?.read ? "Leitura confirmada" : "Confirmar leitura"}
                    </button>
                  )}
                </div>

                {/* Comments */}
                {a.allow_comments && (
                  <div className="space-y-2 border-t pt-3">
                    <h3 className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--sa-title)" }}>
                      <MessageCircle className="h-4 w-4" /> Comentários
                    </h3>
                    <div className="flex gap-2">
                      <input
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escreva um comentário..."
                        className="flex-1 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      />
                      <button
                        onClick={() => comment.trim() && addMut.mutate()}
                        disabled={!comment.trim() || addMut.isPending}
                        className="rounded-full bg-neutral-900 px-4 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Enviar
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {(q.data?.comments ?? []).map((c: any) => (
                        <li key={c.id} className="flex items-start gap-2 rounded-xl bg-neutral-50 p-2.5">
                          {c.student?.photo_url ? (
                            <img src={c.student.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
                              {(c.student?.full_name ?? "?").slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">{c.student?.full_name}</p>
                            <p className="text-sm text-neutral-700">{c.comment}</p>
                            <p className="text-[10px] text-neutral-400">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                          {c.student_id === q.data?.student_id && (
                            <button onClick={() => delMut.mutate(c.id)} className="text-[10px] text-red-500">Excluir</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

function toEmbed(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/\//g, "");
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch { /* ignore */ }
  return null;
}
