import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Factory,
  Gauge,
  Layers,
  Printer,
  QrCode,
  RefreshCw,
  Rocket,
  Search,
  Tag,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/common/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { formatBR, todayISO, diffDaysISO, dayISO } from "@/lib/dates";
import {
  ORDER_TYPES,
  ORDER_TYPE_LABEL,
  STAGES,
  STAGE_LABEL,
  URGENCIES,
  URGENCY_LABEL,
  URGENCY_WEIGHT,
  formatDuration,
  jobCode,
  parseScannedCode,
} from "@/lib/store/production-stages";
import type { OrderType, Stage, Urgency } from "@/lib/store/production-stages";
import {
  adminBulkUpdateProductionJobs,
  adminDeleteProductionJob,
  adminListProductionJobs,
  adminMoveProductionStage,
  adminProductionAnalytics,
  adminSyncProductionQueue,
} from "@/lib/store/production.functions";
import type { ProductionJob } from "@/lib/store/production.functions";
import { ProductionKanban } from "@/components/store/production/ProductionKanban";
import { ProductionDetailSheet } from "@/components/store/production/ProductionDetailSheet";
import { ProductionPerformance } from "@/components/store/production/ProductionPerformance";
import { ProductionScanner } from "@/components/store/production/ProductionScanner";
import { printProductionLabels, printProductionSheet } from "@/lib/store/production-print";

