import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search, Filter, Mail, MessageCircle, Instagram, Globe, Sparkles,
  ChevronLeft, ChevronRight, Star, ExternalLink, Radar, Trash2, Wand2, Loader2,
  MapPin, Phone, Send,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listLeads, enrichLead, enrichPendingLeads, bulkDeleteLeads, bulkUpdateLeads,
  logContactAction,
} from "@/lib/prospect/prospect.functions";
import { PIPELINE_STAGES, BR_STATES } from "@/features/prospect/types";
import { fmtDate, scoreToStars } from "@/features/prospect/utils";
import {
  addToMacroQueue, isInMacroQueue, removeFromMacroQueue,
  subscribeMacroQueue, getMacroQueue,
} from "@/features/prospect/utils/macro-queue";

export const Route = createFileRoute("/_authenticated/admin/leads/")({
  head: () => ({ meta: [{ title: "Leads — Prospect Engine" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    focus: typeof s.focus === "string" ? s.focus : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    pipeline_stage: typeof s.pipeline_stage === "string" ? s.pipeline_stage : undefined,
  }),
  component: LeadsPage,
});

type Contact = { company_id: string; channel: string; value: string; is_primary: boolean };
type LeadRow = Record<string, unknown> & { id: string; contacts: Contact[] };

const PAGE_SIZE = 25;

function LeadsPage() {
  const { focus } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [state, setState] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [minScore, setMinScore] = useState(0);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasWa, setHasWa] = useState(false);
  const [hasIg, setHasIg] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<string>("");
  const focusedRowRef = useRef<HTMLTableRowElement | null>(null);
  const [macroQueue, setMacroQueue] = useState<string[]>(() => getMacroQueue());
  useEffect(() => subscribeMacroQueue(() => setMacroQueue(getMacroQueue())), []);
  const macroSet = useMemo(() => new Set(macroQueue), [macroQueue]);

  const qc = useQueryClient();
  const fetchList = useServerFn(listLeads);
  const enrich = useServerFn(enrichLead);
  const enrichPending = useServerFn(enrichPendingLeads);
  const bulkDelete = useServerFn(bulkDeleteLeads);
  const bulkUpdate = useServerFn(bulkUpdateLeads);
  const logContact = useServerFn(logContactAction);

  const filters = { search, state, stage, minScore, hasEmail, hasWa, hasIg };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "leads", filters, page],
    queryFn: () =>
      fetchList({
        data: {
          search: search || undefined,
          state: state || undefined,
          pipeline_stage: stage || undefined,
          minScore: minScore || undefined,
          hasEmail: hasEmail || undefined,
          hasWhatsapp: hasWa || undefined,
          hasInstagram: hasIg || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          orderBy: "created_at",
          orderDir: "desc",
        },
      }),
  });

  const enrichMut = useMutation({
    mutationFn: (id: string) => enrich({ data: { companyId: id } }),
    onSuccess: (r) => {
      toast.success(`Lead enriquecido — score ${r.score}`);
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao enriquecer"),
  });

  const bulkEnrichMut = useMutation({
    mutationFn: (ids?: string[]) => enrichPending({ data: { ids, limit: ids?.length ?? 20 } }),
    onSuccess: (r) => {
      toast.success(`Enriquecimento: ${r.ok} ✓ · ${r.notFound} parcial · ${r.failed} falha`);
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha no lote"),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => bulkDelete({ data: { ids } }),
    onSuccess: (r) => {
      toast.success(`${r.deleted} leads excluídos`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao excluir"),
  });

  const bulkStageMut = useMutation({
    mutationFn: (v: { ids: string[]; pipeline_stage: string }) =>
      bulkUpdate({ data: { ids: v.ids, patch: { pipeline_stage: v.pipeline_stage } } }),
    onSuccess: (r) => {
      toast.success(`${r.updated} leads atualizados`);
      setSelected(new Set());
      setBulkStage("");
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const rowStageMut = useMutation({
    mutationFn: (v: { id: string; pipeline_stage: string }) =>
      bulkUpdate({ data: { ids: [v.id], patch: { pipeline_stage: v.pipeline_stage } } }),
    onSuccess: () => {
      toast.success("Estágio atualizado");
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const rowDeleteMut = useMutation({
    mutationFn: (id: string) => bulkDelete({ data: { ids: [id] } }),
    onSuccess: () => {
      toast.success("Lead excluído");
      qc.invalidateQueries({ queryKey: ["prospect"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao excluir"),
  });

  const openIgMut = useMutation({
    mutationFn: (id: string) => logContact({ data: { companyId: id, channel: "instagram" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospect"] }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = (data?.rows ?? []) as LeadRow[];

  useEffect(() => {
    if (!focus) return;
    if (!rows.some((r) => r.id === focus)) return;
    const t = setTimeout(() => {
      focusedRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => clearTimeout(t);
  }, [focus, rows]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id));

  const toggleAll = (v: boolean) => {
    const next = new Set(selected);
    if (v) rows.forEach((r) => next.add(r.id));
    else rows.forEach((r) => next.delete(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <PageShell
        eyebrow="Prospect Engine"
        title="Leads"
        description={`${total} leads na base — selecione múltiplos para excluir, editar ou enriquecer em lote.`}
        actions={
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => bulkEnrichMut.mutate(undefined)}
              disabled={bulkEnrichMut.isPending}
            >
              {bulkEnrichMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Enriquecer pendentes
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/admin/leads/macro">
                <Instagram className="mr-2 h-4 w-4" />Macro DM
                {macroQueue.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {macroQueue.length}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link to="/admin/leads/busca"><Radar className="mr-2 h-4 w-4" />Nova busca</Link>
            </Button>
          </div>
        }
      >

      <Card className="mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-12">
            <div className="relative md:col-span-4">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome da empresa..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <div className="md:col-span-2">
              <Select value={state || "all"} onValueChange={(v) => { setState(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estados</SelectItem>
                  {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={stage || "all"} onValueChange={(v) => { setStage(v === "all" ? "" : v); setPage(0); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Estágio do pipeline" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estágios</SelectItem>
                  {PIPELINE_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={String(minScore)} onValueChange={(v) => { setMinScore(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Score mínimo" /></SelectTrigger>
                <SelectContent>
                  {[0, 20, 40, 60, 80].map((n) => <SelectItem key={n} value={String(n)}>Score ≥ {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex w-full items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:w-auto">
              <Filter className="h-3 w-3" />Filtros rápidos:
            </span>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={hasEmail} onCheckedChange={(v) => { setHasEmail(!!v); setPage(0); }} />
              <Mail className="h-3.5 w-3.5" /> <span className="text-xs sm:text-sm">Com e-mail</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={hasWa} onCheckedChange={(v) => { setHasWa(!!v); setPage(0); }} />
              <MessageCircle className="h-3.5 w-3.5" /> <span className="text-xs sm:text-sm">Com WhatsApp</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox checked={hasIg} onCheckedChange={(v) => { setHasIg(!!v); setPage(0); }} />
              <Instagram className="h-3.5 w-3.5" /> <span className="text-xs sm:text-sm">Com Instagram</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Barra de ações em lote */}
      {selected.size > 0 && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{selected.size} selecionado(s)</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <Select value={bulkStage} onValueChange={setBulkStage}>
              <SelectTrigger className="h-9 w-full lg:w-[220px]"><SelectValue placeholder="Mover para estágio..." /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="w-full lg:w-auto"
              disabled={!bulkStage || bulkStageMut.isPending}
              onClick={() => bulkStageMut.mutate({ ids: selectedIds, pipeline_stage: bulkStage })}
            >
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full lg:w-auto"
              disabled={bulkEnrichMut.isPending}
              onClick={() => bulkEnrichMut.mutate(selectedIds)}
            >
              {bulkEnrichMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Enriquecer
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full lg:w-auto"
              onClick={() => {
                const added = addToMacroQueue(selectedIds);
                toast.success(
                  added > 0
                    ? `${added} lead(s) adicionado(s) ao Macro DM`
                    : "Todos já estavam na fila do Macro DM",
                );
              }}
            >
              <Send className="mr-2 h-4 w-4" />Macro
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="w-full lg:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" />Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {selected.size} lead(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é permanente. Contatos, timeline e enriquecimentos associados também serão removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkDeleteMut.mutate(selectedIds)}>
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {error && <ErrorState message={String(error)} onRetry={() => refetch()} />}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[640px] md:min-w-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum lead encontrado com esses filtros.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allChecked ? true : someChecked ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleAll(!!v)}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Localização</TableHead>
                  <TableHead className="hidden lg:table-cell">Estágio</TableHead>
                  <TableHead>Canais</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="hidden lg:table-cell">Captado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const stageDef = PIPELINE_STAGES.find((s) => s.id === (r.pipeline_stage as string));
                  const email = r.contacts.find((c) => c.channel === "email")?.value;
                  const wa = r.contacts.find((c) => c.channel === "whatsapp")?.value;
                  const ig = r.contacts.find((c) => c.channel === "instagram")?.value;
                  const stars = scoreToStars(Number(r.score) || 0);
                  const isSel = selected.has(r.id);
                  const isFocused = focus === r.id;
                  return (
                    <TableRow
                      key={r.id}
                      ref={isFocused ? focusedRowRef : undefined}
                      data-state={isSel ? "selected" : undefined}
                      className={isFocused ? "bg-primary/10 ring-2 ring-primary/60 ring-inset animate-pulse" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={(v) => toggleOne(r.id, !!v)}
                          aria-label={`Selecionar ${String(r.name)}`}
                        />
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link to="/admin/leads/$id" params={{ id: r.id }} className="truncate font-semibold hover:text-primary">
                            {String(r.name)}
                          </Link>
                          {r.quality_tier ? (
                            <Badge
                              variant="outline"
                              className={
                                r.quality_tier === "excelente" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 h-4" :
                                r.quality_tier === "bom" ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] px-1.5 h-4" :
                                "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 h-4"
                              }
                            >
                              {r.quality_tier === "excelente" ? "★ Excelente" : r.quality_tier === "bom" ? "Bom" : "Regular"}
                            </Badge>
                          ) : null}
                        </div>
                        {r.category ? (
                          <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{String(r.category)}</div>
                        ) : null}
                        {r.rating ? (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-foreground">{Number(r.rating).toFixed(1)}</span>
                            <span>({Number(r.rating_count ?? 0)})</span>
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {r.city ? `${r.city}${r.state ? " — " + r.state : ""}` : (r.state ? String(r.state) : "—")}
                        {r.address ? (
                          <div className="mt-0.5 line-clamp-1 text-[11px] opacity-70">{String(r.address)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Select
                          value={(r.pipeline_stage as string) || ""}
                          onValueChange={(v) => rowStageMut.mutate({ id: r.id, pipeline_stage: v })}
                        >
                          <SelectTrigger className="h-8 w-[170px]">
                            <SelectValue placeholder="—">
                              {stageDef ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${stageDef.color}`} />
                                  <span className="text-xs">{stageDef.label}</span>
                                </span>
                              ) : "—"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {email && <Badge variant="secondary" className="gap-1 px-1.5"><Mail className="h-3 w-3" /></Badge>}
                          {wa && <Badge variant="secondary" className="gap-1 px-1.5"><MessageCircle className="h-3 w-3" /></Badge>}
                          {ig && <Badge variant="secondary" className="gap-1 px-1.5"><Instagram className="h-3 w-3" /></Badge>}
                          {r.website ? <Badge variant="secondary" className="gap-1 px-1.5"><Globe className="h-3 w-3" /></Badge> : null}
                          {!email && !wa && !ig && !r.website && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                          ))}
                          <span className="ml-1 text-xs font-semibold text-muted-foreground">{Number(r.score) || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {fmtDate(String(r.created_at))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-0.5">

                          {r.google_maps_url ? (
                            <Button
                              asChild size="sm" variant="ghost" title="Abrir no Google Maps"
                            >
                              <a href={String(r.google_maps_url)} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          {r.phone ? (
                            <Button
                              asChild size="sm" variant="ghost" title={`Ligar ${String(r.phone)}`}
                            >
                              <a href={`tel:${String(r.phone).replace(/[^\d+]/g,"")}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          {ig && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Abrir Instagram e marcar contato iniciado"
                              onClick={() => {
                                const raw = String(ig).trim();
                                const url = /^https?:\/\//i.test(raw)
                                  ? raw
                                  : `https://instagram.com/${raw.replace(/^@/, "")}`;
                                window.open(url, "_blank", "noopener,noreferrer");
                                openIgMut.mutate(r.id);
                              }}
                            >
                              <Instagram className="h-4 w-4" />
                            </Button>
                          )}
                          {ig && (
                            (() => {
                              const inQueue = macroSet.has(r.id);
                              return (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={inQueue ? "Remover do Macro DM" : "Adicionar ao Macro DM"}
                                  onClick={() => {
                                    if (inQueue) {
                                      removeFromMacroQueue(r.id);
                                      toast("Removido do Macro DM");
                                    } else {
                                      addToMacroQueue(r.id);
                                      toast.success("Adicionado ao Macro DM");
                                    }
                                  }}
                                >
                                  <Send className={`h-4 w-4 ${inQueue ? "text-primary" : ""}`} />
                                </Button>
                              );
                            })()
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Enriquecer"
                            onClick={() => enrichMut.mutate(r.id)}
                            disabled={enrichMut.isPending}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button asChild size="sm" variant="ghost" title="Abrir">
                            <Link to="/admin/leads/$id" params={{ id: r.id }}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" title="Excluir">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {String(r.name)} — esta ação é permanente e remove contatos e timeline associados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => rowDeleteMut.mutate(r.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </PageShell>
  );
}
