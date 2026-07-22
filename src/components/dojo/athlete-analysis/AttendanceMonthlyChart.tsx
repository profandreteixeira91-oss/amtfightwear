import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function AttendanceMonthlyChart({
  data,
  months = 12,
}: {
  data: { date: string; count: number }[];
  months?: number;
}) {
  const buckets = useMemo(() => {
    const now = new Date();
    const list: { key: string; label: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        count: 0,
      });
    }
    const idx = new Map(list.map((b, i) => [b.key, i]));
    for (const row of data) {
      const k = row.date.slice(0, 7);
      const i = idx.get(k);
      if (i != null) list[i].count += row.count;
    }
    return list;
  }, [data, months]);

  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={buckets} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
          contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {buckets.map((b, i) => (
            <Cell key={i} fill={`color-mix(in oklab, hsl(var(--primary)) ${40 + (b.count / max) * 60}%, transparent)`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
