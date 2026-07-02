import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listLogs } from "@/lib/prospect/prospect.functions";
import { fmtDateTime } from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/prospect/logs")({
  head: () => ({ meta: [{ title: "Logs — Prospect Engine" }] }),
  component: LogsPage,
});

type Log = { id: string; source: string; action: string; message: string | null; created_at: string };

function LogsPage() {
  const fetchFn = useServerFn(listLogs);
  const { data, isLoading } = useQuery({
    queryKey: ["prospect", "logs"],
    queryFn: () => fetchFn(),
    refetchInterval: 15_000,
  });

  const logs = (data ?? []) as Log[];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Prospect Engine"
        title="Logs de Automação"
        description="Auditoria completa das ações do motor de prospecção. Atualiza a cada 15 segundos."
      />

      <SectionCard title={`${logs.length} eventos`} description="Do mais recente ao mais antigo">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : logs.length === 0 ? (
          <div className="grid place-items-center py-10 text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
        ) : (
          <ul className="space-y-1.5">
            {logs.map((l, i) => {
              const Icon = l.action === "error" ? XCircle
                : l.action === "run" ? CheckCircle2
                : l.action === "warning" ? AlertCircle : Info;
              const tone = l.action === "error" ? "text-destructive"
                : l.action === "run" ? "text-emerald-500"
                : l.action === "warning" ? "text-amber-500" : "text-muted-foreground";
              return (
                <motion.li key={l.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-sm">
                  <Icon className={`h-4 w-4 ${tone}`} />
                  <Badge variant="outline" className="text-[10px] uppercase">{l.source}</Badge>
                  <span className="truncate">{l.message ?? l.action}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(l.created_at)}</span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
