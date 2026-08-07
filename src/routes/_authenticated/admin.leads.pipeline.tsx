import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  type DragEndEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Star, Mail, MessageCircle, Instagram } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listLeads, updateLead } from "@/lib/prospect/prospect.functions";
import { PIPELINE_STAGES } from "@/features/prospect/types";
import { scoreToStars } from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/admin/leads/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Prospect Engine" }] }),
  component: PipelinePage,
});

type Contact = { channel: string; value: string };
type LeadCard = Record<string, unknown> & { id: string; name: string; pipeline_stage: string; score: number; contacts: Contact[] };

function PipelinePage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listLeads);
  const update = useServerFn(updateLead);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "pipeline"],
    queryFn: () => fetchList({ data: { limit: 200, offset: 0, orderBy: "score", orderDir: "desc" } }),
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; pipeline_stage: string }) =>
      update({ data: { id: v.id, patch: { pipeline_stage: v.pipeline_stage } } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["prospect", "pipeline"] });
      const prev = qc.getQueryData<{ rows: LeadCard[]; total: number }>(["prospect", "pipeline"]);
      if (prev) {
        qc.setQueryData(["prospect", "pipeline"], {
          ...prev,
          rows: prev.rows.map((r) => r.id === v.id ? { ...r, pipeline_stage: v.pipeline_stage } : r),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["prospect", "pipeline"], ctx.prev);
      toast.error("Falha ao mover lead");
    },
    onSuccess: () => toast.success("Lead movido"),
  });

  const rows = (data?.rows ?? []) as unknown as LeadCard[];
  const grouped = useMemo(() => {
    const map = new Map<string, LeadCard[]>();
    for (const s of PIPELINE_STAGES) map.set(s.id, []);
    for (const r of rows) {
      const stage = String(r.pipeline_stage || "novo");
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(r);
    }
    return map;
  }, [rows]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const dest = e.over?.id ? String(e.over.id) : null;
    if (!dest) return;
    const lead = rows.find((r) => r.id === id);
    if (!lead || lead.pipeline_stage === dest) return;
    updateMut.mutate({ id, pipeline_stage: dest });
  }

  return (
    <PageShell
        eyebrow="Prospect Engine"
        title="Pipeline Comercial"
        description="Arraste os cards entre estágios para atualizar o funil. Sincronização em tempo real."
      >

      {error && <ErrorState message={String(error)} onRetry={() => refetch()} />}

      {isLoading ? (
        <div className="grid grid-flow-col gap-3 overflow-x-auto pb-4" style={{ gridAutoColumns: "280px" }}>
          {PIPELINE_STAGES.map((_, i) => <Skeleton key={i} className="h-[70vh]" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-flow-col gap-3 overflow-x-auto pb-4" style={{ gridAutoColumns: "280px" }}>
            {PIPELINE_STAGES.map((s) => (
              <Column key={s.id} id={s.id} label={s.label} color={s.color} items={grouped.get(s.id) ?? []} />
            ))}
          </div>
        </DndContext>
      )}
    </PageShell>
  );
}

function Column({ id, label, color, items }: { id: string; label: string; color: string; items: LeadCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Card ref={setNodeRef} className={`h-[70vh] flex flex-col transition ${isOver ? "border-primary/70 bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {items.map((it) => <KanbanCard key={it.id} lead={it} />)}
        {items.length === 0 && (
          <div className="grid h-full place-items-center px-2 text-center text-xs text-muted-foreground">
            Solte cards aqui
          </div>
        )}
      </div>
    </Card>
  );
}

function KanbanCard({ lead }: { lead: LeadCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const stars = scoreToStars(lead.score || 0);
  const email = lead.contacts.some((c) => c.channel === "email");
  const wa = lead.contacts.some((c) => c.channel === "whatsapp");
  const ig = lead.contacts.some((c) => c.channel === "instagram");

  return (
    <motion.div layout>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
      >
        <Card className="border-border/60 hover:border-primary/40">
          <CardContent className="space-y-2 p-3">
            <Link
              to="/admin/leads"
              search={{ focus: lead.id, q: "", pipeline_stage: undefined }}
              className="line-clamp-2 text-sm font-semibold hover:text-primary"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {lead.name}
            </Link>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
              ))}
              <span className="ml-1 text-[10px] text-muted-foreground">{lead.score || 0}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {email && <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]"><Mail className="h-2.5 w-2.5" /></Badge>}
              {wa && <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]"><MessageCircle className="h-2.5 w-2.5" /></Badge>}
              {ig && <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]"><Instagram className="h-2.5 w-2.5" /></Badge>}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
