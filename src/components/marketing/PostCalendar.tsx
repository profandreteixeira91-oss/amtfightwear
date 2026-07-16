import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle, XCircle, Loader2, Trash2, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cancelInstagramPost, rescheduleInstagramPost, deleteInstagramPost } from "@/lib/instagram.functions";

export type CalendarPost = {
  id: string;
  caption: string;
  image_url: string;
  scheduled_for: string | null;
  published_at: string | null;
  status: string;
  ig_permalink: string | null;
  error: string | null;
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground",
  scheduled: "bg-blue-500",
  publishing: "bg-amber-500 animate-pulse",
  published: "bg-emerald-500",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/50",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  publishing: "Publicando",
  published: "Publicado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PostCalendar({
  posts,
  onScheduleAt,
}: {
  posts: CalendarPost[];
  onScheduleAt: (iso: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<CalendarPost | null>(null);

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: { date: Date | null }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      const ref = p.scheduled_for || p.published_at;
      if (!ref) continue;
      const key = ymd(new Date(ref));
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    // Sort each day by time
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        const ta = new Date(a.scheduled_for || a.published_at || 0).getTime();
        const tb = new Date(b.scheduled_for || b.published_at || 0).getTime();
        return ta - tb;
      });
    }
    return m;
  }, [posts]);

  const today = ymd(new Date());

  const goto = (delta: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));

  const handleEmptyDay = (d: Date) => {
    const t = new Date(d);
    t.setHours(10, 0, 0, 0); // default 10:00
    const p = (n: number) => String(n).padStart(2, "0");
    const iso = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
    onScheduleAt(iso);
    toast.info(`Data ${t.toLocaleDateString("pt-BR")} 10:00 preparada — ajuste no briefing.`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => goto(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-lg font-semibold min-w-[180px] text-center">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </div>
          <Button size="icon" variant="outline" onClick={() => goto(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
          Hoje
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell.date) return <div key={i} className="min-h-[92px]" />;
          const key = ymd(cell.date);
          const items = byDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <div
              key={i}
              className={`min-h-[92px] rounded-md border p-1 transition-colors ${isToday ? "border-primary bg-primary/5" : "border-border/50"} hover:bg-muted/40 cursor-pointer group`}
              onClick={() => items.length === 0 && handleEmptyDay(cell.date!)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{cell.date.getDate()}</span>
                {items.length > 0 && <span className="text-[9px] text-muted-foreground">{items.length}</span>}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((p) => {
                  const time = new Date(p.scheduled_for || p.published_at || 0).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelected(p); }}
                      className="flex items-center gap-1 w-full text-left rounded bg-background/80 hover:bg-background border px-1 py-0.5 text-[10px]"
                      title={p.caption}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[p.status] ?? "bg-muted"}`} />
                      <img src={p.image_url} alt="" className="h-4 w-4 rounded object-cover" />
                      <span className="truncate flex-1">{time}</span>
                    </button>
                  );
                })}
                {items.length > 3 && <div className="text-[9px] text-muted-foreground px-1">+{items.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[k]}`} />{v}
          </span>
        ))}
      </div>

      <PostDetailDialog post={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function PostDetailDialog({ post, onClose }: { post: CalendarPost | null; onClose: () => void }) {
  const qc = useQueryClient();
  const rescheduleFn = useServerFn(rescheduleInstagramPost);
  const cancelFn = useServerFn(cancelInstagramPost);
  const deleteFn = useServerFn(deleteInstagramPost);

  const [scheduleAt, setScheduleAt] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useMemo(() => {
    if (post) {
      setScheduleAt(toLocalInput(post.scheduled_for));
      setCaption(post.caption);
      setImageUrl(post.image_url);
    }
  }, [post]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!post) return;
      return rescheduleFn({
        data: {
          id: post.id,
          scheduledFor: scheduleAt ? new Date(scheduleAt).toISOString() : null,
          caption,
          imageUrl,
        },
      });
    },
    onSuccess: () => {
      toast.success("Post atualizado");
      qc.invalidateQueries({ queryKey: ["ig-posts"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      if (post) await cancelFn({ data: { id: post.id } });
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      qc.invalidateQueries({ queryKey: ["ig-posts"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      if (post) await deleteFn({ data: { id: post.id } });
    },
    onSuccess: () => {
      toast.success("Post removido");
      qc.invalidateQueries({ queryKey: ["ig-posts"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!post) return null;
  const editable = ["draft", "scheduled", "failed", "cancelled"].includes(post.status);
  const StatusIcon =
    post.status === "published" ? CheckCircle2 :
    post.status === "failed" ? AlertCircle :
    post.status === "cancelled" ? XCircle :
    post.status === "publishing" ? Loader2 : Clock;

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${post.status === "publishing" ? "animate-spin" : ""}`} />
            {STATUS_LABEL[post.status] ?? post.status}
            {post.ig_permalink && (
              <a href={post.ig_permalink} target="_blank" rel="noreferrer" className="text-xs underline flex items-center gap-1 ml-2">
                Ver no Instagram <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          <div>
            <img src={imageUrl} alt="" className="w-full aspect-square rounded object-cover border" />
            {editable && (
              <div className="mt-2">
                <Label className="text-xs">URL da imagem</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-xs" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Legenda</Label>
              <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={!editable} />
            </div>

            {editable && (
              <div>
                <Label>Data e hora do agendamento</Label>
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio para voltar a rascunho.</p>
              </div>
            )}

            {post.error && (
              <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                {post.error}
              </div>
            )}

            <Badge variant="outline" className="text-[10px]">
              Criado {new Date(post.scheduled_for || post.published_at || Date.now()).toLocaleString("pt-BR")}
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editable && post.status === "scheduled" && (
            <Button variant="ghost" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> Cancelar agendamento
            </Button>
          )}
          {["draft", "cancelled", "failed"].includes(post.status) && (
            <Button variant="ghost" className="text-destructive" onClick={() => delMut.mutate()} disabled={delMut.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
          {editable && (
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
