import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend,
} from "recharts";

export function CompareRadar({
  a,
  b,
  nameA,
  nameB,
}: {
  a: any;
  b: any;
  nameA: string;
  nameB: string;
}) {
  const axes = [
    { key: "frequencia90d", label: "Frequência", max: Math.max(60, a.frequencia90d, b.frequencia90d) },
    { key: "ultimaAvaliacao", label: "Avaliação", max: 100 },
    { key: "competicoes", label: "Competições", max: Math.max(10, a.competicoes, b.competicoes) },
    { key: "vitorias", label: "Vitórias", max: Math.max(10, a.vitorias, b.vitorias) },
    { key: "graduacoes", label: "Graduações", max: Math.max(5, a.graduacoes, b.graduacoes) },
    { key: "ouro", label: "Ouros", max: Math.max(3, a.ouro, b.ouro) },
  ];

  const data = axes.map((ax) => ({
    axis: ax.label,
    A: Math.round((Number(a[ax.key] ?? 0) / ax.max) * 100),
    B: Math.round((Number(b[ax.key] ?? 0) / ax.max) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12 }} formatter={(v: any) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Radar name={nameA} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
        <Radar name={nameB} dataKey="B" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
