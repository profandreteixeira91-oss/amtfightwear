import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AlertTriangle, ImageOff, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { StatusBadge, cur, num, percent, ratio, shortDate } from "@/components/ads-manager/helpers";
import { RowMenu, SelectAllBox, useSelection } from "@/components/ads-manager/EntityActions";
import { BulkBar } from "@/components/ads-manager/BulkBar";
import { CreativeEditor, type CreativeTarget } from "@/components/ads-manager/CreativeEditor";
import { amListAds } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/anuncios")({
  validateSearch: z.object({ adsetId: z.string().optional() }),
  component: AdsPage,
});

function AdsPage() {
  const { adsetId } = Route.useSearch();
  const { accountId, range, refreshKey, search } = useAdsManager();
  const list = useServerFn(amListAds);
  const { selected, setSelected, toggle, clear } = useSelection();
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<CreativeTarget | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "ads", accountId, adsetId, range.since, range.until, refreshKey],
    queryFn: () =>
      list({
        data: {
          ...(accountId ? { accountId } : {}),
          ...(adsetId ? { adsetId } : {}),
          since: range.since,
          until: range.until,
        },
      }),
    retry: false,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? [])
      .filter((a) => {
        if (status !== "all") {
          const st = (a.effectiveStatus || a.status || "").toUpperCase();
          if (status === "ACTIVE" && st !== "ACTIVE") return false;
          if (status === "PAUSED" && !st.includes("PAUSED")) return false;
          if (status === "ARCHIVED" && st !== "ARCHIVED") return false;
        }
        if (!q) return true;
        return a.name.toLowerCase().includes(q) || a.id.includes(q);
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
        <Badge variant="outline">{rows.length} anúncio(s)</Badge>
        {adsetId && (
          <Badge className="gap-1.5">
            Filtrado por conjunto
            <Link to="/admin/ads/anuncios" search={{}} className="underline">
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
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <SelectAllBox ids={rows.map((r) => r.id)} selected={selected} setSelected={setSelected} />
                </th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Criativo</th>
                <th className="px-3 py-2.5 font-semibold">Anúncio</th>
                <th className="px-3 py-2.5 text-right font-semibold">Gasto</th>
                <th className="px-3 py-2.5 text-right font-semibold">Impr.</th>
                <th className="px-3 py-2.5 text-right font-semibold">Cliques</th>
                <th className="px-3 py-2.5 text-right font-semibold">CTR</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPC</th>
                <th className="px-3 py-2.5 text-right font-semibold">Conv.</th>
                <th className="px-3 py-2.5 text-right font-semibold">ROAS</th>
                <th className="px-3 py-2.5 font-semibold">Atualização</th>
                <th className="w-12 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-3 py-3" colSpan={13}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 font-semibold">Nenhum anúncio encontrado</p>
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={selected.includes(a.id)}
                        onCheckedChange={() => toggle(a.id)}
                        aria-label={`Selecionar ${a.name}`}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={a.effectiveStatus || a.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      {a.creative?.thumbnail ? (
                        <img
                          src={a.creative.thumbnail}
                          alt={`Criativo de ${a.name}`}
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-md border border-border/60 object-cover"
                        />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border/60 bg-muted/40">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="max-w-[260px] px-3 py-2.5">
                      <span className="block truncate font-semibold" title={a.name}>
                        {a.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {a.creative?.title ?? a.creative?.body ?? a.id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {cur(a.metrics.spend)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(a.metrics.impressions)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(a.metrics.clicks)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{percent(a.metrics.ctr)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cur(a.metrics.cpc)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(a.metrics.conversions)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {ratio(a.metrics.roas)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {shortDate(a.updatedAt)}
                    </td>
                    <td className="px-2 py-2.5">
                      <RowMenu
                        id={a.id}
                        kind="ad"
                        status={a.status}
                        onEdit={() =>
                          setEditing({
                            adId: a.id,
                            adName: a.name,
                            creativeId: a.creative?.id ?? null,
                            title: a.creative?.title ?? "",
                            body: a.creative?.body ?? "",
                            thumbnail: a.creative?.thumbnail ?? null,
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

      <BulkBar kind="ad" selected={selected} clear={clear} />
      <CreativeEditor target={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}
