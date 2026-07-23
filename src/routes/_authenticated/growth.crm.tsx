import { createFileRoute } from "@tanstack/react-router";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Handshake, TrendingUp, Target } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { growthService, type CrmDeal } from "@/services/growthService";
import { brl, intFmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/growth/crm")({
  head: () => ({ meta: [{ title: "CRM — AMT Growth" }] }),
  component: () => (<OwnerOnly><CrmPage /></OwnerOnly>),
});

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "qualified", label: "Qualificado" },
  { id: "proposal", label: "Proposta" },
  { id: "won", label: "Ganho" },
  { id: "lost", label: "Perdido" },
] as const;

function CrmPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["crm_deals"],
    queryFn: growthService.crmDeals,
    refetchInterval: 30_000,
  });

  const deals = data ?? [];
  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const pipelineValue = openDeals.reduce((a, d) => a + Number(d.value), 0);
  const wonValue = deals.filter((d) => d.stage === "won").reduce((a, d) => a + Number(d.value), 0);
  const winRate = deals.length
    ? (deals.filter((d) => d.stage === "won").length / deals.length) * 100
    : 0;

  const grouped: Record<string, CrmDeal[]> = {};
  for (const s of STAGES) grouped[s.id] = [];
  for (const d of deals) {
    if (grouped[d.stage]) grouped[d.stage].push(d);
    else grouped[d.stage] = [d];
  }

  return (
    <>
      <PageHeader
        eyebrow="Pipeline"
        title="CRM"
        description="Gestão do funil de vendas e negociações da AMT Fight Wear."
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Pipeline aberto" value={brl(pipelineValue)} icon={Handshake} loading={isLoading} index={0} />
            <StatCard label="Vendas ganhas" value={brl(wonValue)} icon={TrendingUp} loading={isLoading} index={1} />
            <StatCard label="Win rate" value={`${winRate.toFixed(1)}%`} icon={Target} loading={isLoading} index={2} />
          </div>

          {isLoading ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {STAGES.map((s) => <Skeleton key={s.id} className="h-64" />)}
            </div>
          ) : deals.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={Handshake} title="Pipeline vazio" description="Adicione oportunidades para começar a acompanhar o funil." />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {STAGES.map((s, idx) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span>{s.label}</span>
                        <Badge variant="secondary">{intFmt(grouped[s.id]?.length ?? 0)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(grouped[s.id] ?? []).length === 0 ? (
                        <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                          Sem negociações
                        </div>
                      ) : (
                        (grouped[s.id] ?? []).map((d) => (
                          <div key={d.id} className="rounded-md border bg-card p-3 shadow-sm">
                            <div className="truncate text-sm font-medium">{d.title}</div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{d.probability}%</span>
                              <span className="text-sm font-semibold text-primary">{brl(Number(d.value))}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
