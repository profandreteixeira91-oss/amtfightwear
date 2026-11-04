import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CalendarClock, FileText, Plus, Search, ShoppingCart } from "lucide-react";
import { adminCrmListDeals, adminCrmSaveDeal, type CrmDeal } from "@/lib/store/crm.functions";
import { DEAL_STAGES, DEAL_STAGE_IDS, isClosedStage, type DealStage } from "@/lib/store/crm";
import { DealDialog } from "@/components/store/crm/DealDialog";
import { PageShell } from "@/components/common/PageShell";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/store/cart-store";
import { formatBR, todayISO } from "@/lib/dates";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/crm")({
  head: () => ({
    meta: [
      { title: "Pipeline comercial — AMT Fight Wear" },
      { name: "description", content: "Funil de vendas: do novo contato à venda fechada." },
    ],
  }),
  component: PipelinePage,
});

type Deal = Awaited<ReturnType<typeof adminCrmListDeals>>[number];
const CLOSED_WINDOW_DAYS = 30;
const DAY = 86400000;

function PipelinePage() {
  const listFn = useServerFn(adminCrmListDeals);
  const saveFn = useServerFn(adminCrmSaveDeal);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "crm", "deals"],
    queryFn: () => listFn(),
    refetchInterval: ADMIN_REFRESH.dashboard,
    placeholderData: keepPreviousData,
  });
  const [q, setQ] = useState("");
  const [showOldClosed, setShowOldClosed] = useState(false);
  const [dialog, setDialog] = useState<{ deal: CrmDeal | null; stage?: DealStage } | null>(null);

  const move = useMutation({
    mutationFn: (v: { id: string; stage: DealStage }) => saveFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "crm"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deals = useMemo(() => data ?? [], [data]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return deals.filter((d) => {
      if (!showOldClosed && isClosedStage(d.stage) && d.closed_at && Date.now() - new Date(d.closed_at).getTime() > CLOSED_WINDOW_DAYS * DAY) return false;
      if (!term) return true;
      return [d.title, d.product_interest, d.customer?.full_name, d.customer?.company, d.quote?.quote_number, d.order?.order_number].some((v) =>
        v?.toLowerCase().includes(term),
      );
    });
  }, [deals, q, showOldClosed]);

  const stats = useMemo(() => {
    const open = deals.filter((d) => !isClosedStage(d.stage));
    const month = new Date().toISOString().slice(0, 7);
    const won = deals.filter((d) => d.stage === "ganho");
    const lost = deals.filter((d) => d.stage === "perdido");
    return {
      open: open.length,
      pipeline: open.reduce((a, d) => a + Number(d.value || 0), 0),
      wonMonth: won.filter((d) => d.closed_at?.startsWith(month)).reduce((a, d) => a + Number(d.value || 0), 0),
      conversion: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null,
      late: open.filter((d) => d.next_action_at && d.next_action_at < todayISO()).length,
    };
  }, [deals]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const stage = String(e.over?.id ?? "") as DealStage;
    const deal = deals.find((d) => d.id === String(e.active.id));
    if (!deal || !DEAL_STAGE_IDS.includes(stage) || deal.stage === stage) return;
    // Fechar pede o pedido/orçamento; perder pede o motivo: abre o formulário já na etapa.
    if ((stage === "ganho" && !deal.quote_id && !deal.order_id) || (stage === "perdido" && !deal.lost_reason)) {
      setDialog({ deal, stage });
      return;
    }
    move.mutate({ id: deal.id, stage });
  };

  return (
    <PageShell
      title="Pipeline comercial"
      description={
        isLoading
          ? "Carregando oportunidades…"
          : `${stats.open} em aberto · ${formatBRL(stats.pipeline)} em negociação · ${formatBRL(stats.wonMonth)} fechados no mês${
              stats.conversion != null ? ` · conversão ${stats.conversion}%` : ""
            }${stats.late ? ` · ${stats.late} com ação atrasada` : ""}`
      }
      actions={
        <Button className="gap-2" onClick={() => setDialog({ deal: null })}>
          <Plus className="h-4 w-4" /> Nova oportunidade
        </Button>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, produto, orçamento ou pedido" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="old-closed" checked={showOldClosed} onCheckedChange={setShowOldClosed} />
          <Label htmlFor="old-closed" className="text-sm text-muted-foreground">
            Mostrar fechadas há mais de {CLOSED_WINDOW_DAYS} dias
          </Label>
        </div>
      </div>

      {error ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[60vh] w-[270px] shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
            {DEAL_STAGES.map((s) => (
              <Column
                key={s.id}
                stage={s.id}
                label={s.label}
                tone={s.tone}
                deals={visible.filter((d) => d.stage === s.id)}
                onOpen={(d) => setDialog({ deal: d })}
              />
            ))}
          </div>
        </DndContext>
      )}
      {!isLoading && deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma oportunidade ainda. Crie uma aqui ou pela ficha do cliente em{" "}
          <Link to="/admin/clientes" className="underline">
            Clientes
          </Link>
          . Oportunidades com orçamento vinculado avançam sozinhas quando o orçamento é enviado, aprovado ou pago.
        </p>
      ) : null}

      <DealDialog
        open={dialog !== null}
        onOpenChange={(v) => !v && setDialog(null)}
        deal={dialog?.deal ?? null}
        initialStage={dialog?.stage}
      />
    </PageShell>
  );
}

