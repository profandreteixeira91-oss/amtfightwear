import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export function PerformanceGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 85 ? "#16a34a" :
    score >= 70 ? "#22c55e" :
    score >= 55 ? "#eab308" :
    score >= 40 ? "#f97316" : "#ef4444";
  const data = [{ name: "score", value: score, fill: color }];
  return (
    <div className="relative flex h-64 w-full items-end justify-center overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="78%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: "hsl(var(--muted) / 0.6)" }} dataKey="value" cornerRadius={999} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center gap-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Score</div>
        <div className="text-5xl font-black tabular-nums leading-none" style={{ color }}>{score}</div>
        <div className="rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-widest" style={{ background: `${color}20`, color }}>{label}</div>
      </div>
    </div>
  );
}
