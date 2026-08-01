import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Filter, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import {
  BID_STRATEGY_LABELS,
  StatusBadge,
  cur,
  num,
  objectiveLabel,
  percent,
  ratio,
  shortDate,
} from "@/components/ads-manager/helpers";
import { RowMenu, SelectAllBox, useSelection } from "@/components/ads-manager/EntityActions";
import { BulkBar } from "@/components/ads-manager/BulkBar";
import { EditDrawer, type EditTarget } from "@/components/ads-manager/EditDrawer";
import { amListCampaigns } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/campanhas")({
  component: CampaignsPage,
});

const PAGE_SIZE = 25;

function CampaignsPage() {
  const { accountId, range, refreshKey, search } = useAdsManager();
  const list = useServerFn(amListCampaigns);
  const { selected, setSelected, toggle, clear } = useSelection();
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [status, setStatus] = useState("all");
  const [objective, setObjective] = useState("all");
  const [sort, setSort] = useState("spend");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "campaigns", accountId, range.since, range.until, refreshKey],
    queryFn: () =>
      list({ data: { ...(accountId ? { accountId } : {}), since: range.since, until: range.until } }),
    retry: false,
  });

  const objectives = useMemo(
    () => [...new Set((data ?? []).map((c) => c.objective).filter(Boolean))],
    [data],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = (data ?? []).filter((c) => {
      if (status !== "all") {
        const s = (c.effectiveStatus || c.status || "").toUpperCase();
        if (status === "ACTIVE" && s !== "ACTIVE") return false;
        if (status === "PAUSED" && !s.includes("PAUSED")) return false;
        if (status === "ARCHIVED" && s !== "ARCHIVED") return false;
      }
      if (objective !== "all" && c.objective !== objective) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.includes(q) ||
        objectiveLabel(c.objective).toLowerCase().includes(q)
      );
    });

    out = [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "roas") return b.metrics.roas - a.metrics.roas;
      if (sort === "cpa") return (a.metrics.cpa || Infinity) - (b.metrics.cpa || Infinity);
      if (sort === "ctr") return b.metrics.ctr - a.metrics.ctr;
      if (sort === "updated") return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
      return b.metrics.spend - a.metrics.spend;
    });
    return out;
  }, [data, search, status, objective, sort]);

  const visible = rows.slice(0, page * PAGE_SIZE);

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="min-w-0 break-words text-sm">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5">
          <Filter className="h-3 w-3" />
          {rows.length} campanha(s)
        </Badge>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ACTIVE">Ativas</SelectItem>
            <SelectItem value="PAUSED">Pausadas</SelectItem>
            <SelectItem value="ARCHIVED">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={objective} onValueChange={setObjective}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os objetivos</SelectItem>
            {objectives.map((o) => (
              <SelectItem key={o} value={o}>
                {objectiveLabel(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">Maior gasto</SelectItem>
            <SelectItem value="roas">Melhor ROAS</SelectItem>
            <SelectItem value="cpa">Menor CPA</SelectItem>
            <SelectItem value="ctr">Maior CTR</SelectItem>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
            <SelectItem value="updated">Atualização</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="min-w-0 overflow-hidden border-border/60 bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <SelectAllBox ids={visible.map((r) => r.id)} selected={selected} setSelected={setSelected} />
                </th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Nome</th>
                <th className="px-3 py-2.5 font-semibold">Objetivo</th>
                <th className="px-3 py-2.5 text-right font-semibold">Orçamento</th>
                <th className="px-3 py-2.5 font-semibold">Tipo</th>
                <th className="px-3 py-2.5 text-right font-semibold">Gasto</th>
                <th className="px-3 py-2.5 text-right font-semibold">Result.</th>
                <th className="px-3 py-2.5 text-right font-semibold">CTR</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPC</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPM</th>
                <th className="px-3 py-2.5 text-right font-semibold">Conv.</th>
                <th className="px-3 py-2.5 text-right font-semibold">ROAS</th>
                <th className="px-3 py-2.5 font-semibold">Início</th>
                <th className="px-3 py-2.5 font-semibold">Fim</th>
                <th className="px-3 py-2.5 font-semibold">Atualização</th>
                <th className="w-12 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-3 py-3" colSpan={17}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-16 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 font-semibold">Nenhuma campanha encontrada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ajuste os filtros ou crie uma nova campanha na barra superior.
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={selected.includes(c.id)}
                        onCheckedChange={() => toggle(c.id)}
                        aria-label={`Selecionar ${c.name}`}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={c.effectiveStatus || c.status} />
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5">
                      <Link
                        to="/admin/ads/conjuntos"
                        search={{ campaignId: c.id }}
                        className="block truncate font-semibold hover:text-primary hover:underline"
                        title={c.name}
                      >
                        {c.name}
                      </Link>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        {c.id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{objectiveLabel(c.objective)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {c.dailyBudget != null
                        ? `${cur(c.dailyBudget)}/dia`
                        : c.lifetimeBudget != null
                          ? `${cur(c.lifetimeBudget)} total`
                          : "no conjunto"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {c.bidStrategy ? (BID_STRATEGY_LABELS[c.bidStrategy] ?? c.bidStrategy) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {cur(c.metrics.spend)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(c.metrics.clicks)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{percent(c.metrics.ctr)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(c.metrics.cpc)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(c.metrics.cpm)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(c.metrics.conversions)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {ratio(c.metrics.roas)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{shortDate(c.startAt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{shortDate(c.stopAt)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {shortDate(c.updatedAt)}
                    </td>
                    <td className="px-2 py-2.5">
                      <RowMenu
                        id={c.id}
                        kind="campaign"
                        status={c.status}
                        onEdit={() =>
                          setEditing({
                            id: c.id,
                            name: c.name,
                            dailyBudget: c.dailyBudget,
                            lifetimeBudget: c.lifetimeBudget,
                            bidStrategy: c.bidStrategy,
                            startAt: c.startAt,
                            stopAt: c.stopAt,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {visible.length < rows.length && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Carregar mais ({rows.length - visible.length} restantes)
          </Button>
        </div>
      )}

      <BulkBar kind="campaign" selected={selected} clear={clear} />
      <EditDrawer target={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}
