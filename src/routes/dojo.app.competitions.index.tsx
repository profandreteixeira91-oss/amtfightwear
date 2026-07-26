import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trophy, RefreshCw, Search, ExternalLink, MapPin, Calendar as CalIcon,
  Globe2, Flag, Plus, Settings2, BarChart3, CalendarDays, Medal, PieChart as PieIcon,
} from "lucide-react";
import { RankingPanel, StatsPanel } from "@/components/dojo/competitions/RankingStatsPanels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  listCompetitions, listCompetitionFilters, createManualCompetition,
} from "@/lib/dojo/competitions/library.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  runCompetitionIngest, getIngestStatus, setSourceEnabled,
  addCompetitionSource, deleteCompetitionSource,
} from "@/lib/dojo/competitions/ingest.functions";
import {
  addCompetitionToCalendar, addCompetitionsBulkToCalendar, listAcademyCompetitions,
  removeAcademyCompetition, getCompetitionsDashboard,
} from "@/lib/dojo/competitions/academy.functions";
import { scopeLabel, tierLabel } from "@/lib/dojo/competitions/classifier";

export const Route = createFileRoute("/dojo/app/competitions/")({
  head: () => ({ meta: [{ title: "Competições — AMT Dojo Manager" }] }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-7">
      {/* ============ HERO — RUBY NOIR ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">Competições</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-300">
              Agregador ao vivo das fontes que você cadastrou + gestão completa da sua academia: calendário, atletas, medalhas e finanças.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-red-500/15 bg-neutral-950/60 p-1 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)]">
          <TabsList className="flex w-max min-w-full flex-nowrap gap-1 bg-transparent p-0">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white"><BarChart3 className="mr-2 h-4 w-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white"><Search className="mr-2 h-4 w-4" /> Biblioteca</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white"><CalendarDays className="mr-2 h-4 w-4" /> Meu Calendário</TabsTrigger>
            <TabsTrigger value="ranking" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white"><Medal className="mr-2 h-4 w-4" /> Ranking</TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white"><PieIcon className="mr-2 h-4 w-4" /> Estatísticas</TabsTrigger>
            <TabsTrigger value="sources" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-red-800 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] text-neutral-300 hover:text-white"><Settings2 className="mr-2 h-4 w-4" /> Fontes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="library"><LibraryTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
        <TabsContent value="ranking"><RankingPanel /></TabsContent>
        <TabsContent value="stats"><StatsPanel /></TabsContent>
        <TabsContent value="sources"><SourcesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ DASHBOARD ============

function DashboardTab() {
  const fn = useServerFn(getCompetitionsDashboard);
  const q = useQuery({ queryKey: ["comp-dashboard"], queryFn: () => fn() });
  const d = q.data;
  const stats = [
    { label: "Competições futuras", value: d?.futureCount ?? 0 },
    { label: "Neste mês", value: d?.thisMonthCount ?? 0 },
    { label: "Internacionais", value: d?.internationalCount ?? 0 },
    { label: "Nacionais", value: d?.nationalCount ?? 0 },
    { label: "Regionais / Estaduais", value: d?.regionalCount ?? 0 },
    { label: "Atletas envolvidos", value: d?.athletesCount ?? 0 },
    { label: "Confirmados", value: d?.confirmedCount ?? 0 },
    { label: "Movimento financeiro", value: `R$ ${((d?.totalFinances ?? 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4">
        <div className="mb-2 text-sm font-semibold">Medalhas conquistadas</div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge className="bg-amber-500">🥇 {d?.medals?.gold ?? 0}</Badge>
          <Badge className="bg-slate-400">🥈 {d?.medals?.silver ?? 0}</Badge>
          <Badge className="bg-orange-600">🥉 {d?.medals?.bronze ?? 0}</Badge>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ============ LIBRARY ============

function LibraryTab() {
  const listFn = useServerFn(listCompetitions);
  const filterFn = useServerFn(listCompetitionFilters);
  const addFn = useServerFn(addCompetitionToCalendar);
  const bulkFn = useServerFn(addCompetitionsBulkToCalendar);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [state, setState] = useState<string>("all");
  const [when, setWhen] = useState<string>("upcoming"); // upcoming | 30 | 90 | past | all
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const dateRange = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (when === "all") return { from: undefined, to: undefined };
    if (when === "past") return { from: undefined, to: startToday };
    if (when === "upcoming") return { from: startToday, to: undefined };
    const days = Number(when);
    const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    return { from: startToday, to };
  }, [when]);

  const filters = useQuery({ queryKey: ["comp-filters"], queryFn: () => filterFn() });
  const list = useQuery({
    queryKey: ["comp-lib", q, scope, country, state, when],
    queryFn: () => listFn({ data: {
      q: q || undefined,
      scope: scope !== "all" ? (scope as "international" | "national" | "regional" | "state" | "municipal") : undefined,
      country: country !== "all" ? country : undefined,
      state: state !== "all" ? state : undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
      page: 1, pageSize: 60,
    } }),
  });

  const invalidateAfterAdd = () => {
    qc.invalidateQueries({ queryKey: ["comp-academy"] });
    qc.invalidateQueries({ queryKey: ["comp-dashboard"] });
  };

  const addMut = useMutation({
    mutationFn: (id: string) => addFn({ data: { competition_id: id, visibility: "all" } }),
    onSuccess: () => { toast.success("Competição adicionada ao seu calendário"); invalidateAfterAdd(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: (ids: string[]) => bulkFn({ data: { competition_ids: ids, visibility: "all" } }),
    onSuccess: (r) => {
      toast.success(`${r.inserted} competições adicionadas ao calendário`);
      setSelected(new Set());
      invalidateAfterAdd();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const rows = list.data?.rows ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    if (allSelected) return new Set();
    const n = new Set(prev);
    for (const r of rows) n.add(r.id);
    return n;
  });

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, organização, cidade..." className="pl-8" />
          </div>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger><SelectValue placeholder="Escopo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os escopos</SelectItem>
              <SelectItem value="international">Internacional</SelectItem>
              <SelectItem value="national">Nacional</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="state">Estadual</SelectItem>
              <SelectItem value="municipal">Municipal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os países</SelectItem>
              {(filters.data?.countries ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {(filters.data?.states ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{list.isLoading ? "Carregando..." : `${list.data?.total ?? 0} competições encontradas`}</span>
          <div className="flex items-center gap-2">
            <NewCompetitionDialog onCreated={() => {
              qc.invalidateQueries({ queryKey: ["comp-lib"] });
              qc.invalidateQueries({ queryKey: ["comp-filters"] });
            }} />
            <Button size="sm" variant="outline" onClick={toggleAll} disabled={rows.length === 0}>
              {allSelected ? "Limpar seleção" : "Selecionar todas"}
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || bulkMut.isPending}
              onClick={() => bulkMut.mutate(Array.from(selected))}
            >
              <Plus className="mr-1 h-3 w-3" />
              {bulkMut.isPending ? "Adicionando..." : `Adicionar ${selected.size || ""} ao calendário`}
            </Button>
          </div>
        </div>
      </CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <CompetitionCard
            key={c.id}
            c={c}
            selected={selected.has(c.id)}
            onToggleSelect={() => toggle(c.id)}
            onAdd={() => addMut.mutate(c.id)}
            adding={addMut.isPending}
          />
        ))}
        {!list.isLoading && rows.length === 0 && (
          <div className="col-span-full rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma competição encontrada. Ajuste os filtros ou execute a coleta na aba <b>Fontes</b>.
          </div>
        )}
      </div>
    </div>
  );
}

type LibraryRow = {
  id: string;
  name: string;
  organization: string | null;
  scope: string | null;
  tier: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  venue: string | null;
  start_at: string | null;
  end_at: string | null;
  registration_deadline: string | null;
  price: number | null;
  currency: string | null;
  official_url: string | null;
  registration_url: string | null;
  source_code: string | null;
};

function CompetitionCard({ c, onAdd, adding, selected, onToggleSelect }: {
  c: LibraryRow;
  onAdd: () => void;
  adding: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const scopeColor = c.scope === "international" ? "bg-purple-600"
    : c.scope === "national" ? "bg-emerald-600"
    : c.scope === "regional" ? "bg-blue-600"
    : c.scope === "state" ? "bg-sky-600"
    : "bg-zinc-500";
  return (
    <Card className={cn("flex flex-col", selected && "ring-2 ring-primary")}>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelect}
              className="mt-1 h-4 w-4 cursor-pointer"
              aria-label="Selecionar competição"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1">
              <Badge className={cn("text-[10px]", scopeColor)}>{scopeLabel(c.scope)}</Badge>
              {c.tier && c.tier !== "other" && <Badge variant="outline" className="text-[10px]">{tierLabel(c.tier)}</Badge>}
            </div>
            <h3 className="mt-1 line-clamp-2 font-semibold">{c.name}</h3>
            {c.organization && <p className="text-xs text-muted-foreground">{c.organization}</p>}
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {c.start_at && (
            <div className="flex items-center gap-1"><CalIcon className="h-3 w-3" />
              {new Date(c.start_at).toLocaleDateString("pt-BR")}
              {c.end_at && ` – ${new Date(c.end_at).toLocaleDateString("pt-BR")}`}
            </div>
          )}
          {(c.city || c.state || c.country) && (
            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />
              {[c.city, c.state, c.country].filter(Boolean).join(", ")}
            </div>
          )}
          {c.venue && <div className="pl-4 italic">{c.venue}</div>}
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Button size="sm" onClick={onAdd} disabled={adding} className="flex-1">
            <Plus className="mr-1 h-3 w-3" /> Adicionar
          </Button>
          {c.official_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={c.official_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MEU CALENDÁRIO ============

type AcademyRow = {
  id: string;
  status: string;
  visibility: string;
  notes: string | null;
  competition: LibraryRow | null;
};

function CalendarTab() {
  const listFn = useServerFn(listAcademyCompetitions);
  const removeFn = useServerFn(removeAcademyCompetition);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["comp-academy"], queryFn: () => listFn() });
  const rows = (q.data ?? []) as unknown as AcademyRow[];

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removida do calendário");
      qc.invalidateQueries({ queryKey: ["comp-academy"] });
      qc.invalidateQueries({ queryKey: ["comp-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [scope, setScope] = useState<string>("all");
  const filtered = useMemo(
    () => scope === "all" ? rows : rows.filter((r) => r.competition?.scope === scope),
    [rows, scope],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Escopo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="international">Internacionais</SelectItem>
            <SelectItem value="national">Nacionais</SelectItem>
            <SelectItem value="regional">Regionais</SelectItem>
            <SelectItem value="state">Estaduais</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">{filtered.length} no calendário</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 font-semibold">{r.competition?.name ?? "—"}</h3>
                <Badge variant="outline">{scopeLabel(r.competition?.scope)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {r.competition?.start_at && new Date(r.competition.start_at).toLocaleDateString("pt-BR")}
                {r.competition?.city && ` · ${r.competition.city}`}
                {r.competition?.state && `/${r.competition.state}`}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" asChild className="flex-1">
                  <Link to="/dojo/app/competitions/$id" params={{ id: r.id }}>Gerenciar</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  if (confirm("Remover do calendário?")) removeMut.mutate(r.id);
                }}>Remover</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!q.isLoading && filtered.length === 0 && (
          <div className="col-span-full rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma competição no seu calendário. Adicione pela aba <b>Biblioteca</b>.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ FONTES ============

function SourcesTab() {
  const statusFn = useServerFn(getIngestStatus);
  const runFn = useServerFn(runCompetitionIngest);
  const toggleFn = useServerFn(setSourceEnabled);
  const addFn = useServerFn(addCompetitionSource);
  const delFn = useServerFn(deleteCompetitionSource);
  const qc = useQueryClient();

  const s = useQuery({ queryKey: ["comp-ingest-status"], queryFn: () => statusFn() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["comp-ingest-status"] });
    qc.invalidateQueries({ queryKey: ["comp-lib"] });
  };

  const runMut = useMutation({
    mutationFn: (codes?: string[]) => runFn({ data: { onlySourceCodes: codes } }),
    onSuccess: () => { toast.success("Coleta concluída"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (p: { id: string; enabled: boolean }) => toggleFn({ data: p }),
    onSuccess: invalidate,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Fonte removida"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState({ code: "", name: "", url: "", country: "" });
  const addMut = useMutation({
    mutationFn: () => addFn({
      data: {
        code: form.code.trim(),
        name: form.name.trim(),
        url: form.url.trim(),
        country: form.country.trim() || null,
      },
    }),
    onSuccess: () => {
      toast.success("Fonte adicionada");
      setForm({ code: "", name: "", url: "", country: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-semibold">Motor de coleta</div>
          <div className="text-xs text-muted-foreground">
            Roda automaticamente a cada 6 horas. Você também pode acionar manualmente abaixo.
          </div>
        </div>
        <Button onClick={() => runMut.mutate(undefined)} disabled={runMut.isPending}>
          <RefreshCw className={cn("mr-2 h-4 w-4", runMut.isPending && "animate-spin")} />
          {runMut.isPending ? "Coletando..." : "Rodar agora"}
        </Button>
      </CardContent></Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Adicionar fonte personalizada
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Código (ex: minha_liga)" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input placeholder="Nome exibido" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="URL do calendário" value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input placeholder="País (opcional)" value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button size="sm"
              disabled={addMut.isPending || !form.code || !form.name || !form.url}
              onClick={() => addMut.mutate()}>
              {addMut.isPending ? "Adicionando..." : "Adicionar fonte"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O sistema fará scraping da URL informada e detectará eventos automaticamente.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {(s.data?.sources ?? []).map((src) => (
          <Card key={src.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  {(src.config as { country?: string } | null)?.country && (src.config as { country?: string }).country !== "BR" ? <Globe2 className="h-4 w-4 text-purple-500" /> : <Flag className="h-4 w-4 text-emerald-500" />}
                  {src.name}
                  {src.connector === "custom" && <Badge variant="secondary">custom</Badge>}
                  {!src.enabled && <Badge variant="outline">desativada</Badge>}
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  {src.url}
                  {src.last_run_at && ` · última coleta: ${new Date(src.last_run_at).toLocaleString("pt-BR")}`}
                  {src.last_status === "error" && src.last_error && <span className="text-red-500"> · erro: {src.last_error}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => runMut.mutate([src.code])} disabled={runMut.isPending}>
                  Rodar
                </Button>
                <Button size="sm" variant={src.enabled ? "outline" : "default"} onClick={() => toggleMut.mutate({ id: src.id, enabled: !src.enabled })}>
                  {src.enabled ? "Desativar" : "Ativar"}
                </Button>
                {src.connector === "custom" && (
                  <Button size="sm" variant="destructive"
                    onClick={() => { if (confirm(`Remover "${src.name}"?`)) delMut.mutate(src.id); }}
                    disabled={delMut.isPending}>
                    Excluir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ NOVA COMPETIÇÃO (MANUAL) ============

function NewCompetitionDialog({ onCreated }: { onCreated: () => void }) {
  const createFn = useServerFn(createManualCompetition);
  const [open, setOpen] = useState(false);
  const empty = {
    name: "", organization: "", scope: "national" as
      "international" | "national" | "regional" | "state" | "municipal",
    modality: "", country: "Brasil", state: "", city: "", venue: "", address: "",
    start_at: "", end_at: "", registration_deadline: "",
    price: "", currency: "BRL",
    official_url: "", registration_url: "",
    contact_email: "", contact_phone: "",
    description: "",
  };
  const [f, setF] = useState(empty);

  const toIso = (v: string) => v ? new Date(v).toISOString() : null;

  const mut = useMutation({
    mutationFn: () => createFn({
      data: {
        name: f.name.trim(),
        organization: f.organization.trim() || null,
        description: f.description.trim() || null,
        modality: f.modality.trim() || null,
        scope: f.scope,
        country: f.country.trim() || null,
        state: f.state.trim() || null,
        city: f.city.trim() || null,
        venue: f.venue.trim() || null,
        address: f.address.trim() || null,
        start_at: toIso(f.start_at),
        end_at: toIso(f.end_at),
        registration_deadline: toIso(f.registration_deadline),
        price: f.price ? Number(f.price) : null,
        currency: f.currency.trim() || "BRL",
        official_url: f.official_url.trim() || null,
        registration_url: f.registration_url.trim() || null,
        contact_email: f.contact_email.trim() || null,
        contact_phone: f.contact_phone.trim() || null,
      },
    }),
    onSuccess: () => {
      toast.success("Competição cadastrada");
      setF(empty);
      setOpen(false);
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="mr-1 h-3 w-3" /> Nova competição
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar competição manualmente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome *</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Ex: Copa Regional de Jiu-Jitsu 2026" />
          </div>
          <div>
            <Label>Organização</Label>
            <Input value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} />
          </div>
          <div>
            <Label>Modalidade</Label>
            <Input value={f.modality} onChange={(e) => setF({ ...f, modality: e.target.value })}
              placeholder="Jiu-Jitsu, Judô, MT..." />
          </div>
          <div>
            <Label>Escopo</Label>
            <Select value={f.scope} onValueChange={(v) => setF({ ...f, scope: v as typeof f.scope })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="international">Internacional</SelectItem>
                <SelectItem value="national">Nacional</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="state">Estadual</SelectItem>
                <SelectItem value="municipal">Municipal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>País</Label>
            <Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} />
          </div>
          <div>
            <Label>Estado (UF)</Label>
            <Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </div>
          <div>
            <Label>Ginásio / Local</Label>
            <Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </div>
          <div>
            <Label>Início</Label>
            <Input type="datetime-local" value={f.start_at}
              onChange={(e) => setF({ ...f, start_at: e.target.value })} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="datetime-local" value={f.end_at}
              onChange={(e) => setF({ ...f, end_at: e.target.value })} />
          </div>
          <div>
            <Label>Prazo de inscrição</Label>
            <Input type="datetime-local" value={f.registration_deadline}
              onChange={(e) => setF({ ...f, registration_deadline: e.target.value })} />
          </div>
          <div>
            <Label>Valor da inscrição</Label>
            <Input type="number" step="0.01" value={f.price}
              onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0,00" />
          </div>
          <div>
            <Label>Site oficial</Label>
            <Input value={f.official_url} onChange={(e) => setF({ ...f, official_url: e.target.value })}
              placeholder="https://..." />
          </div>
          <div>
            <Label>URL de inscrição</Label>
            <Input value={f.registration_url} onChange={(e) => setF({ ...f, registration_url: e.target.value })}
              placeholder="https://..." />
          </div>
          <div>
            <Label>E-mail de contato</Label>
            <Input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!f.name.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
