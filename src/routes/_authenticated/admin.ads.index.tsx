import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdsManager } from "@/components/ads-manager/AdsManagerContext";
import { cur, num, percent, ratio } from "@/components/ads-manager/helpers";
import { amGetOverview } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/")({
  component: AdsOverview,
});

function AdsOverview() {
  const { accountId, range, refreshKey } = useAdsManager();
  const getOverview = useServerFn(amGetOverview);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ads-manager", "overview", accountId, range.since, range.until, refreshKey],
    queryFn: () =>
      getOverview({
        data: { ...(accountId ? { accountId } : {}), since: range.since, until: range.until },
      }),
    retry: false,
  });

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="font-semibold">Não foi possível carregar os dados da Meta</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {(error as Error).message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const t = data?.totals;

  const kpis: Array<{ label: string; value: string; hint?: string }> = [
    { label: "Gasto hoje", value: cur(t?.spentToday) },
    { label: "Gasto no período", value: cur(t?.spend) },
    { label: "Alcance", value: num(t?.reach) },
    { label: "Impressões", value: num(t?.impressions) },
    { label: "Cliques", value: num(t?.clicks) },
    { label: "CTR", value: percent(t?.ctr) },
    { label: "CPC", value: cur(t?.cpc) },
    { label: "CPM", value: cur(t?.cpm) },
    { label: "CPA", value: cur(t?.cpa) },
    { label: "Conversões", value: num(t?.conversions) },
    { label: "ROAS", value: ratio(t?.roas) },
    { label: "Frequência", value: ratio(t?.frequency, "") },
  ];

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="min-w-0 border-border/60 bg-card/60">
            <CardContent className="p-4">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {k.label}
              </p>
              {isLoading ? (
                <Skeleton className="mt-2 h-7 w-20" />
              ) : (
                <p className="mt-1 truncate text-xl font-black tabular-nums">{k.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-w-0 border-border/60 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução diária
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] min-w-0 px-2 pb-4">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series ?? []}>
                <defs>
                  <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="Gasto"
                  stroke="hsl(var(--primary))"
                  fill="url(#gSpend)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Receita"
                  stroke="hsl(var(--chart-2, var(--primary)))"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card className="min-w-0 border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gasto por campanha</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] min-w-0 px-2 pb-4">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.campaigns ?? []).slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="spend" name="Gasto" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo de campanhas</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 p-0">
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Campanha</th>
                    <th className="px-3 py-2 text-right font-semibold">Gasto</th>
                    <th className="px-3 py-2 text-right font-semibold">Conv.</th>
                    <th className="px-3 py-2 text-right font-semibold">Receita</th>
                    <th className="px-3 py-2 text-right font-semibold">ROAS</th>
                    <th className="px-4 py-2 text-right font-semibold">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="px-4 py-3" colSpan={6}>
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : (data?.campaigns ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhum dado no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    (data?.campaigns ?? []).map((c) => (
                      <tr key={c.id} className="border-b border-border/40 hover:bg-muted/40">
                        <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">{c.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{cur(c.spend)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{num(c.conversions)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{cur(c.revenue)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          {ratio(c.roas)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{percent(c.ctr)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
