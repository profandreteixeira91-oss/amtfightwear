import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trophy, RefreshCw, Search, ExternalLink, MapPin, Calendar as CalIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { scrapeCompetitions, type LiveCompetition } from "@/lib/dojo/competitions.functions";
import { PROVIDERS, providerLabel } from "@/lib/dojo/competitions/providers";

export const Route = createFileRoute("/dojo/app/competitions")({
  head: () => ({ meta: [{ title: "Competições — AMT Dojo Manager" }] }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const scrapeFn = useServerFn(scrapeCompetitions);

  const q = useQuery({
    queryKey: ["dojo-competitions-live"],
    queryFn: () => scrapeFn({ data: {} }),
    staleTime: 10 * 60_000, // 10 min
    refetchOnWindowFocus: false,
  });

  const [query, setQuery] = useState("");
  const [fState, setFState] = useState("");
  const [fCity, setFCity] = useState("");
  const [fProvider, setFProvider] = useState<string>("");

  const competitions = q.data?.competitions ?? [];
  const summary = q.data?.summary ?? [];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return competitions.filter((c) => {
      if (term) {
        const hay = [c.name, c.city, c.state, c.organizer, providerLabel(c.provider)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (fState && (c.state ?? "").toUpperCase() !== fState.toUpperCase()) return false;
      if (fCity && !(c.city ?? "").toLowerCase().includes(fCity.toLowerCase())) return false;
      if (fProvider && c.provider !== fProvider) return false;
      return true;
    });
  }, [competitions, query, fState, fCity, fProvider]);

  const now = new Date();
  const upcoming = competitions.filter((c) => c.starts_at && new Date(c.starts_at) >= now).length;
  const thisMonth = competitions.filter((c) => {
    if (!c.starts_at) return false;
    const d = new Date(c.starts_at);
    return d >= now && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const refresh = async () => {
    try {
      await q.refetch();
      toast.success("Competições atualizadas");
    } catch (e: any) {
      toast.error("Erro ao buscar competições", { description: e.message });
    }
  };

  const errors = summary.filter((s) => s.error);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">Competições</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Listagem ao vivo das competições publicadas nos sites dos organizadores. O cadastro é feito diretamente no site oficial de cada evento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh} disabled={q.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${q.isFetching ? "animate-spin" : ""}`} />
            {q.isFetching ? "Buscando…" : "Atualizar"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total encontradas" value={competitions.length} />
        <StatCard label="Futuras" value={upcoming} />
        <StatCard label="Este mês" value={thisMonth} />
        <StatCard label="Provedores consultados" value={summary.length} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Pesquisar por nome, cidade, estado, organizador…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input placeholder="UF" value={fState} onChange={(e) => setFState(e.target.value.toUpperCase())} maxLength={2} />
            <Input placeholder="Cidade" value={fCity} onChange={(e) => setFCity(e.target.value)} />
            <select className="h-10 rounded border bg-background px-2 text-sm md:col-span-2" value={fProvider} onChange={(e) => setFProvider(e.target.value)}>
              <option value="">Todos os organizadores</option>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Alguns provedores não responderam ({errors.length}/{summary.length})
          </div>
          <ul className="mt-1 list-disc pl-6">
            {errors.map((e) => (
              <li key={e.provider}>{providerLabel(e.provider)}: {e.error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* List */}
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-[color:var(--dojo-surface-2)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white p-8 text-center text-sm text-muted-foreground">
          Nenhuma competição encontrada. Tente atualizar ou ajustar os filtros.
        </div>
      ) : (
        <div className="rounded-lg border border-[color:var(--dojo-border)] bg-white divide-y">
          {filtered.map((c) => (
            <CompetitionRow key={c.id} c={c} />
          ))}
        </div>
      )}

      {q.data?.fetchedAt && (
        <div className="text-center text-[11px] text-muted-foreground">
          Atualizado em {new Date(q.data.fetchedAt).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}

function CompetitionRow({ c }: { c: LiveCompetition }) {
  const day = c.starts_at ? new Date(c.starts_at) : null;
  return (
    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-bold">
        {day ? day.toLocaleDateString("pt-BR", { day: "2-digit" }) : "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{c.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalIcon className="h-3 w-3" />
            {day ? day.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "Data a definir"}
          </span>
          {(c.city || c.state) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {[c.city, c.state].filter(Boolean).join(" · ")}
            </span>
          )}
          <span className="rounded-full bg-[color:var(--dojo-surface-2)] px-2 py-0.5">
            {providerLabel(c.provider)}
          </span>
          {c.venue_name && <span>· {c.venue_name}</span>}
        </div>
      </div>
      <a
        href={c.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <ExternalLink className="h-4 w-4" /> Inscrever-se
      </a>
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
