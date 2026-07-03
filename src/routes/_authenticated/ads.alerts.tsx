import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Check, X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { listAlerts, markAlertRead, markAllAlertsRead, dismissAlert } from "@/lib/ads/ads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ads/alerts")({
  head: () => ({ meta: [{ title: "Alertas — Tráfego Pago IA" }] }),
  component: AlertsPage,
});

const iconFor = (sev: string) => (sev === "critical" ? AlertCircle : sev === "warning" ? AlertTriangle : Info);
const colorFor = (sev: string) =>
  sev === "critical" ? "text-destructive" : sev === "warning" ? "text-amber-500" : "text-primary";

function AlertsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAlerts);
  const markRead = useServerFn(markAlertRead);
  const markAll = useServerFn(markAllAlertsRead);
  const dismiss = useServerFn(dismissAlert);

  const { data, isLoading } = useQuery({ queryKey: ["ads", "alerts"], queryFn: () => list() });

  const readMut = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads", "alerts"] }),
  });
  const allMut = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => {
      toast.success("Todos marcados como lidos");
      qc.invalidateQueries({ queryKey: ["ads", "alerts"] });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => dismiss({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads", "alerts"] }),
  });

  const unread = (data ?? []).filter((a) => !a.read_at).length;

  return (
    <>
      <PageHeader
        eyebrow="Tráfego Pago IA"
        title="Alertas"
        description="Notificações automáticas sobre queda de ROAS, gasto sem conversão, oportunidades de escala e mais."
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={() => allMut.mutate()}>
              <Check className="mr-2 h-4 w-4" /> Marcar todos como lidos ({unread})
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Nenhum alerta ainda"
          description="A IA irá te avisar aqui quando detectar anomalias ou oportunidades nas suas campanhas."
        />
      ) : (
        <ul className="space-y-2">
          {data.map((a) => {
            const Icon = iconFor(a.severity);
            const camp = a.campaign as { name?: string } | null;
            const isRead = !!a.read_at;
            return (
              <li
                key={a.id}
                className={`rounded-md border p-4 transition ${isRead ? "opacity-60" : "bg-card"}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 shrink-0 ${colorFor(a.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{a.title}</h4>
                      {!isRead && <Badge variant="secondary" className="text-[10px]">Novo</Badge>}
                    </div>
                    {a.message && <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                      {a.campaign_id && camp?.name && (
                        <Link to="/ads/campaigns/$id" params={{ id: a.campaign_id }} className="text-primary hover:underline">
                          {camp.name}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!isRead && (
                      <Button size="sm" variant="ghost" onClick={() => readMut.mutate(a.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => delMut.mutate(a.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
