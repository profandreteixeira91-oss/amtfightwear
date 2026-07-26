import { createFileRoute } from "@tanstack/react-router";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Globe2, TrendingUp, Radar } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { growthService } from "@/services/growthService";
import { intFmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/marketing/mercado")({
  head: () => ({ meta: [{ title: "Mercado — AMT Growth" }] }),
  component: () => (<OwnerOnly><MarketPage /></OwnerOnly>),
});

function MarketPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["market_metrics"],
    queryFn: growthService.marketMetrics,
    refetchInterval: 60_000,
  });

  const metrics = data ?? [];
  const bySource = new Set(metrics.map((m) => m.source)).size;
  const avg = metrics.length ? metrics.reduce((a, m) => a + Number(m.value), 0) / metrics.length : 0;

  const chartData = metrics.slice(0, 12).map((m) => ({
    label: `${m.source} · ${m.metric}`.slice(0, 22),
    value: Number(m.value),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Inteligência de mercado"
        title="Mercado"
        description="Monitoramento de concorrência, tendências e sinais externos do nicho de fight wear."
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Métricas coletadas" value={intFmt(metrics.length)} icon={Radar} loading={isLoading} index={0} />
            <StatCard label="Fontes ativas" value={intFmt(bySource)} icon={Globe2} loading={isLoading} index={1} />
            <StatCard label="Valor médio" value={avg.toFixed(2)} icon={TrendingUp} loading={isLoading} index={2} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard title="Sinais de mercado" className="lg:col-span-2" delay={0.1}>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : chartData.length === 0 ? (
                <EmptyState icon={Globe2} title="Nenhuma métrica de mercado" description="Conecte fontes de dados para ver o pulso do mercado." />
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                      <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </SectionCard>

            <SectionCard title="Últimas coletas" delay={0.2}>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : metrics.length === 0 ? (
                <EmptyState title="Sem dados" />
              ) : (
                <ul className="divide-y divide-border">
                  {metrics.slice(0, 6).map((m) => (
                    <li key={m.id} className="py-3">
                      <div className="text-sm font-medium">{m.metric}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.source} · {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
