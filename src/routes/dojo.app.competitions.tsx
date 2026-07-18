import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trophy, Plus, RefreshCw, Search, Filter, ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { listCompetitions, upsertCompetition, syncCompetitions } from "@/lib/dojo/competitions.functions";
import { PROVIDERS, providerLabel } from "@/lib/dojo/competitions/providers";
import { CompetitionCalendar } from "@/components/dojo/competitions/CompetitionCalendar";
import { CompetitionDetailSheet } from "@/components/dojo/competitions/CompetitionDetailSheet";
import { CompetitionFormDialog, type CompetitionFormValues } from "@/components/dojo/competitions/CompetitionFormDialog";

export const Route = createFileRoute("/dojo/app/competitions")({
  head: () => ({ meta: [{ title: "Competições — AMT Dojo Manager" }] }),
  component: CompetitionsPage,
});

type View = "month" | "week" | "list";

function CompetitionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCompetitions);
  const upsertFn = useServerFn(upsertCompetition);
  const syncFn = useServerFn(syncCompetitions);

  const q = useQuery({ queryKey: ["dojo-competitions"], queryFn: () => listFn() });

  const [view, setView] = useState<View>("list");
  const [cursor, setCursor] = useState(new Date());
  const [query, setQuery] = useState("");
  const [fState, setFState] = useState("");
  const [fCity, setFCity] = useState("");
  const [fProvider, setFProvider] = useState("");
  const [fModality, setFModality] = useState("");
  const [fGi, setFGi] = useState<"all" | "gi" | "nogi">("all");
  const [fAge, setFAge] = useState<"all" | "kids" | "adult" | "master">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<CompetitionFormValues> | null>(null);

  const competitions = q.data ?? [];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return competitions.filter((c: any) => {
      if (term) {
        const hay = [c.name, c.city, c.state, c.organizer, c.modality, providerLabel(c.provider)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (fState && (c.state ?? "").toUpperCase() !== fState.toUpperCase()) return false;
      if (fCity && !(c.city ?? "").toLowerCase().includes(fCity.toLowerCase())) return false;
      if (fProvider && c.provider !== fProvider) return false;
      if (fModality && !(c.modality ?? "").toLowerCase().includes(fModality.toLowerCase())) return false;
      if (fGi === "gi" && c.with_gi !== true) return false;
      if (fGi === "nogi" && c.with_gi !== false) return false;
      if (fAge !== "all") {
        const groups = (c.age_groups ?? []).map((s: string) => s.toLowerCase()).join(" ");
        const key = fAge === "kids" ? "infant" : fAge === "master" ? "master" : "adult";
        if (!groups.includes(key)) return false;
      }
      return true;
    });
  }, [competitions, query, fState, fCity, fProvider, fModality, fGi, fAge]);

  const now = new Date();
  const stats = useMemo(() => {
    let upcoming = 0, thisMonth = 0, completed = 0, totalAthletes = 0;
    for (const c of competitions as any[]) {
      totalAthletes += c.athletes_count ?? 0;
      if (!c.starts_at) continue;
      const d = new Date(c.starts_at);
      if (d < now) completed++;
      else {
        upcoming++;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) thisMonth++;
      }
    }
    return { upcoming, thisMonth, completed, totalAthletes };
  }, [competitions, now]);

  const shift = (dir: number) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  };

  const doSync = async () => {
    try {
      const res = await syncFn();
      const total = res.summary.reduce((s, r) => s + r.inserted + r.updated, 0);
      toast.success(total > 0 ? `${total} competições sincronizadas` : "Nenhuma nova competição encontrada", {
        description: "Sincronização automática está preparada; provedores públicos serão ativados conforme disponibilizarem APIs.",
      });
      qc.invalidateQueries({ queryKey: ["dojo-competitions"] });
    } catch (e: any) { toast.error("Erro ao sincronizar", { description: e.message }); }
  };

  const openNew = () => { setFormInitial(null); setFormOpen(true); };
  const openEdit = (c: any) => {
    setFormInitial({
      id: c.id, provider: c.provider, name: c.name, external_url: c.external_url,
      banner_url: c.banner_url, starts_at: c.starts_at, ends_at: c.ends_at,
      registration_deadline: c.registration_deadline, city: c.city, state: c.state,
      venue_name: c.venue_name, address: c.address, organizer: c.organizer,
      description: c.description, modality: c.modality, with_gi: c.with_gi,
      entry_fee: c.entry_fee, categories: c.categories,
    });
    setFormOpen(true);
    setDetailId(null);
  };

  const onSubmit = async (values: CompetitionFormValues) => {
    try {
      await upsertFn({ data: values as any });
      toast.success(values.id ? "Competição atualizada" : "Competição criada");
      qc.invalidateQueries({ queryKey: ["dojo-competitions"] });
    } catch (e: any) { toast.error(e.message); throw e; }
  };

  const cursorLabel = view === "month"
    ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : view === "week"
      ? `Semana de ${cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
      : "Lista";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">Competições</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize competições, organize seus atletas e acompanhe o calendário de campeonatos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={doSync}>
            <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova competição
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Competições futuras" value={stats.upcoming} />
        <StatCard label="Este mês" value={stats.thisMonth} />
        <StatCard label="Atletas inscritos" value={stats.totalAthletes} />
        <StatCard label="Concluídas" value={stats.completed} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Pesquisar por nome, cidade, estado, organizador, modalidade…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[color:var(--dojo-border)] bg-white p-1">
              {([
                { id: "month", label: "Mês", icon: LayoutGrid },
                { id: "week", label: "Semana", icon: CalendarDays },
                { id: "list", label: "Lista", icon: ListIcon },
              ] as const).map((v) => {
                const Icon = v.icon;
                const active = view === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <Input placeholder="UF" value={fState} onChange={(e) => setFState(e.target.value.toUpperCase())} maxLength={2} />
            <Input placeholder="Cidade" value={fCity} onChange={(e) => setFCity(e.target.value)} />
            <select className="h-10 rounded border bg-background px-2 text-sm" value={fProvider} onChange={(e) => setFProvider(e.target.value)}>
              <option value="">Organizador</option>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <Input placeholder="Modalidade" value={fModality} onChange={(e) => setFModality(e.target.value)} />
            <select className="h-10 rounded border bg-background px-2 text-sm" value={fGi} onChange={(e) => setFGi(e.target.value as any)}>
              <option value="all">Kimono</option>
              <option value="gi">Com kimono</option>
              <option value="nogi">Sem kimono</option>
            </select>
            <select className="h-10 rounded border bg-background px-2 text-sm" value={fAge} onChange={(e) => setFAge(e.target.value as any)}>
              <option value="all">Todas idades</option>
              <option value="kids">Infantil</option>
              <option value="adult">Adulto</option>
              <option value="master">Master</option>
            </select>
          </div>

          {view !== "list" && (
            <div className="flex items-center justify-between border-t border-[color:var(--dojo-border)] pt-3">
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Hoje</Button>
              </div>
              <div className="text-sm font-medium capitalize">{cursorLabel}</div>
              <div className="text-xs text-muted-foreground">{filtered.length} competições</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar / list */}
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[color:var(--dojo-surface-2)]" />
          ))}
        </div>
      ) : (
        <CompetitionCalendar
          competitions={filtered as any}
          view={view}
          cursor={cursor}
          onSelect={(id) => setDetailId(id)}
        />
      )}

      <CompetitionDetailSheet
        competitionId={detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
        onEdit={(c) => openEdit(c)}
      />

      <CompetitionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={formInitial}
        onSubmit={onSubmit}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
