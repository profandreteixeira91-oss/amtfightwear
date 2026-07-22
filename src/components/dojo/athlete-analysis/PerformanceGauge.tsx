import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export function PerformanceGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? "#16a34a" : score >= 70 ? "#22c55e" : score >= 55 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  const data = [{ name: "score", value: score, fill: color }];
  return (
    <div className="relative flex h-56 w-full flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={220} endAngle={-40}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background dataKey="value" cornerRadius={999} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-black tabular-nums" style={{ color }}>{score}</div>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
