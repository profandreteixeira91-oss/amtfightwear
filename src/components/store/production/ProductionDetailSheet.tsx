import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, MessageSquarePlus, Printer, RotateCcw, Tag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRDateTime } from "@/lib/dates";
import {
  STAGES,
  STAGE_ACCENT,
  STAGE_LABEL,
  URGENCIES,
  URGENCY_LABEL,
  formatDuration,
  jobCode,
  nextStage,
} from "@/lib/store/production-stages";
import type { Stage, Urgency } from "@/lib/store/production-stages";
import {
  adminAddProductionComment,
  adminMoveProductionStage,
  adminProductionJobDetail,
  adminUpdateProductionJob,
} from "@/lib/store/production.functions";
import type { ProductionJob } from "@/lib/store/production.functions";
import { printProductionLabels, printProductionSheet } from "@/lib/store/production-print";

export function ProductionDetailSheet({
  job,
  onClose,
  onChanged,
}: {
  job: ProductionJob | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const detailFn = useServerFn(adminProductionJobDetail);
  const moveFn = useServerFn(adminMoveProductionStage);
  const patchFn = useServerFn(adminUpdateProductionJob);
  const commentFn = useServerFn(adminAddProductionComment);

  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");

  const { data } = useQuery({
    queryKey: ["production-job-detail", job?.id],
    queryFn: () => detailFn({ data: { id: job!.id } }),
    enabled: !!job,
  });

  const refresh = () => {
    onChanged();
    qc.invalidateQueries({ queryKey: ["production-job-detail", job?.id] });
  };

  const move = useMutation({
    mutationFn: (stage: Stage) => moveFn({ data: { id: job!.id, stage } }),
    onSuccess: () => {
      toast.success("Etapa atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: (v: Record<string, unknown>) => patchFn({ data: { id: job!.id, ...v } as never }),
    onSuccess: () => {
      toast.success("Item atualizado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: () => commentFn({ data: { job_id: job!.id, body: comment.trim() } }),
    onSuccess: () => {
      setComment("");
      toast.success("Observação registrada");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!job) return null;
  const events = data?.events ?? [];
  const comments = data?.comments ?? [];

  return (
    <Sheet open={!!job} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="truncate">{job.reference ?? jobCode(job.id)}</SheetTitle>
          <SheetDescription>
            {job.customer_name ?? "Sem cliente"} · {Number(job.quantity)}× {job.product_name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={STAGE_ACCENT[job.stage as Stage]}>
            {STAGE_LABEL[job.stage as Stage] ?? job.stage}
          </Badge>
          <Badge variant="outline">{jobCode(job.id)}</Badge>
          {job.rework_count > 0 ? (
            <Badge variant="outline" className="border-destructive/30 text-destructive">
              {job.rework_count}× retrabalho
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" onClick={() => move.mutate(nextStage(job.stage as Stage))}>
            <ArrowRight className="h-4 w-4" /> Avançar etapa
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => patch.mutate({ rework: true })}>
            <RotateCcw className="h-4 w-4" /> Registrar retrabalho
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => printProductionSheet([job])}>
            <Printer className="h-4 w-4" /> Folha
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => printProductionLabels([job])}>
            <Tag className="h-4 w-4" /> Etiqueta
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Etapa</Label>
            <Select value={job.stage} onValueChange={(v) => move.mutate(v as Stage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Urgência</Label>
            <Select value={job.urgency} onValueChange={(v) => patch.mutate({ urgency: v as Urgency })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCIES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {URGENCY_LABEL[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Prazo de entrega</Label>
            <Input
              type="date"
              defaultValue={job.deadline ?? ""}
              onBlur={(e) => patch.mutate({ deadline: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Responsável da etapa</Label>
            <div className="flex gap-2">
              <Input
                placeholder={job.assignee ?? "Nome"}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  patch.mutate({ stageAssignee: assignee.trim() || null });
                  setAssignee("");
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Alerta de matéria-prima</Label>
            <Input
              defaultValue={job.material_alert ?? ""}
              placeholder="Ex.: falta linha dourada"
              onBlur={(e) => patch.mutate({ material_alert: e.target.value || null })}
            />
          </div>
        </div>

        {job.stage_assignees && Object.keys(job.stage_assignees).length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">Responsáveis por etapa</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(job.stage_assignees).map(([s, name]) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-1 text-xs"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {String(name).slice(0, 1).toUpperCase()}
                  </span>
                  {STAGE_LABEL[s as Stage] ?? s}: {name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <Separator className="my-4" />

        <p className="text-sm font-semibold">Linha do tempo</p>
        <ol className="mt-3 space-y-3 border-l border-border pl-4">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem eventos registrados.</p>
          ) : (
            events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-xs font-semibold">
                  {STAGE_LABEL[e.to_stage as Stage] ?? e.to_stage}
                  {e.duration_seconds != null ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatDuration(e.duration_seconds)}
                    </span>
                  ) : (
                    <span className="ml-2 font-normal text-primary">em andamento</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBRDateTime(e.entered_at)}
                  {e.assignee ? ` · ${e.assignee}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </li>
            ))
          )}
        </ol>

        <Separator className="my-4" />

        <p className="text-sm font-semibold">Observações internas</p>
        <p className="text-[11px] text-muted-foreground">Visível apenas para a equipe.</p>
        <div className="mt-2 flex gap-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder='Ex.: "Cliente pediu bordado dourado."'
            rows={2}
          />
          <Button
            variant="outline"
            className="shrink-0"
            disabled={!comment.trim() || addComment.isPending}
            onClick={() => addComment.mutate()}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 space-y-2 pb-8">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-muted/30 p-2.5">
              <p className="text-xs">{c.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {c.author ?? "Equipe"} · {formatBRDateTime(c.created_at)}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
