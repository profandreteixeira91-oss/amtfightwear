import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

export function TechnicalRadar({ data, max = 10 }: { data: { axis: string; value: number }[]; max?: number }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data.length ? data : [{ axis: "Sem dados", value: 0 }]} outerRadius="80%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, max]} tick={false} axisLine={false} />
        <Tooltip />
        <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
