import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle, Clock, CreditCard, Package, Sparkles, Timer, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBR, todayISO, diffDaysISO } from "@/lib/dates";
import {
  ORDER_TYPE_CLS,
  ORDER_TYPE_LABEL,
  URGENCY_CLS,
  URGENCY_LABEL,
  formatDuration,
  jobCode,
  paymentBadgeCls,
  paymentBadgeLabel,
} from "@/lib/store/production-stages";
import type { OrderType, Urgency } from "@/lib/store/production-stages";
import type { ProductionJob } from "@/lib/store/production.functions";

export type CardMeta = {
  /** Itens do mesmo pedido, para o resumo "Total: X itens". */
  siblings: number;
  totalPieces: number;
};

export function deadlineState(job: ProductionJob) {
  if (!job.deadline) return { label: "Sem prazo", tone: "muted" as const, days: null };
  const today = todayISO();
  const days = diffDaysISO(today, job.deadline);
  if (job.stage === "finalizado") return { label: formatBR(job.deadline), tone: "done" as const, days };
  if (days < 0) return { label: `Atrasado ${Math.abs(days)}d`, tone: "late" as const, days };
  if (days === 0) return { label: "Entrega hoje", tone: "today" as const, days };
  return { label: `${days}d restantes`, tone: "ok" as const, days };
}

const TONE_CLS: Record<string, string> = {
  muted: "text-muted-foreground",
  ok: "text-muted-foreground",
  today: "text-amber-500 font-semibold",
  late: "text-destructive font-semibold",
  done: "text-emerald-500",
};

export function ProductionCard({
  job,
  meta,
  selected,
  onToggle,
  onOpen,
  dragDisabled,
}: {
  job: ProductionJob;
  meta?: CardMeta;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (job: ProductionJob) => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: dragDisabled,
  });
  const dl = deadlineState(job);
  const stuckSeconds = (Date.now() - new Date(job.stage_started_at).getTime()) / 1000;
  const stuck = stuckSeconds > 8 * 3600 && job.stage !== "finalizado";
  const big = Number(job.quantity) >= 20;

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
          : undefined
      }
      className={`group rounded-xl border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md ${
        isDragging ? "opacity-80 ring-2 ring-primary/50" : ""
      } ${selected ? "border-primary/60 ring-1 ring-primary/40" : "border-border"}`}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(job.id)}
          aria-label="Selecionar item"
          className="mt-0.5"
        />
        <button
          type="button"
          onClick={() => onOpen(job)}
          className="min-w-0 flex-1 text-left"
          title="Abrir detalhes"
        >
          <p className="truncate text-sm font-semibold">{job.reference ?? jobCode(job.id)}</p>
          <p className="truncate text-xs text-muted-foreground">{job.customer_name ?? "Sem cliente"}</p>
        </button>
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-md p-1 text-muted-foreground opacity-60 transition group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Arrastar"
        >
          ⠿
        </span>
      </div>

      <button type="button" onClick={() => onOpen(job)} className="mt-2 block w-full text-left">
        <div className="flex items-start gap-2">
          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-xs leading-snug">
            <span className="font-medium">{Number(job.quantity)}×</span> {job.product_name}
            {job.variant_label ? (
              <span className="text-muted-foreground"> · {job.variant_label}</span>
            ) : null}
          </p>
        </div>
        {meta && meta.siblings > 1 ? (
          <p className="mt-1 pl-5 text-[11px] text-muted-foreground">
            Pedido com {meta.siblings} itens · {meta.totalPieces} peças
          </p>
        ) : null}
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={URGENCY_CLS[job.urgency as Urgency]}>
          {URGENCY_LABEL[job.urgency as Urgency] ?? job.urgency}
        </Badge>
        <Badge variant="outline" className={ORDER_TYPE_CLS[job.order_type as OrderType]}>
          {ORDER_TYPE_LABEL[job.order_type as OrderType] ?? job.order_type}
        </Badge>
        {job.source === "order" ? (
          <Badge variant="outline" className={paymentBadgeCls(job.payment_status)}>
            <CreditCard className="mr-1 h-3 w-3" /> {paymentBadgeLabel(job.payment_status)}
          </Badge>
        ) : null}
        <Badge variant="outline" className="border-border text-muted-foreground">

          {big ? "Pedido grande" : "Pedido pequeno"}
        </Badge>
        {job.custom_config ? (
          <Badge variant="outline" className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500">
            <Sparkles className="mr-1 h-3 w-3" /> Personalizado
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1 ${TONE_CLS[dl.tone]}`}>
          <Clock className="h-3 w-3" /> {dl.label}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Timer className="h-3 w-3" /> {formatDuration(stuckSeconds)} na etapa
        </span>
      </div>

      {(job.assignee || stuck || job.material_alert || job.blocked_reason) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-[11px]">
          {job.assignee ? (
            <span className="inline-flex items-center gap-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {job.assignee.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate">{job.assignee}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <User className="h-3 w-3" /> Sem responsável
            </span>
          )}
          {stuck ? (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <AlertTriangle className="h-3 w-3" /> Parado
            </span>
          ) : null}
          {job.material_alert ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" /> Material
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
