import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type Totals = {
  gold: number;
  silver: number;
  bronze: number;
  wins: number;
  losses: number;
  draws: number;
};

export function MedalsBreakdown({ totals }: { totals: Totals }) {
  const medalData = [
    { name: "Ouro", value: totals.gold, color: "#f5c518" },
    { name: "Prata", value: totals.silver, color: "#c4c4c4" },
    { name: "Bronze", value: totals.bronze, color: "#cd7f32" },
  ].filter((d) => d.value > 0);

  const record = [
    { name: "Vitórias", value: totals.wins, color: "hsl(var(--primary))" },
    { name: "Empates", value: totals.draws, color: "hsl(var(--muted-foreground))" },
    { name: "Derrotas", value: totals.losses, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  const totalFights = totals.wins + totals.losses + totals.draws;
  const winRate = totalFights > 0 ? (totals.wins / totalFights) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Distribuição de medalhas
        </div>
        {medalData.length === 0 ? (
          <div className="grid h-40 place-items-center text-xs text-muted-foreground">Sem medalhas</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={medalData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={3}>
                {medalData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Cartel · Aproveitamento
        </div>
        <div className="mb-2 text-3xl font-black tabular-nums">
          {winRate.toFixed(0)}
          <span className="ml-1 text-sm font-semibold text-muted-foreground">% vitórias</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          {record.map((r, i) => {
            const w = totalFights > 0 ? (r.value / totalFights) * 100 : 0;
            return <div key={i} title={`${r.name}: ${r.value}`} style={{ width: `${w}%`, background: r.color }} />;
          })}
          {totalFights === 0 && <div className="w-full bg-muted" />}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {record.map((r) => (
            <div key={r.name} className="rounded-md border border-border/40 bg-muted/20 p-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.name}</div>
              <div className="text-base font-bold tabular-nums">{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
