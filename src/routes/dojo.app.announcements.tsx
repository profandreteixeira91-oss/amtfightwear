import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Megaphone, Plus, Search, Pin, Star, Users, Trash2, Edit3, Eye, CheckCircle2,
  AlertTriangle, Clock, Calendar, Send, Archive, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listAnnouncements, saveAnnouncement, deleteAnnouncement, setAnnouncementStatus,
  announcementStats, readReport, targetOptions,
  listAnnouncementCategories, upsertAnnouncementCategory, deleteAnnouncementCategory,
} from "@/lib/dojo/announcements.functions";

export const Route = createFileRoute("/dojo/app/announcements")({
  head: () => ({ meta: [{ title: "Quadro de Avisos — AMT Dojo Manager" }] }),
  component: AnnouncementsAdmin,
});

const PRIORITIES = [
  { value: "low", label: "Baixa", color: "bg-slate-100 text-slate-700" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "Alta", color: "bg-amber-100 text-amber-800" },
  { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-700" },
];
const STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
];
const STUDENT_STATUSES = [
  { value: "active", label: "Alunos ativos" },
  { value: "inactive", label: "Alunos inativos" },
  { value: "overdue", label: "Alunos inadimplentes" },
  { value: "new", label: "Alunos novos" },
];

function AnnouncementsAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAnnouncements);
  const statsFn = useServerFn(announcementStats);
  const catsFn = useServerFn(listAnnouncementCategories);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showReport, setShowReport] = useState<string | null>(null);

  const stats = useQuery({ queryKey: ["ann", "stats"], queryFn: () => statsFn({}) });
  const cats = useQuery({ queryKey: ["ann", "cats"], queryFn: () => catsFn({}) });
  const list = useQuery({
    queryKey: ["ann", "list", q, status, priority],
    queryFn: () => listFn({ data: { q, status: status as any, priority: priority as any } }),
  });

  const delFn = useServerFn(deleteAnnouncement);
  const setStatusFn = useServerFn(setAnnouncementStatus);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Aviso excluído");
      qc.invalidateQueries({ queryKey: ["ann"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: any }) => setStatusFn({ data: { id, status: s } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["ann"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cards = stats.data;
  const rows = list.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      {/* HERO PREMIUM */}
      <section className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black text-white shadow-[0_30px_80px_-30px_rgba(220,38,38,0.45)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:p-7 md:p-9">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-200">
              <Megaphone className="h-3 w-3" />
              Quadro de Avisos
            </div>
            <h1 className="font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
              Comunique-se com <span className="text-red-400">clareza</span> e impacto
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-neutral-300 md:text-base">
              Publique comunicados oficiais direto no App do Aluno com prioridade, categorias, capa, vídeo, confirmação de leitura e agendamento.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowCatMgr(true)}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Categorias
            </Button>
            <Button
              onClick={() => { setEditing(null); setShowEditor(true); }}
              className="bg-red-600 text-white hover:bg-red-500 shadow-[0_10px_25px_-12px_rgba(220,38,38,0.9)]"
            >
              <Plus className="mr-1 h-4 w-4" /> Novo aviso
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <StatCard icon={<Megaphone className="h-4 w-4 text-red-600" />} label="Total" value={cards?.total ?? 0} ring="ring-red-400/30" glow="from-red-500/20 to-red-500/5" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Ativos" value={cards?.active ?? 0} ring="ring-emerald-400/30" glow="from-emerald-400/20 to-emerald-500/5" />
        <StatCard icon={<Clock className="h-4 w-4 text-blue-600" />} label="Agendados" value={cards?.scheduled ?? 0} ring="ring-blue-400/30" glow="from-blue-400/20 to-blue-500/5" />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Expirados" value={cards?.expired ?? 0} ring="ring-amber-400/30" glow="from-amber-400/20 to-amber-500/5" />
        <StatCard icon={<Star className="h-4 w-4 text-yellow-500" />} label="Em destaque" value={cards?.featured ?? 0} ring="ring-yellow-400/30" glow="from-yellow-400/20 to-yellow-500/5" />
        <StatCard icon={<Eye className="h-4 w-4 text-cyan-600" />} label="Visualizações" value={cards?.totalViews ?? 0} ring="ring-cyan-400/30" glow="from-cyan-400/20 to-cyan-500/5" />
        <StatCard icon={<Star className="h-4 w-4 text-pink-500" />} label="Curtidas" value={cards?.totalLikes ?? 0} ring="ring-pink-400/30" glow="from-pink-400/20 to-pink-500/5" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-violet-600" />} label="Leituras" value={cards?.totalReads ?? 0} ring="ring-violet-400/30" glow="from-violet-400/20 to-violet-500/5" />
        <div className="col-span-2 flex flex-col justify-center rounded-2xl border border-neutral-200/70 bg-gradient-to-br from-neutral-950 to-neutral-900 px-4 py-3 text-white shadow-sm md:col-span-2 xl:col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Última publicação</span>
          <span className="mt-1 truncate text-sm font-bold">{cards?.latest?.title ?? "—"}</span>
          {cards?.latest?.publish_at && (
            <span className="text-xs text-neutral-400">
              {new Date(cards.latest.publish_at).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200/70 bg-white/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar avisos..."
            className="pl-9 border-neutral-200 bg-white focus-visible:ring-red-500/40"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="sm:w-44 rounded-xl"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="grid gap-3">
        {list.isLoading ? (
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-8 text-center text-muted-foreground shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-red-500" />
            <p className="mt-2 text-sm">Carregando avisos…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-red-300/40 bg-gradient-to-br from-white to-red-50/60 p-10 text-center">
            <div aria-hidden className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-500/10 blur-2xl" />
            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
                <Megaphone className="h-6 w-6 text-red-600" />
              </div>
              <p className="mt-3 text-sm font-semibold">Nenhum aviso publicado ainda</p>
              <p className="text-xs text-muted-foreground">Clique em "Novo aviso" para começar.</p>
            </div>
          </div>
        ) : rows.map((a: any) => {
          const pri = PRIORITIES.find((p) => p.value === a.priority);
          const isUrgent = a.priority === "urgent";
          return (
            <article
              key={a.id}
              className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-start ${
                isUrgent ? "border-red-300/60 ring-1 ring-red-400/30" : "border-neutral-200/70"
              }`}
            >
              {isUrgent && (
                <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-500 to-red-700" />
              )}
              {a.cover_image ? (
                <img src={a.cover_image} alt="" className="h-24 w-full rounded-xl object-cover ring-1 ring-neutral-200/70 sm:h-24 sm:w-36" />
              ) : (
                <div className="relative grid h-24 w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 sm:h-24 sm:w-36">
                  <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.15),transparent_60%)]" />
                  <Megaphone className="relative h-8 w-8 text-neutral-400" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {a.pinned && (
                    <Badge variant="secondary" className="gap-1 rounded-full bg-red-50 text-red-700 hover:bg-red-50">
                      <Pin className="h-3 w-3" /> Fixado
                    </Badge>
                  )}
                  {a.featured && (
                    <Badge className="gap-1 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      <Star className="h-3 w-3" /> Destaque
                    </Badge>
                  )}
                  <Badge className={`${pri?.color} rounded-full`} variant="secondary">{pri?.label}</Badge>
                  <Badge variant="outline" className="rounded-full">{STATUSES.find((s) => s.value === a.status)?.label}</Badge>
                  {a.category && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
                      style={{ background: `${a.category.color}20`, color: a.category.color, borderColor: a.category.color }}
                    >
                      {a.category.name}
                    </span>
                  )}
                </div>
                <h3 className="break-words text-base font-bold tracking-tight text-neutral-900 leading-tight">{a.title}</h3>
                {a.summary && <p className="line-clamp-3 break-words text-sm text-muted-foreground leading-normal">{a.summary}</p>}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(a.publish_at).toLocaleString("pt-BR")}</span>
                  {a.expires_at && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Expira {new Date(a.expires_at).toLocaleDateString("pt-BR")}</span>}
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {a.view_count ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {a.target_scope === "all" ? "Todos" : `${a.targets?.length ?? 0} filtros`}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {a.status !== "published" && (
                  <Button size="sm" className="bg-red-600 text-white hover:bg-red-500" onClick={() => setStatusMut.mutate({ id: a.id, s: "published" })}>
                    <Send className="mr-1 h-3.5 w-3.5" /> Publicar
                  </Button>
                )}
                {a.status === "published" && (
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: a.id, s: "archived" })}>
                    <Archive className="mr-1 h-3.5 w-3.5" /> Arquivar
                  </Button>
                )}
                {a.require_read_confirmation && (
                  <Button size="sm" variant="outline" onClick={() => setShowReport(a.id)}>
                    <Users className="mr-1 h-3.5 w-3.5" /> Leituras
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setEditing(a); setShowEditor(true); }}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (confirm("Excluir este aviso?")) delMut.mutate(a.id);
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <AnnouncementEditor
        open={showEditor}
        initial={editing}
        categories={cats.data ?? []}
        onClose={() => setShowEditor(false)}
        onSaved={() => { setShowEditor(false); qc.invalidateQueries({ queryKey: ["ann"] }); }}
      />
      <CategoryManager open={showCatMgr} onClose={() => setShowCatMgr(false)} />
      <ReadReportDialog id={showReport} onClose={() => setShowReport(null)} />

      <div className="pt-4 text-center">
        <Link to="/app/announcements" search={{ open: "" }} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-red-600">
          Visualizar como o aluno vê →
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, ring = "ring-neutral-200/70", glow = "from-neutral-100 to-white",
}: { icon: React.ReactNode; label: string; value: number; ring?: string; glow?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 shadow-sm ring-1 ${ring} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${glow} opacity-70`} aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {icon} {label}
        </div>
        <div className="mt-1.5 font-display text-2xl font-black leading-none tabular-nums text-neutral-900 md:text-[1.75rem]">{value}</div>
      </div>
    </div>
  );
}


// ============ Editor ============
function AnnouncementEditor({
  open, initial, categories, onClose, onSaved,
}: { open: boolean; initial: any; categories: any[]; onClose: () => void; onSaved: () => void }) {
  const saveFn = useServerFn(saveAnnouncement);
  const optsFn = useServerFn(targetOptions);
  const opts = useQuery({ queryKey: ["ann", "target-opts"], queryFn: () => optsFn({}), enabled: open });

  const [form, setForm] = useState<any>(() => makeForm(initial));

  // reset when opening
  useMemo(() => { if (open) setForm(makeForm(initial)); }, [open, initial?.id]); // eslint-disable-line

  const mut = useMutation({
    mutationFn: (payload: any) => saveFn({ data: payload }),
    onSuccess: () => { toast.success("Aviso salvo"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!open) return null;

  function set<K extends string>(key: K, v: any) {
    setForm((f: any) => ({ ...f, [key]: v }));
  }
  function toggleTarget(target_type: string, target_id: string | null) {
    setForm((f: any) => {
      const existing = f.targets.find((t: any) => t.target_type === target_type && (t.target_id ?? null) === target_id);
      if (existing) {
        return { ...f, targets: f.targets.filter((t: any) => t !== existing) };
      }
      return { ...f, targets: [...f.targets, { target_type, target_id }] };
    });
  }
  const hasTarget = (tt: string, tid: string | null) =>
    form.targets.some((t: any) => t.target_type === tt && (t.target_id ?? null) === tid);

  async function submit(publishNow = false) {
    const payload = { ...form };
    if (publishNow) payload.status = "published";
    else if (payload.publish_at && new Date(payload.publish_at) > new Date() && payload.status === "published") {
      payload.status = "scheduled";
    }
    mut.mutate(payload);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar aviso" : "Novo aviso"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 md:col-span-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Feriado — não haverá aula quinta-feira" />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
          <div>
            <Label>Autor</Label>
            <Input value={form.author_name ?? ""} onChange={(e) => set("author_name", e.target.value)} placeholder="Prof. André" />
          </div>
          <div className="md:col-span-2">
            <Label>Resumo (aparece na listagem)</Label>
            <Textarea rows={2} value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} maxLength={250} />
            <p className="mt-1 text-[10px] text-muted-foreground">O resumo ajuda o aluno a identificar o assunto rapidamente. Limite de 250 caracteres.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Conteúdo *</Label>
            <Textarea rows={8} value={form.content ?? ""} onChange={(e) => set("content", e.target.value)} placeholder="Escreva o conteúdo completo do aviso..." />
            <p className="mt-1 text-[11px] text-muted-foreground">Suporta quebras de linha. Links são reconhecidos automaticamente.</p>
          </div>
          <div>
            <Label>Imagem de capa (URL)</Label>
            <Input value={form.cover_image ?? ""} onChange={(e) => set("cover_image", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Vídeo (YouTube/Vimeo)</Label>
            <Input value={form.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Publicar em</Label>
            <Input type="datetime-local" value={toLocal(form.publish_at)} onChange={(e) => set("publish_at", fromLocal(e.target.value))} />
          </div>
          <div>
            <Label>Expira em (opcional)</Label>
            <Input type="datetime-local" value={toLocal(form.expires_at)} onChange={(e) => set("expires_at", fromLocal(e.target.value))} />
          </div>
        </div>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-3">
          <FlagRow label="Destaque" value={form.featured} onChange={(v) => set("featured", v)} />
          <FlagRow label="Fixar no topo" value={form.pinned} onChange={(v) => set("pinned", v)} />
          <FlagRow label="Permitir curtidas" value={form.allow_likes} onChange={(v) => set("allow_likes", v)} />
          <FlagRow label="Permitir comentários" value={form.allow_comments} onChange={(v) => set("allow_comments", v)} />
          <FlagRow label="Confirmar leitura" value={form.require_read_confirmation} onChange={(v) => set("require_read_confirmation", v)} />
          <FlagRow label="Enviar notificação" value={form.send_notification} onChange={(v) => set("send_notification", v)} />
        </div>

        {/* Targeting */}
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm font-semibold">Público-alvo</Label>
            <Select value={form.target_scope} onValueChange={(v) => set("target_scope", v)}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os alunos</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.target_scope === "custom" && (
            <div className="grid gap-3 md:grid-cols-2">
              <TargetGroup
                label="Turmas"
                items={(opts.data?.classes ?? []).map((c: any) => ({ id: c.id, label: c.name }))}
                type="class"
                has={hasTarget}
                toggle={toggleTarget}
              />
              <TargetGroup
                label="Filiais"
                items={(opts.data?.units ?? []).map((u: any) => ({ id: u.id, label: u.name }))}
                type="unit"
                has={hasTarget}
                toggle={toggleTarget}
              />
              <TargetGroup
                label="Graduações"
                items={(opts.data?.belts ?? []).map((b: any) => ({ id: b.id, label: b.name }))}
                type="belt"
                has={hasTarget}
                toggle={toggleTarget}
              />
              <TargetGroup
                label="Status do aluno"
                items={STUDENT_STATUSES.map((s) => ({ id: s.value, label: s.label }))}
                type="status"
                has={hasTarget}
                toggle={toggleTarget}
              />
              <div className="md:col-span-2">
                <TargetGroup
                  label="Alunos específicos"
                  items={(opts.data?.students ?? []).map((s: any) => ({ id: s.id, label: s.full_name }))}
                  type="student"
                  has={hasTarget}
                  toggle={toggleTarget}
                  searchable
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
          <Button variant="secondary" onClick={() => submit(false)} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Salvar rascunho
          </Button>
          <Button onClick={() => submit(true)} disabled={mut.isPending}>
            <Send className="mr-1 h-4 w-4" /> Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function TargetGroup({
  label, items, type, has, toggle, searchable,
}: {
  label: string;
  items: { id: string; label: string }[];
  type: string;
  has: (tt: string, tid: string | null) => boolean;
  toggle: (tt: string, tid: string | null) => void;
  searchable?: boolean;
}) {
  const [s, setS] = useState("");
  const filtered = searchable ? items.filter((i) => i.label.toLowerCase().includes(s.toLowerCase())) : items;
  return (
    <div className="rounded-md border bg-background/60 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {searchable && (
          <Input value={s} onChange={(e) => setS(e.target.value)} placeholder="Buscar..." className="h-7 w-40 text-xs" />
        )}
      </div>
      <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
        {filtered.length === 0 && <span className="text-xs text-muted-foreground">Nenhum item.</span>}
        {filtered.map((it) => {
          const active = has(type, it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => toggle(type, it.id)}
              className={`rounded-full px-2 py-0.5 text-xs ring-1 transition ${
                active ? "bg-primary text-primary-foreground ring-primary" : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ Category Manager ============
function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAnnouncementCategories);
  const saveFn = useServerFn(upsertAnnouncementCategory);
  const delFn = useServerFn(deleteAnnouncementCategory);
  const list = useQuery({ queryKey: ["ann", "cats"], queryFn: () => listFn({}), enabled: open });
  const [name, setName] = useState("");
  const [color, setColor] = useState("#dc2626");

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["ann"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ann"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Categorias de avisos</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 p-1" />
          <Button onClick={() => name.trim() && save.mutate({ name: name.trim(), color })}>Adicionar</Button>
        </div>
        <div className="space-y-1">
          {(list.data ?? []).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                <span className="text-sm">{c.name}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => confirm("Excluir?") && del.mutate(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(list.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma categoria criada.</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Read Report ============
function ReadReportDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const fn = useServerFn(readReport);
  const q = useQuery({ queryKey: ["ann", "report", id], queryFn: () => fn({ data: { id: id! } }), enabled: !!id });
  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Relatório de leituras</DialogTitle></DialogHeader>
        {q.isLoading ? <p className="text-sm">Carregando...</p> : (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-3xl font-bold">{q.data?.percent ?? 0}%</div>
              <div className="text-xs text-muted-foreground">
                {q.data?.reads.length ?? 0} leram / {q.data?.pending.length ?? 0} pendentes
              </div>
            </div>
            <section>
              <h4 className="mb-1 text-sm font-semibold text-emerald-700">Confirmaram leitura</h4>
              <div className="space-y-1">
                {(q.data?.reads ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                    <span>{r.student?.full_name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.read_at).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
                {(q.data?.reads?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">Nenhuma leitura ainda.</p>}
              </div>
            </section>
            <section>
              <h4 className="mb-1 text-sm font-semibold text-amber-700">Pendentes</h4>
              <div className="space-y-1">
                {(q.data?.pending ?? []).map((s: any) => (
                  <div key={s.id} className="rounded border px-2 py-1 text-sm">{s.full_name}</div>
                ))}
              </div>
            </section>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}><X className="h-4 w-4" /></Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Helpers ============
function makeForm(initial: any) {
  if (!initial) {
    return {
      title: "",
      subtitle: "",
      summary: "",
      content: "",
      cover_image: "",
      video_url: "",
      gallery: [],
      attachments: [],
      category_id: null,
      priority: "normal",
      color: "#dc2626",
      icon: "Megaphone",
      author_name: "",
      status: "draft",
      featured: false,
      pinned: false,
      allow_comments: true,
      allow_likes: true,
      require_read_confirmation: false,
      send_notification: true,
      publish_at: new Date().toISOString(),
      expires_at: null,
      target_scope: "all",
      targets: [],
    };
  }
  return {
    ...initial,
    subtitle: initial.subtitle ?? "",
    summary: initial.summary ?? "",
    cover_image: initial.cover_image ?? "",
    video_url: initial.video_url ?? "",
    author_name: initial.author_name ?? "",
    gallery: initial.gallery ?? [],
    attachments: initial.attachments ?? [],
    targets: (initial.targets ?? []).map((t: any) => ({ target_type: t.target_type, target_id: t.target_id })),
  };
}

function toLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}
function fromLocal(v: string) {
  if (!v) return null;
  return new Date(v).toISOString();
}
