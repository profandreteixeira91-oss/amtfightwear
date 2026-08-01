import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { STAGES, STAGE_ACCENT, STAGE_LABEL, isStage } from "@/lib/store/production-stages";
import type { Stage } from "@/lib/store/production-stages";
import { ProductionCard } from "./ProductionCard";
import type { CardMeta } from "./ProductionCard";
import type { ProductionJob } from "@/lib/store/production.functions";

function Column({
  stage,
  jobs,
  metaOf,
  selected,
  onToggle,
  onOpen,
}: {
  stage: Stage;
  jobs: ProductionJob[];
  metaOf: (j: ProductionJob) => CardMeta;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onOpen: (j: ProductionJob) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const pieces = jobs.reduce((a, j) => a + Number(j.quantity || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 flex-col rounded-2xl border bg-muted/30 transition ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${STAGE_ACCENT[stage]}`}>
            {STAGE_LABEL[stage]}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {jobs.length} · {pieces} pçs
        </span>
      </div>
      <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto p-2">
        {jobs.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum item</p>
        ) : (
          jobs.map((j) => (
            <ProductionCard
              key={j.id}
              job={j}
              meta={metaOf(j)}
              selected={!!selected[j.id]}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ProductionKanban({
  jobs,
  metaOf,
  selected,
  onToggle,
  onOpen,
  onMove,
  visibleStages,
}: {
  jobs: ProductionJob[];
  metaOf: (j: ProductionJob) => CardMeta;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onOpen: (j: ProductionJob) => void;
  onMove: (id: string, stage: Stage) => void;
  visibleStages?: Stage[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const stages = visibleStages?.length ? visibleStages : [...STAGES];

  function handleDragEnd(e: DragEndEvent) {
    const target = String(e.over?.id ?? "");
    const id = String(e.active.id);
    if (!target || !isStage(target)) return;
    const job = jobs.find((j) => j.id === id);
    if (!job || job.stage === target) return;
    onMove(id, target);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {stages.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            jobs={jobs.filter((j) => j.stage === stage)}
            metaOf={metaOf}
            selected={selected}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
      </div>
    </DndContext>
  );
}
