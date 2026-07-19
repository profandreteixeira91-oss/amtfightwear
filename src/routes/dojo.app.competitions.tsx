import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trophy, RefreshCw, Search, ExternalLink, MapPin, Calendar as CalIcon,
  Globe2, Flag, Plus, Settings2, BarChart3, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  listCompetitions, listCompetitionFilters,
} from "@/lib/dojo/competitions/library.functions";
import {
  runCompetitionIngest, getIngestStatus, setSourceEnabled,
  addCompetitionSource, deleteCompetitionSource,
} from "@/lib/dojo/competitions/ingest.functions";
import {
  addCompetitionToCalendar, listAcademyCompetitions,
  removeAcademyCompetition, getCompetitionsDashboard,
} from "@/lib/dojo/competitions/academy.functions";
import { scopeLabel, tierLabel } from "@/lib/dojo/competitions/classifier";

export const Route = createFileRoute("/dojo/app/competitions")({
  head: () => ({ meta: [{ title: "Competições — AMT Dojo Manager" }] }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 text-amber-500" />
            Hub de Competições
          </h1>
          <p className="text-sm text-muted-foreground">
            Agregador de competições oficiais + gestão completa da sua academia.
          </p>
        </div>
      </header>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dashboard"><BarChart3 className="mr-2 h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="library"><Search className="mr-2 h-4 w-4" /> Biblioteca</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" /> Meu Calendário</TabsTrigger>
          <TabsTrigger value="sources"><Settings2 className="mr-2 h-4 w-4" /> Fontes</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="library"><LibraryTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
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
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [state, setState] = useState<string>("all");

  const filters = useQuery({ queryKey: ["comp-filters"], queryFn: () => filterFn() });
  const list = useQuery({
    queryKey: ["comp-lib", q, scope, country, state],
    queryFn: () => listFn({ data: {
      q: q || undefined,
      scope: scope !== "all" ? (scope as "international" | "national" | "regional" | "state" | "municipal") : undefined,
      country: country !== "all" ? country : undefined,
      state: state !== "all" ? state : undefined,
      page: 1, pageSize: 60,
    } }),
  });

  const addMut = useMutation({
    mutationFn: (id: string) => addFn({ data: { competition_id: id, visibility: "all" } }),
    onSuccess: () => {
      toast.success("Competição adicionada ao seu calendário");
      qc.invalidateQueries({ queryKey: ["comp-academy"] });
      qc.invalidateQueries({ queryKey: ["comp-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
        <div className="text-xs text-muted-foreground">
          {list.isLoading ? "Carregando..." : `${list.data?.total ?? 0} competições encontradas`}
        </div>
      </CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(list.data?.rows ?? []).map((c) => (
          <CompetitionCard key={c.id} c={c} onAdd={() => addMut.mutate(c.id)} adding={addMut.isPending} />
        ))}
        {!list.isLoading && (list.data?.rows ?? []).length === 0 && (
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

function CompetitionCard({ c, onAdd, adding }: { c: LibraryRow; onAdd: () => void; adding: boolean }) {
  const scopeColor = c.scope === "international" ? "bg-purple-600"
    : c.scope === "national" ? "bg-emerald-600"
    : c.scope === "regional" ? "bg-blue-600"
    : c.scope === "state" ? "bg-sky-600"
    : "bg-zinc-500";
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
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
  const qc = useQueryClient();

  const s = useQuery({ queryKey: ["comp-ingest-status"], queryFn: () => statusFn() });

  const runMut = useMutation({
    mutationFn: (codes?: string[]) => runFn({ data: { onlySourceCodes: codes } }),
    onSuccess: () => {
      toast.success("Coleta concluída");
      qc.invalidateQueries({ queryKey: ["comp-ingest-status"] });
      qc.invalidateQueries({ queryKey: ["comp-lib"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (p: { id: string; enabled: boolean }) => toggleFn({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comp-ingest-status"] }),
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

      <div className="grid gap-2">
        {(s.data?.sources ?? []).map((src) => (
          <Card key={src.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  {(src.config as { country?: string } | null)?.country && (src.config as { country?: string }).country !== "BR" ? <Globe2 className="h-4 w-4 text-purple-500" /> : <Flag className="h-4 w-4 text-emerald-500" />}
                  {src.name}
                  {!src.enabled && <Badge variant="outline">desativada</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
