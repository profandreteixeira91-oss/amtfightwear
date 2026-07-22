import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export function PerformanceGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 85 ? "#16a34a" :
    score >= 70 ? "#22c55e" :
    score >= 55 ? "#eab308" :
    score >= 40 ? "#f97316" : "#ef4444";
  const data = [{ name: "score", value: score, fill: color }];
  return (
    <div className="relative flex h-60 w-full flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "hsl(var(--muted) / 0.6)" }} dataKey="value" cornerRadius={999} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Score</div>
        <div className="text-6xl font-black tabular-nums leading-none" style={{ color }}>{score}</div>
        <div className="mt-1 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-widest" style={{ background: `${color}20`, color }}>{label}</div>
      </div>
    </div>
  );
}
