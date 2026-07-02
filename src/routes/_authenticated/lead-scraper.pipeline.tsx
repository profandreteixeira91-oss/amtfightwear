import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Mail, Instagram, Phone, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getPipeline, updatePipelineStage } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Lead Scraper IA" }] }),
  component: PipelinePage,
});

const STAGES = [
  { v: "novo", label: "Novo", color: "bg-slate-500" },
  { v: "enriquecido", label: "Enriquecido", color: "bg-sky-500" },
  { v: "contato_iniciado", label: "Contato iniciado", color: "bg-amber-500" },
  { v: "resposta_recebida", label: "Resposta", color: "bg-violet-500" },
  { v: "reuniao", label: "Reunião", color: "bg-blue-500" },
  { v: "proposta", label: "Proposta", color: "bg-orange-500" },
  { v: "cliente", label: "Cliente", color: "bg-emerald-500" },
  { v: "perdido", label: "Perdido", color: "bg-rose-500" },
];

function PipelinePage() {
  const qc = useQueryClient();
  const fetchPipeline = useServerFn(getPipeline);
  const updateStage = useServerFn(updatePipelineStage);
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => fetchPipeline(),
  });

  const mut = useMutation({
    mutationFn: (v: { leadId: string; stage: string }) =>
      updateStage({ data: v as any }),
    onSuccess: () => {
      toast.success("Etapa atualizada");
      qc.invalidateQueries({ queryKey: ["pipeline"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
  };
  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) mut.mutate({ leadId, stage });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Pipeline de prospecção"
        description="Arraste os leads entre as etapas do funil. Alterações são salvas automaticamente."
      />

      {isLoading ? (
        <div className="grid grid-flow-col auto-cols-[260px] gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => <Skeleton key={s.v} className="h-96" />)}
        </div>
      ) : (
        <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const items: any[] = (data as any)?.[s.v] ?? [];
            return (
              <div
                key={s.v}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, s.v)}
                className="rounded-lg border bg-card p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {items.map((l) => (
                    <Card
                      key={l.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, l.id)}
                      className="cursor-move p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.city ?? "—"} / {l.state ?? "—"}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-1 text-muted-foreground">
                          {l.email && <Mail className="h-3.5 w-3.5 text-emerald-500" />}
                          {l.instagram_handle && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                          {l.phone && <Phone className="h-3.5 w-3.5 text-blue-500" />}
                          {l.whatsapp && <MessageCircle className="h-3.5 w-3.5 text-green-500" />}
                        </div>
                        {l.ai_score != null && (
                          <Badge variant={l.ai_score >= 70 ? "default" : "secondary"} className="text-[10px]">
                            {l.ai_score}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                  {!items.length && (
                    <div className="text-center text-xs text-muted-foreground py-4">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