function Column({ stage, label, tone, deals, onOpen }: { stage: DealStage; label: string; tone: string; deals: Deal[]; onOpen: (d: Deal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((a, d) => a + Number(d.value || 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cn("flex w-[270px] shrink-0 flex-col rounded-2xl border bg-muted/30 transition", isOver ? "border-primary bg-primary/5" : "border-border")}
    >
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", tone)} aria-hidden />
          <span className="text-sm font-semibold">{label}</span>
          <span className="ml-auto text-xs text-muted-foreground">{deals.length}</span>
        </div>
        <div className="mt-0.5 pl-[18px] text-xs tabular-nums text-muted-foreground">{formatBRL(total)}</div>
      </div>
      <div className="flex max-h-[64vh] flex-col gap-2 overflow-y-auto p-2">
        {deals.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Arraste para cá</p>
        ) : (
          deals.map((d) => <DealCard key={d.id} deal={d} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

function DealCard({ deal: d, onOpen }: { deal: Deal; onOpen: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: d.id });
  const today = todayISO();
  const late = !isClosedStage(d.stage) && d.next_action_at && d.next_action_at < today;
  const days = Math.floor((Date.now() - new Date(d.stage_changed_at).getTime()) / DAY);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined}
      className={cn(
        "cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 active:cursor-grabbing",
        isDragging && "opacity-80 ring-2 ring-primary/50",
      )}
    >
      <button type="button" onClick={() => onOpen(d)} className="block w-full text-left">
        <div className="text-sm font-semibold leading-snug">{d.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {d.customer ? d.customer.company || d.customer.full_name : "Sem cliente"}
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">
            {[d.quantity ? `${d.quantity} pç` : null, d.product_interest].filter(Boolean).join(" · ")}
          </span>
          {d.value ? <span className="shrink-0 font-semibold tabular-nums">{formatBRL(Number(d.value))}</span> : null}
        </div>
        {d.next_action ? (
          <div className={cn("mt-1.5 flex items-center gap-1 text-xs", late ? "font-semibold text-red-700" : "text-muted-foreground")}>
            <CalendarClock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {d.next_action}
              {d.next_action_at ? ` · ${formatBR(d.next_action_at)}` : ""}
            </span>
          </div>
        ) : null}
        {d.stage === "perdido" && d.lost_reason ? <div className="mt-1 text-xs text-rose-700">Motivo: {d.lost_reason}</div> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
          {d.quote ? (
            <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-violet-800">
              <FileText className="h-3 w-3" /> {d.quote.quote_number}
            </span>
          ) : null}
          {d.order ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
              <ShoppingCart className="h-3 w-3" /> {d.order.order_number}
            </span>
          ) : null}
          <span className="ml-auto text-muted-foreground">{days === 0 ? "hoje" : `${days}d na etapa`}</span>
        </div>
      </button>
    </div>
  );
}
