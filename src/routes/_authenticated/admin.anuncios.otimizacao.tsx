import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, RefreshCw, CheckCircle2, XCircle, TrendingUp, TrendingDown, Pause } from "lucide-react";
import {
  listOptimizations,
  runOptimizationNow,
  applyOptimization,
  dismissOptimization,
} from "@/lib/ads/ads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/anuncios/otimizacao")({
  head: () => ({ meta: [{ title: "Otimização IA — Tráfego Pago" }] }),
  component: OptimizationPage,
});

const iconFor = (type: string) => {
  if (type === "scale_winner") return TrendingUp;
  if (type === "pause_underperformer") return Pause;
  if (type === "roas_drop" || type === "low_ctr") return TrendingDown;
  return Zap;
};

const severityBadge = (s: string | null) => {
  if (s === "critical") return <Badge variant="destructive">Crítico</Badge>;
  if (s === "warning") return <Badge className="bg-amber-500 hover:bg-amber-500/90">Atenção</Badge>;
  return <Badge variant="secondary">Info</Badge>;
};

function OptimizationPage() {
  const qc = useQueryClient();
  const list = useServerFn(listOptimizations);
  const run = useServerFn(runOptimizationNow);
  const apply = useServerFn(applyOptimization);
  const dismiss = useServerFn(dismissOptimization);

  const { data, isLoading } = useQuery({
    queryKey: ["ads", "optimizations"],
    queryFn: () => list(),
  });

  const runMut = useMutation({
    mutationFn: () => run(),
    onSuccess: (r) => {
      toast.success(`${r.optsCreated} recomendações e ${r.alertsCreated} alertas gerados`);
      qc.invalidateQueries({ queryKey: ["ads", "optimizations"] });
      qc.invalidateQueries({ queryKey: ["ads", "alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyMut = useMutation({
    mutationFn: (id: string) => apply({ data: { id } }),
    onSuccess: () => {
      toast.success("Recomendação aplicada no Meta Ads");
      qc.invalidateQueries({ queryKey: ["ads", "optimizations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dismissMut = useMutation({
    mutationFn: (id: string) => dismiss({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads", "optimizations"] }),
  });

  const pending = (data ?? []).filter((o) => o.status === "pending");
  const done = (data ?? []).filter((o) => o.status !== "pending");

  return (
    <>
      <PageHeader
        eyebrow="Tráfego Pago IA"
        title="Otimização Contínua"
        description="A IA analisa suas campanhas a cada 6 horas e sugere ações de escala, pausa e ajuste de orçamento."
        actions={
          <Button onClick={() => runMut.mutate()} disabled={runMut.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${runMut.isPending ? "animate-spin" : ""}`} />
            Analisar agora
          </Button>
        }
      />

      <SectionCard title="Recomendações pendentes" description={`${pending.length} ações sugeridas`}>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Tudo em ordem"
            description="Nenhuma recomendação no momento. Aguarde novos dados ou execute uma análise manual."
          />
        ) : (
          <ul className="space-y-3">
            {pending.map((o) => {
              const Icon = iconFor(o.type);
              const camp = o.campaign as { name: string; status: string } | null;
              const s = (o.suggestion ?? {}) as { action?: string; recommended_daily?: number };
              return (
                <li key={o.id} className="rounded-md border p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{o.title ?? o.type}</h4>
                        {severityBadge(o.severity)}
                      </div>
                      {camp && (
                        <Link to="/admin/anuncios/campanhas/$id" params={{ id: o.campaign_id! }} className="text-xs text-primary hover:underline">
                          {camp.name}
                        </Link>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">{o.reason}</p>
                      {s.action === "increase_budget" && s.recommended_daily && (
                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                          Sugestão: aumentar para R$ {Number(s.recommended_daily).toFixed(2)}/dia
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {s.action && (
                        <Button size="sm" onClick={() => applyMut.mutate(o.id)} disabled={applyMut.isPending}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aplicar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => dismissMut.mutate(o.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {done.length > 0 && (
        <div className="mt-4">
          <SectionCard title="Histórico" description="Recomendações aplicadas ou descartadas">
            <ul className="space-y-2">
              {done.slice(0, 20).map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                  <span>{o.title ?? o.type} — {(o.campaign as { name?: string } | null)?.name ?? "—"}</span>
                  <Badge variant="outline">{o.status}</Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}
    </>
  );
}
