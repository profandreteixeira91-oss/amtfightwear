import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertTriangle, Inbox, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  percent,
  ratio,
  shortDate,
} from "@/components/ads-manager/helpers";
import { RowMenu, SelectAllBox, useSelection } from "@/components/ads-manager/EntityActions";
import { BulkBar } from "@/components/ads-manager/BulkBar";
import { EditDrawer, type EditTarget } from "@/components/ads-manager/EditDrawer";
import { amListAdSets } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/conjuntos")({
  validateSearch: z.object({ campaignId: z.string().optional() }),
  component: AdSetsPage,
});

function AdSetsPage() {
  const { campaignId } = Route.useSearch();
  const { accountId, range, refreshKey, search } = useAdsManager();
  const list = useServerFn(amListAdSets);
  const { selected, setSelected, toggle, clear } = useSelection();
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [status, setStatus] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "adsets", accountId, campaignId, range.since, range.until, refreshKey],
    queryFn: () =>
      list({
        data: {
          ...(accountId ? { accountId } : {}),
          ...(campaignId ? { campaignId } : {}),
          since: range.since,
          until: range.until,
        },
      }),
    retry: false,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? [])
      .filter((s) => {
        if (status !== "all") {
          const st = (s.effectiveStatus || s.status || "").toUpperCase();
          if (status === "ACTIVE" && st !== "ACTIVE") return false;
          if (status === "PAUSED" && !st.includes("PAUSED")) return false;
          if (status === "ARCHIVED" && st !== "ARCHIVED") return false;
        }
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || s.id.includes(q);
      })
      .sort((a, b) => b.metrics.spend - a.metrics.spend);
  }, [data, search, status]);

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
        <Badge variant="outline">{rows.length} conjunto(s)</Badge>
        {campaignId && (
          <Badge className="gap-1.5">
            Filtrado por campanha
            <Link to="/admin/ads/conjuntos" search={{}} className="underline">
              limpar
            </Link>
          </Badge>
        )}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ACTIVE">Ativos</SelectItem>
            <SelectItem value="PAUSED">Pausados</SelectItem>
            <SelectItem value="ARCHIVED">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="min-w-0 overflow-hidden border-border/60 bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <SelectAllBox ids={rows.map((r) => r.id)} selected={selected} setSelected={setSelected} />
                </th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Nome</th>
                <th className="px-3 py-2.5 font-semibold">Otimização</th>
                <th className="px-3 py-2.5 font-semibold">Lance</th>
                <th className="px-3 py-2.5 text-right font-semibold">Orçamento</th>
                <th className="px-3 py-2.5 font-semibold">Público</th>
                <th className="px-3 py-2.5 text-right font-semibold">Gasto</th>
                <th className="px-3 py-2.5 text-right font-semibold">CTR</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPA</th>
                <th className="px-3 py-2.5 text-right font-semibold">Conv.</th>
                <th className="px-3 py-2.5 text-right font-semibold">ROAS</th>
                <th className="px-3 py-2.5 font-semibold">Período</th>
                <th className="w-12 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-3 py-3" colSpan={14}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-16 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 font-semibold">Nenhum conjunto encontrado</p>
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={selected.includes(s.id)}
                        onCheckedChange={() => toggle(s.id)}
                        aria-label={`Selecionar ${s.name}`}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={s.effectiveStatus || s.status} />
                    </td>
                    <td className="max-w-[240px] px-3 py-2.5">
                      <Link
                        to="/admin/ads/anuncios"
                        search={{ adsetId: s.id }}
                        className="block truncate font-semibold hover:text-primary hover:underline"
                        title={s.name}
                      >
                        {s.name}
                      </Link>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        {s.id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      {s.optimizationGoal ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {s.bidStrategy ? (BID_STRATEGY_LABELS[s.bidStrategy] ?? s.bidStrategy) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {s.dailyBudget != null
                        ? `${cur(s.dailyBudget)}/dia`
                        : s.lifetimeBudget != null
                          ? `${cur(s.lifetimeBudget)} total`
                          : "CBO"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {s.countries.length ? s.countries.join(", ") : "—"}
                        {s.ageMin ? ` · ${s.ageMin}-${s.ageMax ?? "65+"}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {cur(s.metrics.spend)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{percent(s.metrics.ctr)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(s.metrics.cpa)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(s.metrics.conversions)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {ratio(s.metrics.roas)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      {shortDate(s.startAt)} → {shortDate(s.endAt)}
                    </td>
                    <td className="px-2 py-2.5">
                      <RowMenu
                        id={s.id}
                        kind="adset"
                        status={s.status}
                        onEdit={() =>
                          setEditing({
                            id: s.id,
                            name: s.name,
                            dailyBudget: s.dailyBudget,
                            lifetimeBudget: s.lifetimeBudget,
                            bidStrategy: s.bidStrategy,
                            startAt: s.startAt,
                            stopAt: s.endAt,
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

      {campaignId && (
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/ads/campanhas">← Voltar às campanhas</Link>
          </Button>
        </div>
      )}

      <BulkBar kind="adset" selected={selected} clear={clear} />
      <EditDrawer target={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}
