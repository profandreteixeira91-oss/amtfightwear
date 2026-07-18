import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { evalDashboardStats } from "@/lib/dojo/evaluations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, CalendarClock, Percent, FileText } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/dojo/app/evaluations/")({
  component: EvaluationsDashboard,
});

function EvaluationsDashboard() {
  const statsFn = useServerFn(evalDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["eval-stats"],
    queryFn: () => statsFn(),
  });

  const kpis = [
    { label: "Avaliações realizadas", value: data?.total_done ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Pendentes", value: data?.pending ?? 0, icon: Clock, color: "text-amber-600" },
    { label: "Agendadas", value: data?.scheduled ?? 0, icon: CalendarClock, color: "text-blue-600" },
    { label: "Aprovados", value: data?.approved ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Reprovados", value: data?.failed ?? 0, icon: XCircle, color: "text-red-600" },
    { label: "Média geral", value: `${data?.avg_percentage ?? 0}%`, icon: Percent, color: "text-primary" },
    { label: "Modelos criados", value: data?.templates_count ?? 0, icon: FileText, color: "text-slate-600" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dashboard de avaliações</h2>
        <p className="text-sm text-muted-foreground">
          Visão geral das avaliações da academia.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <Icon className={`h-4 w-4 mb-2 ${k.color}`} />
                <div className="text-2xl font-bold">{isLoading ? "—" : k.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avaliações concluídas por mês</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.monthly ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
