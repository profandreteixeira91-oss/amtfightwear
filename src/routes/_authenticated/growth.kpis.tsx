import { createFileRoute } from "@tanstack/react-router";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge, Target, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { growthService } from "@/services/growthService";
import { intFmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/growth/kpis")({
  head: () => ({ meta: [{ title: "KPIs — AMT Growth" }] }),
  component: () => (<OwnerOnly><KpisPage /></OwnerOnly>),
});

function KpisPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["kpi_snapshots"],
    queryFn: growthService.kpiSnapshots,
    refetchInterval: 30_000,
  });

  const rows = data ?? [];
  const latestByName = new Map<string, typeof rows[number]>();
  for (const r of rows) if (!latestByName.has(r.name)) latestByName.set(r.name, r);
  const latest = Array.from(latestByName.values());

  const totalTracked = latest.length;
  const onTarget = latest.filter((r) => r.target != null && Number(r.value) >= Number(r.target)).length;
  const attainment = totalTracked ? (onTarget / totalTracked) * 100 : 0;

  const series = rows
    .slice()
    .sort((a, b) => (a.reference_date < b.reference_date ? -1 : 1))
    .slice(-30)
    .map((r) => ({
      label: new Date(r.reference_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value: Number(r.value),
    }));

  return (
    <>
      <PageHeader
        eyebrow="Performance"
        title="KPIs"
        description="Indicadores-chave da operação com metas e evolução histórica."
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Indicadores" value={intFmt(totalTracked)} icon={Gauge} loading={isLoading} index={0} />
            <StatCard label="Batendo meta" value={intFmt(onTarget)} icon={Target} loading={isLoading} index={1} />
            <StatCard label="Atingimento" value={`${attainment.toFixed(0)}%`} icon={TrendingUp} loading={isLoading} index={2} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard title="Evolução histórica" className="lg:col-span-2" delay={0.1}>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : series.length === 0 ? (
                <EmptyState icon={Gauge} title="Sem snapshots" description="Registre snapshots diários dos indicadores para ver a evolução." />
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 w-full">
                  <ResponsiveContainer>
                    <LineChart data={series}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </SectionCard>

            <SectionCard title="Indicadores atuais" delay={0.2}>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : latest.length === 0 ? (
                <EmptyState title="Sem KPIs" />
              ) : (
                <div className="space-y-4">
                  {latest.slice(0, 6).map((k) => {
                    const pctVal = k.target ? Math.min(100, (Number(k.value) / Number(k.target)) * 100) : 0;
                    return (
                      <div key={k.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">{k.name}</span>
                          <span className="text-muted-foreground">
                            {Number(k.value).toFixed(1)}
                            {k.target != null && ` / ${Number(k.target).toFixed(1)}`}
                          </span>
                        </div>
                        <Progress value={pctVal} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