export const Route = createFileRoute("/_authenticated/admin/producao")({
  component: ProductionQueuePage,
  head: () => ({
    meta: [
      { title: "Fila de produção | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Centro operacional da confecção AMT Fight Wear: Kanban por etapa, cronômetro automático, responsáveis, etiquetas com QR Code e indicadores de desempenho.",
      },
      { property: "og:title", content: "Fila de produção | AMT Fight Wear" },
      {
        property: "og:description",
        content: "Kanban da produção com prioridades, prazos, responsáveis e indicadores em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ALL = "__all__";

function priorityScore(j: ProductionJob) {
  const today = todayISO();
  const days = j.deadline ? diffDaysISO(today, j.deadline) : 99;
  const stuckHours = (Date.now() - new Date(j.stage_started_at).getTime()) / 3600000;
  const typeBoost = j.order_type === "wholesale" ? 6 : j.order_type === "custom" ? 4 : 0;
  return (
    j.priority * 20 +
    URGENCY_WEIGHT[j.urgency as Urgency] * 25 +
    Math.max(0, 30 - days) * 3 +
    Math.min(stuckHours, 72) +
    typeBoost
  );
}

function ProductionQueuePage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListProductionJobs);
  const syncFn = useServerFn(adminSyncProductionQueue);
  const moveFn = useServerFn(adminMoveProductionStage);
  const bulkFn = useServerFn(adminBulkUpdateProductionJobs);
  const deleteFn = useServerFn(adminDeleteProductionJob);
  const analyticsFn = useServerFn(adminProductionAnalytics);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["admin-production-jobs"],
    queryFn: () => listFn(),
  });
  const { data: analytics } = useQuery({
    queryKey: ["admin-production-analytics"],
    queryFn: () => analyticsFn(),
  });

  const [term, setTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [urgencyFilter, setUrgencyFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [hideDone, setHideDone] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openJob, setOpenJob] = useState<ProductionJob | null>(null);
  const [scanning, setScanning] = useState(false);
  const [groupBy, setGroupBy] = useState<"product" | "customer" | "stage" | "deadline" | "assignee">(
    "product",
  );
  const [bulkStage, setBulkStage] = useState<string>(ALL);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkDeadline, setBulkDeadline] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-production-jobs"] });
    qc.invalidateQueries({ queryKey: ["admin-production-analytics"] });
  };

  // Tempo real: qualquer mudança na fila reflete sem recarregar a página.
  useEffect(() => {
    const channel = supabase
      .channel("production-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_production_jobs" }, () =>
        qc.invalidateQueries({ queryKey: ["admin-production-jobs"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: { inserted: number }) => {
      toast.success(r.inserted > 0 ? `${r.inserted} item(ns) na fila` : "Fila já está atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Sincronização silenciosa ao abrir a página: nenhum pedido fica de fora da fila.
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current) return;
    autoSynced.current = true;
    void syncFn()
      .then((r: { inserted: number }) => {
        if (r?.inserted > 0) invalidate();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = useMutation({
    mutationFn: (v: { id: string; stage: Stage }) => moveFn({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: (v: {
      ids: string[];
      stage?: Stage;
      status?: "paused" | "in_production";
      assignee?: string | null;
      deadline?: string | null;
      urgency?: Urgency;
    }) => bulkFn({ data: v }),
    onSuccess: () => {
      toast.success("Produção atualizada em massa");
      setSelected({});
      setBulkStage(ALL);
      setBulkAssignee("");
      setBulkDeadline("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) => deleteFn({ data: { ids } }),
    onSuccess: () => {
      toast.success("Itens removidos da fila (pedidos preservados)");
      setSelected({});
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignees = useMemo(
    () => [...new Set(jobs.map((j) => j.assignee).filter(Boolean))] as string[],
    [jobs],
  );

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    const words = t.split(/\s+/).filter(Boolean);
    return jobs
      .filter((j) => {
        if (hideDone && j.stage === "finalizado") return false;
        if (stageFilter !== ALL && j.stage !== stageFilter) return false;
        if (typeFilter !== ALL && j.order_type !== typeFilter) return false;
        if (urgencyFilter !== ALL && j.urgency !== urgencyFilter) return false;
        if (assigneeFilter !== ALL && (j.assignee ?? "") !== assigneeFilter) return false;
        if (!words.length) return true;
        const hay = [
          j.product_name,
          j.customer_name,
          j.reference,
          j.sku,
          j.variant_label,
          j.assignee,
          jobCode(j.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return words.some((w) => hay.includes(w));
      })
      .sort((a, b) => priorityScore(b) - priorityScore(a));
  }, [jobs, term, stageFilter, typeFilter, urgencyFilter, assigneeFilter, hideDone]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const selectedJobs = jobs.filter((j) => selected[j.id]);
  const today = todayISO();
  const open = jobs.filter((j) => j.stage !== "finalizado");

  const stats = {
    hoje: open.filter((j) => j.deadline === today).length,
    emProducao: open.filter((j) => j.stage !== "recebido").length,
    novos: open.filter((j) => j.stage === "recebido").length,
    finalizadosHoje: jobs.filter((j) => j.completed_at && dayISO(j.completed_at) === today).length,
    atrasados: open.filter((j) => j.deadline && j.deadline < today).length,
    urgentes: open.filter((j) => j.urgency === "urgent").length,
    pecas: open.reduce((a, j) => a + Number(j.quantity || 0), 0),
    semResponsavel: open.filter((j) => !j.assignee).length,
    faturadoHoje: jobs
      .filter((j) => j.completed_at && dayISO(j.completed_at) === today)
      .reduce(
        (a, j) =>
          a + Number(j.total_value ?? Number(j.unit_price ?? 0) * Number(j.quantity || 0)),
        0,
      ),
  };
  const stageCounts = Object.fromEntries(
    STAGES.map((s) => [s, open.filter((j) => j.stage === s).length]),
  ) as Record<Stage, number>;
  const capacityUsed = Math.min(100, Math.round((stats.pecas / 300) * 100));
  const efficiency = analytics
    ? Math.round(
        (analytics.onTime / Math.max(1, analytics.onTime + analytics.late)) * 100 -
          analytics.reworkRate / 2,
      )
    : 0;

  const orderMeta = useMemo(() => {
    const map = new Map<string, { siblings: number; totalPieces: number }>();
    for (const j of jobs) {
      const key = `${j.source}:${j.source_id ?? j.id}`;
      const cur = map.get(key) ?? { siblings: 0, totalPieces: 0 };
      cur.siblings += 1;
      cur.totalPieces += Number(j.quantity || 0);
      map.set(key, cur);
    }
    return map;
  }, [jobs]);

  const metaOf = (j: ProductionJob) =>
    orderMeta.get(`${j.source}:${j.source_id ?? j.id}`) ?? { siblings: 1, totalPieces: Number(j.quantity) };

  const groups = useMemo(() => {
    const key = (j: ProductionJob) => {
      if (groupBy === "product") return j.product_name;
      if (groupBy === "customer") return j.customer_name ?? "Sem cliente";
      if (groupBy === "stage") return STAGE_LABEL[j.stage as Stage] ?? j.stage;
      if (groupBy === "assignee") return j.assignee ?? "Sem responsável";
      return j.deadline ? formatBR(j.deadline) : "Sem prazo";
    };
    const map = new Map<string, { pieces: number; items: ProductionJob[] }>();
    for (const j of filtered) {
      const k = key(j);
      const cur = map.get(k) ?? { pieces: 0, items: [] };
      cur.pieces += Number(j.quantity || 0);
      cur.items.push(j);
      map.set(k, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].pieces - a[1].pieces);
  }, [filtered, groupBy]);

  const alerts = useMemo(() => {
    const out: { tone: "danger" | "warn"; text: string }[] = [];
    if (stats.atrasados) out.push({ tone: "danger", text: `${stats.atrasados} item(ns) com prazo vencido` });
    if (stats.urgentes) out.push({ tone: "warn", text: `${stats.urgentes} item(ns) marcados como urgentes` });
    const stuck = open.filter(
      (j) => (Date.now() - new Date(j.stage_started_at).getTime()) / 3600000 > 24,
    ).length;
    if (stuck) out.push({ tone: "warn", text: `${stuck} item(ns) parados há mais de 24h na mesma etapa` });
    if (stats.semResponsavel)
      out.push({ tone: "warn", text: `${stats.semResponsavel} item(ns) aguardando responsável` });
    const material = open.filter((j) => j.material_alert).length;
    if (material) out.push({ tone: "danger", text: `${material} item(ns) com alerta de matéria-prima` });
    return out;
  }, [open, stats]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function handleScan(raw: string) {
    setScanning(false);
    const code = parseScannedCode(raw).toLowerCase();
    const found = jobs.find(
      (j) => j.id.toLowerCase() === code || jobCode(j.id).toLowerCase() === `pj-${code}`,
    );
    if (found) setOpenJob(found);
    else toast.error("Etiqueta não encontrada na fila.");
  }

  return (
    <PageShell
      title="Fila de produção"
      description="Centro operacional da confecção: Kanban por etapa, cronômetro automático, responsáveis e indicadores em tempo real."
      eyebrow="AMT Fight Wear"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setScanning(true)}>
            <QrCode className="h-4 w-4" /> Escanear
          </Button>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
        </div>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Produção hoje" value={stats.hoje} icon={Rocket} />
        <Kpi label="Em produção" value={stats.emProducao} icon={Factory} />
        <Kpi label="Pedidos novos" value={stats.novos} icon={Clock} />
        <Kpi label="Finalizados hoje" value={stats.finalizadosHoje} icon={CheckCircle2} />
        <Kpi label="Atrasados" value={stats.atrasados} icon={AlertTriangle} tone="danger" />
        <Kpi label="Peças pendentes" value={stats.pecas} icon={Layers} />
        <Kpi
          label="Faturado hoje (produção)"
          value={stats.faturadoHoje}
          display={stats.faturadoHoje.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tempo médio de produção</p>
            <p className="text-2xl font-bold">{formatDuration(analytics?.avgLeadSeconds ?? 0)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Retrabalho: {(analytics?.reworkRate ?? 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Capacidade utilizada</p>
            <p className="text-2xl font-bold">{capacityUsed}%</p>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${capacityUsed}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Eficiência da produção</p>
            <p className="text-2xl font-bold">{Math.max(0, efficiency)}%</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              No prazo: {analytics?.onTime ?? 0} · Atrasados: {analytics?.late ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pendências por etapa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pendências por etapa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STAGES.filter((s) => s !== "finalizado").map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStageFilter(stageFilter === s ? ALL : s)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition hover:border-primary/50 ${
                stageFilter === s ? "border-primary bg-primary/5" : "border-border bg-muted/30"
              }`}
            >
              <span className="block text-muted-foreground">Aguardando {STAGE_LABEL[s]}</span>
              <span className="text-base font-bold">{stageCounts[s]}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {alerts.length > 0 ? (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas da produção
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {alerts.map((a) => (
              <Badge
                key={a.text}
                variant="outline"
                className={
                  a.tone === "danger"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-500"
                }
              >
                {a.text}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Pedido, cliente, SKU, produto, código…"
              className="pl-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as etapas</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as origens</SelectItem>
              {ORDER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ORDER_TYPE_LABEL[t as OrderType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Urgência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as urgências</SelectItem>
              {URGENCIES.map((u) => (
                <SelectItem key={u} value={u}>
                  {URGENCY_LABEL[u as Urgency]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 md:col-span-3">
            <Button
              type="button"
              size="sm"
              variant={hideDone ? "default" : "outline"}
              onClick={() => setHideDone((v) => !v)}
            >
              {hideDone ? "Ocultando finalizados" : "Mostrando finalizados"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {filtered.length} item(ns) · {filtered.reduce((a, j) => a + Number(j.quantity || 0), 0)} peças
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Ações em massa */}
      {selectedIds.length > 0 ? (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produção em massa ({selectedIds.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Mover para etapa</Label>
              <Select
                value={bulkStage}
                onValueChange={(v) => {
                  setBulkStage(v);
                  if (v !== ALL) bulk.mutate({ ids: selectedIds, stage: v as Stage });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
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
              <Label className="text-xs">Responsável</Label>
              <div className="flex gap-2">
                <Input value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} placeholder="Nome" />
                <Button
                  variant="outline"
                  onClick={() => bulk.mutate({ ids: selectedIds, assignee: bulkAssignee || null })}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Novo prazo</Label>
              <div className="flex gap-2">
                <Input type="date" value={bulkDeadline} onChange={(e) => setBulkDeadline(e.target.value)} />
                <Button
                  variant="outline"
                  onClick={() => bulk.mutate({ ids: selectedIds, deadline: bulkDeadline || null })}
                >
                  OK
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulk.mutate({ ids: selectedIds, stage: "finalizado" })}
              >
                Finalizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulk.mutate({ ids: selectedIds, status: "paused" })}
              >
                Pausar
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => printProductionSheet(selectedJobs)}>
                <Printer className="h-4 w-4" /> Folha
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => printProductionLabels(selectedJobs)}>
                <Tag className="h-4 w-4" /> Etiquetas
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                onClick={() => remove.mutate(selectedIds)}
              >
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-2">
            <Factory className="h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="grupos" className="gap-2">
            <Layers className="h-4 w-4" /> Agrupado
          </TabsTrigger>
          <TabsTrigger value="desempenho" className="gap-2">
            <Gauge className="h-4 w-4" /> Desempenho
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando fila…</p>
          ) : (
            <ProductionKanban
              jobs={filtered}
              metaOf={metaOf}
              selected={selected}
              onToggle={toggle}
              onOpen={setOpenJob}
              onMove={(id, stage) => move.mutate({ id, stage })}
            />
          )}
        </TabsContent>

        <TabsContent value="grupos" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs">Agrupar por</Label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="stage">Etapa</SelectItem>
                <SelectItem value="deadline">Prazo</SelectItem>
                <SelectItem value="assignee">Responsável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {groups.map(([name, g]) => (
            <Card key={name}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="truncate text-base">{name}</CardTitle>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{g.pieces} peças</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelected((s) => {
                        const next = { ...s };
                        g.items.forEach((j) => (next[j.id] = true));
                        return next;
                      })
                    }
                  >
                    Selecionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {g.items.slice(0, 12).map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setOpenJob(j)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left text-xs hover:border-primary/40"
                  >
                    <span className="min-w-0 truncate">
                      {Number(j.quantity)}× {j.product_name}
                      <span className="text-muted-foreground"> · {j.reference ?? jobCode(j.id)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {STAGE_LABEL[j.stage as Stage]}
                    </span>
                  </button>
                ))}
                {g.items.length > 12 ? (
                  <p className="text-[11px] text-muted-foreground">+ {g.items.length - 12} item(ns)</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="desempenho" className="mt-4">
          <ProductionPerformance data={analytics} />
        </TabsContent>
      </Tabs>

      <ProductionDetailSheet job={openJob} onClose={() => setOpenJob(null)} onChanged={invalidate} />
      <ProductionScanner open={scanning} onClose={() => setScanning(false)} onDecoded={handleScan} />
    </PageShell>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  display,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  tone?: "danger";
  display?: string;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex min-w-0 items-center gap-3 p-4">
        <div
          className={`rounded-lg p-2 ${
            tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{display ?? value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
