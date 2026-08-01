import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Factory,
  Hammer,
  Pause,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/common/PageShell";
import { formatBR, todayISO } from "@/lib/dates";
import {
  adminBulkUpdateProductionJobs,
  adminDeleteProductionJob,
  adminListProductionJobs,
  adminSyncProductionQueue,
  adminUpdateProductionJob,
  type ProductionJob,
} from "@/lib/store/production.functions";

export const Route = createFileRoute("/_authenticated/admin/producao")({
  component: ProductionQueuePage,
  head: () => ({
    meta: [
      { title: "Fila de produção | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Fila de produção da confecção AMT Fight Wear: pedidos da loja e itens de orçamentos aprovados na ordem de entrada, com prazos editáveis.",
      },
      { property: "og:title", content: "Fila de produção | AMT Fight Wear" },
      {
        property: "og:description",
        content: "Acompanhe e priorize a produção de pedidos e orçamentos aprovados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Status = ProductionJob["status"];

const STATUS: Record<Status, { label: string; cls: string; icon: typeof Clock }> = {
  queued: { label: "Na fila", cls: "bg-muted text-muted-foreground border-border", icon: Clock },
  in_production: {
    label: "Em produção",
    cls: "bg-primary/15 text-primary border-primary/30",
    icon: Hammer,
  },
  paused: { label: "Pausado", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Pause },
  done: {
    label: "Concluído",
    cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    icon: CheckCircle2,
  },
  cancelled: { label: "Cancelado", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: X },
};

const ALL = "__all__";

function deadlineInfo(deadline: string | null, status: Status) {
  if (!deadline) return { label: "Sem prazo", cls: "text-muted-foreground" };
  const today = todayISO();
  const done = status === "done" || status === "cancelled";
  const late = !done && deadline < today;
  const todayIs = !done && deadline === today;
  return {
    label: formatBR(deadline),
    cls: late ? "text-destructive font-semibold" : todayIs ? "text-amber-500 font-semibold" : "text-foreground",
  };
}

function ProductionQueuePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProductionJobs);
  const syncFn = useServerFn(adminSyncProductionQueue);
  const updateFn = useServerFn(adminUpdateProductionJob);
  const bulkFn = useServerFn(adminBulkUpdateProductionJobs);
  const deleteFn = useServerFn(adminDeleteProductionJob);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["admin-production-jobs"],
    queryFn: () => listFn(),
  });

  const [term, setTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [sourceFilter, setSourceFilter] = useState<string>(ALL);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkDeadline, setBulkDeadline] = useState("");
  const [bulkStatus, setBulkStatus] = useState<string>(ALL);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-production-jobs"] });

  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: { inserted: number }) => {
      toast.success(
        r.inserted > 0 ? `${r.inserted} item(ns) adicionado(s) à fila` : "Fila já está atualizada",
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: (v: Parameters<typeof adminUpdateProductionJob>[0]["data"]) => updateFn({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Item removido da fila");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: (v: { ids: string[]; status?: Status; deadline?: string | null }) => bulkFn({ data: v }),
    onSuccess: () => {
      toast.success("Fila atualizada em massa");
      setSelected({});
      setBulkDeadline("");
      setBulkStatus(ALL);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter === "open" && (j.status === "done" || j.status === "cancelled")) return false;
      if (statusFilter !== "open" && statusFilter !== ALL && j.status !== statusFilter) return false;
      if (sourceFilter !== ALL && j.source !== sourceFilter) return false;
      if (!t) return true;
      return [j.product_name, j.customer_name, j.reference, j.sku, j.variant_label, j.assignee]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t));
    });
  }, [jobs, term, statusFilter, sourceFilter]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const openJobs = jobs.filter((j) => j.status !== "done" && j.status !== "cancelled");
  const today = todayISO();
  const stats = {
    fila: jobs.filter((j) => j.status === "queued").length,
    producao: jobs.filter((j) => j.status === "in_production").length,
    atrasados: openJobs.filter((j) => j.deadline && j.deadline < today).length,
    pecas: openJobs.reduce((a, j) => a + Number(j.quantity || 0), 0),
  };

  return (
    <PageShell
      title="Fila de produção"
      description="Pedidos da loja e itens de orçamentos aprovados, na ordem de entrada."
      icon={Factory}
      actions={
        <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
          Atualizar fila
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Na fila", value: stats.fila, icon: Clock },
          { label: "Em produção", value: stats.producao, icon: Hammer },
          { label: "Atrasados", value: stats.atrasados, icon: CalendarClock },
          { label: "Peças pendentes", value: stats.pecas, icon: Factory },
        ].map((s) => (
          <Card key={s.label} className="min-w-0">
            <CardContent className="flex min-w-0 items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar produto, cliente, pedido..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Em aberto</SelectItem>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {(Object.keys(STATUS) as Status[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as origens</SelectItem>
              <SelectItem value="order">Pedidos da loja</SelectItem>
              <SelectItem value="quote">Orçamentos aprovados</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="mt-4 border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edição em massa ({selectedIds.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Novo prazo</Label>
              <Input type="date" value={bulkDeadline} onChange={(e) => setBulkDeadline(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Novo status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Manter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Manter</SelectItem>
                  {(Object.keys(STATUS) as Status[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button
                disabled={bulk.isPending || (!bulkDeadline && bulkStatus === ALL)}
                onClick={() =>
                  bulk.mutate({
                    ids: selectedIds,
                    ...(bulkDeadline ? { deadline: bulkDeadline } : {}),
                    ...(bulkStatus !== ALL ? { status: bulkStatus as Status } : {}),
                  })
                }
              >
                Aplicar
              </Button>
              <Button variant="ghost" onClick={() => setSelected({})}>
                Limpar seleção
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Fila ({filtered.length})</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={filtered.length > 0 && filtered.every((j) => selected[j.id])}
              onCheckedChange={(v) => {
                const next: Record<string, boolean> = { ...selected };
                filtered.forEach((j) => {
                  next[j.id] = Boolean(v);
                });
                setSelected(next);
              }}
            />
            Selecionar todos
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando fila...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum item na fila. Clique em “Atualizar fila” para importar pedidos e orçamentos aprovados.
            </p>
          )}
          {filtered.map((j, idx) => {
            const st = STATUS[j.status];
            const dl = deadlineInfo(j.deadline, j.status);
            return (
              <div
                key={j.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 md:flex-row md:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Checkbox
                    checked={Boolean(selected[j.id])}
                    onCheckedChange={(v) => setSelected((p) => ({ ...p, [j.id]: Boolean(v) }))}
                    className="mt-1"
                  />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{j.product_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {j.variant_label ? `${j.variant_label} • ` : ""}
                      {j.quantity} un{j.sku ? ` • SKU ${j.sku}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {j.source === "order" ? "Pedido" : j.source === "quote" ? "Orçamento" : "Manual"}
                        {j.reference ? ` ${j.reference}` : ""}
                      </Badge>
                      <span className="truncate">{j.customer_name ?? "—"}</span>
                      <span className="truncate">Entrada {formatBR(j.queued_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <div className="min-w-0">
                    <Label className="text-[10px] text-muted-foreground">Prazo</Label>
                    <Input
                      type="date"
                      value={j.deadline ?? ""}
                      onChange={(e) => patch.mutate({ id: j.id, deadline: e.target.value || null })}
                      className={`h-9 w-[150px] ${dl.cls}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-[10px] text-muted-foreground">Responsável</Label>
                    <Input
                      defaultValue={j.assignee ?? ""}
                      placeholder="Produtor"
                      onBlur={(e) => {
                        if ((j.assignee ?? "") !== e.target.value)
                          patch.mutate({ id: j.id, assignee: e.target.value || null });
                      }}
                      className="h-9 w-[140px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-[10px] text-muted-foreground">Status</Label>
                    <Select
                      value={j.status}
                      onValueChange={(v) => patch.mutate({ id: j.id, status: v as Status })}
                    >
                      <SelectTrigger className={`h-9 w-[150px] border ${st.cls}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS) as Status[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-4 text-destructive"
                    onClick={() => remove.mutate(j.id)}
                    aria-label="Remover da fila"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageShell>
  );
}
