import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

export function EvaluationTrendChart({
  sessions,
}: {
  sessions: { finished_at: string; percentage: number }[];
}) {
  const data = useMemo(() => {
    return [...sessions]
      .filter((s) => s?.finished_at)
      .sort((a, b) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime())
      .map((s) => ({
        date: new Date(s.finished_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        pct: Number(s.percentage) || 0,
      }));
  }, [sessions]);

  if (data.length === 0) {
    return (
      <div className="grid h-56 place-items-center text-sm text-muted-foreground">
        Nenhuma avaliação concluída ainda.
      </div>
    );
  }

  const avg = data.reduce((s, d) => s + d.pct, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="evalGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }}
          formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Aproveitamento"]}
        />
        <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `média ${avg.toFixed(0)}%`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Area type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#evalGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
