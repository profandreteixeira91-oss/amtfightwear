import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listConversations } from "@/lib/ig-hub.functions";

export const Route = createFileRoute("/_authenticated/instagram/crm")({
  component: IgCrm,
});

const STAGES = [
  { key: "novo_lead", label: "Novo Lead" },
  { key: "em_atendimento", label: "Em Atendimento" },
  { key: "aguardando", label: "Aguardando Resposta" },
  { key: "cliente", label: "Cliente" },
  { key: "finalizado", label: "Finalizado" },
];

function IgCrm() {
  const listFn = useServerFn(listConversations);
  const { data, isLoading } = useQuery({
    queryKey: ["ig-crm"],
    queryFn: () => listFn({ data: { limit: 200 } }),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="CRM do Instagram"
        description="Todas as conversas organizadas por etapa do funil comercial."
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((s) => {
          const items = (data ?? []).filter((c) => c.status === s.key);
          return (
            <div key={s.key} className="rounded-lg border bg-card p-3 min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">{s.label}</div>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : items.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">—</div>
                ) : (
                  items.map((c) => (
                    <div key={c.id} className="rounded-md border bg-background p-2 text-xs">
                      <div className="flex items-center gap-1 font-semibold">
                        <Instagram className="h-3 w-3" />@{c.participant_username ?? "—"}
                      </div>
                      <div className="text-muted-foreground truncate mt-1">{c.last_message_preview ?? "—"}</div>
                      {c.last_message_at && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(c.last_message_at).toLocaleString("pt-BR")}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
