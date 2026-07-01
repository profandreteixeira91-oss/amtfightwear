import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Handshake, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { crmService, type Deal } from "@/services/crmService";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/crm")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — CRM & E-mail" }] }),
  component: CrmPage,
});

const STAGES = ["Lead Capturado", "Proposta Enviada", "Negociando", "Fechado", "Perdido"] as const;

function CrmPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: deals, isLoading } = useQuery({ queryKey: ["deals"], queryFn: crmService.list });

  const create = useMutation({
    mutationFn: crmService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Negócio criado");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStage = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => crmService.update(id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const remove = useMutation({
    mutationFn: crmService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const byStage = (stage: string) => (deals ?? []).filter((d) => d.stage === stage);
  const totalPipeline = (deals ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="CRM & E-mail"
        description="Pipeline de negociações reais. Adicione, arraste entre estágios e acompanhe o valor total."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1"><Plus className="h-4 w-4" /> Novo negócio</Button>
            </DialogTrigger>
            <NewDealDialog onSubmit={(v) => create.mutate(v)} loading={create.isPending} />
          </Dialog>
        }
      />

      <div className="mb-4 flex items-center gap-4 text-sm">
        <Badge variant="secondary" className="gap-1"><Handshake className="h-3 w-3" /> Pipeline: {brl(totalPipeline)}</Badge>
        <div className="text-muted-foreground">{deals?.length ?? 0} negócios</div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : (deals?.length ?? 0) === 0 ? (
        <SectionCard title="Kanban de negócios">
          <EmptyState title="Nenhum negócio no CRM" description="Clique em 'Novo negócio' para iniciar seu pipeline." />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((stage, si) => {
            const items = byStage(stage);
            const stageTotal = items.reduce((s, d) => s + Number(d.value ?? 0), 0);
            return (
              <motion.div key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}
                className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide">{stage}</div>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>
                <div className="mb-3 text-xs text-muted-foreground">{brl(stageTotal)}</div>
                <div className="space-y-2">
                  {items.map((d: Deal) => (
                    <motion.div key={d.id} layout className="group rounded-md border bg-background p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{d.title}</div>
                          <div className="mt-0.5 text-primary font-medium">{brl(Number(d.value ?? 0))}</div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(d.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      {d.notes && <div className="mt-1 line-clamp-2 text-muted-foreground">{d.notes}</div>}
                      <Select value={d.stage} onValueChange={(v) => moveStage.mutate({ id: d.id, stage: v })}>
                        <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </motion.div>
                  ))}
                  {items.length === 0 && <div className="rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground">Vazio</div>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NewDealDialog({ onSubmit, loading }: { onSubmit: (v: Partial<Deal>) => void; loading: boolean }) {
  const [form, setForm] = useState({ title: "", value: "0", stage: "Lead Capturado", notes: "", probability: "20" });
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Novo negócio</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Gracie Barra Pinheiros — 40 faixas" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Valor (R$)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div><Label>Probabilidade (%)</Label><Input type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
        </div>
        <div>
          <Label>Estágio</Label>
          <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Notas</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button disabled={!form.title || loading} onClick={() => onSubmit({
          title: form.title,
          value: Number(form.value) || 0,
          probability: Number(form.probability) || 0,
          stage: form.stage,
          notes: form.notes || null,
        })}>{loading ? "Salvando..." : "Criar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
