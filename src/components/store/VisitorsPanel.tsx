import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, LogIn, Radio, BarChart3 } from "lucide-react";
import { adminGetVisitors } from "@/lib/store/visitors.functions";

type Range = "today" | "7d" | "30d" | "90d" | "year" | "custom";
type Granularity = "hour" | "day" | "week" | "month";

const RANGES: { key: Range; label: string; gran: Granularity }[] = [
  { key: "today", label: "Hoje", gran: "hour" },
  { key: "7d", label: "7 dias", gran: "day" },
  { key: "30d", label: "30 dias", gran: "day" },
  { key: "90d", label: "90 dias", gran: "week" },
  { key: "year", label: "Ano", gran: "month" },
];

const NUM = (v: number) => v.toLocaleString("pt-BR");

function formatBucket(key: string, gran: Granularity) {
  if (gran === "hour") return key.slice(11, 16);
  if (gran === "month") {
    const [y, m] = key.split("-");
    return `${m}/${y.slice(2)}`;
  }
  if (gran === "week") {
    const d = new Date(key);
    return `Sem ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  }
  return key.slice(5); // MM-DD
}

export function VisitorsPanel() {
  const [range, setRange] = useState<Range>("7d");
  const [gran, setGran] = useState<Granularity>("day");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const fetchVisitors = useServerFn(adminGetVisitors);
  const input = useMemo(() => ({
    range,
    granularity: gran,
    start: range === "custom" && customStart ? new Date(customStart).toISOString() : undefined,
    end: range === "custom" && customEnd ? new Date(customEnd + "T23:59:59").toISOString() : undefined,
  }), [range, gran, customStart, customEnd]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["store", "visitors", input],
    queryFn: () => fetchVisitors({ data: input }),
    refetchInterval: 60_000,
    enabled: range !== "custom" || Boolean(customStart && customEnd),
  });

  const selectRange = (r: Range) => {
    setRange(r);
    const preset = RANGES.find((x) => x.key === r);
    if (preset) setGran(preset.gran);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Visitantes da loja
            </CardTitle>
            <CardDescription>
              Dados reais de tráfego · agrupados por {gran === "hour" ? "hora" : gran === "day" ? "dia" : gran === "week" ? "semana" : "mês"}
              {isFetching ? " · sincronizando…" : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => selectRange(r.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    range === r.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              ))}
              <button
                onClick={() => setRange("custom")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  range === "custom" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Personalizado
              </button>
            </div>
            <select
              value={gran}
              onChange={(e) => setGran(e.target.value as Granularity)}
              className="rounded-md border bg-background px-2 py-1 text-xs font-semibold"
              aria-label="Granularidade"
            >
              <option value="hour">Por hora</option>
              <option value="day">Por dia</option>
              <option value="week">Por semana</option>
              <option value="month">Por mês</option>
            </select>
          </div>
        </div>
        {range === "custom" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              De
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border bg-background px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1">
              Até
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border bg-background px-2 py-1"
              />
            </label>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat icon={Users} label="Visitantes únicos" value={data ? NUM(data.totals.visitors) : "—"} loading={isLoading} />
          <MiniStat icon={Eye} label="Pageviews" value={data ? NUM(data.totals.pageviews) : "—"} loading={isLoading} />
          <MiniStat
            icon={BarChart3}
            label="Páginas por visitante"
            value={data ? data.totals.pages_per_visitor.toFixed(1) : "—"}
            loading={isLoading}
          />
          <MiniStat
            icon={Radio}
            label="Ativos agora"
            value={data ? NUM(data.totals.live_active) : "—"}
            hint="últimos 5 min"
            loading={isLoading}
            live
          />
        </div>

        {/* Chart */}
        <div className="h-64">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (data?.series.length ?? 0) === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Sem visitantes registrados no período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.series ?? []}>
                <defs>
                  <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="key" tick={{ fontSize: 11 }} tickFormatter={(k: string) => formatBucket(k, gran)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(k: string) => formatBucket(k, gran)}
                  formatter={(v: number, name: string) => [NUM(v), name === "visitors" ? "Visitantes" : "Pageviews"]}
                />
                <Area type="monotone" dataKey="pageviews" stroke="#dc2626" strokeWidth={2} fill="url(#pvGrad)" />
                <Area type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} fill="url(#visGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top pages */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Páginas mais visitadas</div>
            <div className="text-xs text-muted-foreground">Top 20 · {data?.top_pages.length ?? 0} páginas</div>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.top_pages.length ?? 0) === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma visita registrada.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Página</th>
                    <th className="px-3 py-2 text-right">Visitantes</th>
                    <th className="px-3 py-2 text-right">Pageviews</th>
                    <th className="px-3 py-2 text-right w-40">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.top_pages.map((p) => {
                    const pct = data!.totals.pageviews > 0 ? (p.pageviews / data!.totals.pageviews) * 100 : 0;
                    return (
                      <tr key={p.path} className="border-t hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{p.label}</div>
                          <div className="truncate text-xs text-muted-foreground max-w-[380px]">{p.path}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{NUM(p.visitors)}</td>
                        <td className="px-3 py-2 text-right">{NUM(p.pageviews)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded bg-muted">
                              <div className="h-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <span className="w-10 text-right text-xs tabular-nums">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon: Icon, label, value, hint, loading, live,
}: {
  icon: typeof Users; label: string; value: string; hint?: string; loading?: boolean; live?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="relative grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
          {live && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          )}
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <div className="mt-1 text-xl font-black tabular-nums">{value}</div>
      )}
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
