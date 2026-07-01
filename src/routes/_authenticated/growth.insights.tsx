import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, TrendingUp, Info } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { growthService } from "@/services/growthService";

export const Route = createFileRoute("/_authenticated/growth/insights")({
  head: () => ({ meta: [{ title: "Insights IA — AMT Growth" }] }),
  component: InsightsPage,
});

const severityMap: Record<string, { label: string; className: string; icon: typeof Info }> = {
  info: { label: "info", className: "bg-primary/10 text-primary", icon: Info },
  success: { label: "positivo", className: "bg-emerald-500/10 text-emerald-500", icon: TrendingUp },
  warning: { label: "atenção", className: "bg-amber-500/10 text-amber-500", icon: AlertTriangle },
  critical: { label: "crítico", className: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

function InsightsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ai_insights"],
    queryFn: growthService.aiInsights,
    refetchInterval: 60_000,
  });

  const insights = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="IA Aplicada"
        title="Insights IA"
        description="Recomendações e alertas gerados pela IA a partir dos dados da operação."
        actions={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Auto-refresh
          </Badge>
        }
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum insight gerado ainda"
          description="Assim que houver dados suficientes, a IA produzirá recomendações automáticas aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insights.map((i, idx) => {
            const sev = severityMap[i.severity] ?? severityMap.info;
            const Icon = sev.icon;
            return (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${sev.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                            {i.kind}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                            {sev.label}
                          </Badge>
                        </div>
                        <h3 className="mt-2 text-sm font-semibold">{i.title}</h3>
                        {i.summary && (
                          <p className="mt-1 text-sm text-muted-foreground">{i.summary}</p>
                        )}
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {new Date(i.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
