import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileText,
  MessageCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  Target,
  X,
} from "lucide-react";
import {
  adminGetCommercialCenter,
  type CommercialPriority,
  type CommercialTask,
  type CommercialTaskType,
} from "@/lib/store/commercial.functions";
import { PageShell } from "@/components/common/PageShell";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { whatsappLink } from "@/features/prospect/utils";
import { formatBRL } from "@/lib/store/cart-store";
import { diffDaysISO, formatBR, todayISO } from "@/lib/dates";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/comercial")({
  head: () => ({
    meta: [
      { title: "Central Comercial — AMT Fight Wear" },
      { name: "description", content: "Pendências comerciais do dia: orçamentos, pedidos, prazos, mensagens e prospecção." },
    ],
  }),
  component: CommercialCenterPage,
});

const PRIORITY: Record<CommercialPriority, { label: string; weight: number; dot: string; badge: string }> = {
  critica: { label: "Crítica", weight: 0, dot: "bg-red-600", badge: "bg-red-100 text-red-800" },
  alta: { label: "Alta", weight: 1, dot: "bg-orange-500", badge: "bg-orange-100 text-orange-800" },
  media: { label: "Média", weight: 2, dot: "bg-amber-400", badge: "bg-amber-100 text-amber-900" },
  baixa: { label: "Baixa", weight: 3, dot: "bg-neutral-400", badge: "bg-neutral-100 text-neutral-700" },
};

const TYPE_LABEL: Record<CommercialTaskType, string> = {
  orcamento_followup: "Follow-up de orçamento",
  orcamento_vencido: "Orçamento vencido",
  orcamento_aprovado: "Orçamento aprovado",
  orcamento_saldo: "Saldo a receber",
  pedido_pagamento: "Pagamento pendente",
  prazo_producao: "Prazo de produção",
  pronto_envio: "Pronto para envio",
  envio_sem_entrega: "Entrega a confirmar",
  pos_venda: "Pós-venda",
  chat_site: "Chat do site",
  instagram: "Instagram",
  prospeccao: "Prospecção",
  oportunidade: "Oportunidade",
  whatsapp_sem_resposta: "WhatsApp sem resposta",
  whatsapp_retorno: "Retorno agendado",
};

/** Grupos dos cartões do topo (também servem de filtro rápido). */
const GROUPS = [
  { key: "orcamentos", label: "Orçamentos e negociações", icon: FileText, types: ["orcamento_followup", "orcamento_vencido", "orcamento_aprovado", "orcamento_saldo", "oportunidade"] },
  { key: "pedidos", label: "Pedidos e prazos", icon: ShoppingCart, types: ["pedido_pagamento", "prazo_producao", "pronto_envio", "envio_sem_entrega", "pos_venda"] },
  { key: "mensagens", label: "Mensagens", icon: MessageCircle, types: ["whatsapp_sem_resposta", "whatsapp_retorno", "chat_site", "instagram"] },
  { key: "prospeccao", label: "Prospecção", icon: Target, types: ["prospeccao"] },
] as const satisfies ReadonlyArray<{ key: string; label: string; icon: unknown; types: readonly CommercialTaskType[] }>;

type DueFilter = "todas" | "atrasadas" | "hoje" | "semana";

function dueLabel(due: string | null, today: string) {
  if (!due) return { text: "Sem prazo", tone: "text-muted-foreground" };
  const d = diffDaysISO(today, due);
  if (d < 0) return { text: `Atrasada ${Math.abs(d)}d`, tone: "font-semibold text-red-700" };
  if (d === 0) return { text: "Hoje", tone: "font-semibold text-orange-700" };
  if (d === 1) return { text: "Amanhã", tone: "text-foreground" };
  return { text: formatBR(due), tone: "text-muted-foreground" };
}

function CommercialCenterPage() {
  const getFn = useServerFn(adminGetCommercialCenter);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin", "commercial-center"],
    queryFn: () => getFn(),
    refetchInterval: ADMIN_REFRESH.live,
    placeholderData: keepPreviousData,
  });

  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<"todas" | CommercialPriority>("todas");
  const [type, setType] = useState<"todos" | CommercialTaskType>("todos");
  const [group, setGroup] = useState<(typeof GROUPS)[number]["key"] | null>(null);
  const [due, setDue] = useState<DueFilter>("todas");
  const today = todayISO();

  const all = useMemo(
    () =>
      [...(data?.tasks ?? [])].sort(
        (a, b) =>
          PRIORITY[a.priority].weight - PRIORITY[b.priority].weight ||
          String(a.due ?? "9999").localeCompare(String(b.due ?? "9999")),
      ),
    [data?.tasks],
  );

  const tasks = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    const groupTypes = group ? (GROUPS.find((g) => g.key === group)?.types as readonly string[]) : null;
    return all.filter((t) => {
      if (priority !== "todas" && t.priority !== priority) return false;
      if (type !== "todos" && t.type !== type) return false;
      if (groupTypes && !groupTypes.includes(t.type)) return false;
      if (due !== "todas") {
        if (!t.due) return false;
        const d = diffDaysISO(today, t.due);
        if (due === "atrasadas" && d >= 0) return false;
        if (due === "hoje" && d > 0) return false;
        if (due === "semana" && d > 7) return false;
      }
      if (!term) return true;
      return (
        [t.customer, t.reference, t.title].some((v) => v?.toLowerCase().includes(term)) ||
        (digits.length >= 4 && (t.phone ?? "").replace(/\D/g, "").includes(digits))
      );
    });
  }, [all, q, priority, type, group, due, today]);

  const overdue = all.filter((t) => t.due && t.due < today).length;
  const forToday = all.filter((t) => t.due && t.due <= today).length;
  const critical = all.filter((t) => t.priority === "critica" || t.priority === "alta").length;
  const filtersOn = !!q || priority !== "todas" || type !== "todos" || !!group || due !== "todas";
  const clear = () => {
    setQ("");
    setPriority("todas");
    setType("todos");
    setGroup(null);
    setDue("todas");
  };

  return (
    <PageShell
      title="Central Comercial"
      description={
        isLoading
          ? "Carregando pendências…"
          : `${all.length} pendência(s) · ${forToday} para hoje · ${overdue} atrasada(s) · ${critical} de prioridade alta`
      }
      actions={
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar pendências">
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      }
    >
      {/* Resumo por grupo: clicar filtra a lista */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setDue(due === "hoje" ? "todas" : "hoje")}
          className={cn(
            "rounded-2xl border bg-white p-4 text-left transition-colors hover:border-neutral-300",
            due === "hoje" ? "border-primary ring-1 ring-primary" : "border-neutral-200",
          )}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-primary" /> Para hoje
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{isLoading ? "…" : forToday}</div>
          <div className={cn("text-xs", overdue ? "font-semibold text-red-700" : "text-muted-foreground")}>
            {overdue ? `${overdue} atrasada(s)` : "Nada atrasado"}
          </div>
        </button>
        {GROUPS.map((g) => {
          const items = all.filter((t) => (g.types as readonly string[]).includes(t.type));
          const urgent = items.filter((t) => t.priority === "critica" || t.priority === "alta").length;
          const active = group === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(active ? null : g.key)}
              className={cn(
                "rounded-2xl border bg-white p-4 text-left transition-colors hover:border-neutral-300",
                active ? "border-primary ring-1 ring-primary" : "border-neutral-200",
              )}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <g.icon className="h-4 w-4 text-primary" /> {g.label}
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{isLoading ? "…" : items.length}</div>
              <div className={cn("text-xs", urgent ? "font-semibold text-orange-700" : "text-muted-foreground")}>
                {urgent ? `${urgent} urgente(s)` : "Sem urgência"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cliente, telefone ou nº"
            className="pl-9"
            aria-label="Buscar pendências"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="lg:w-40" aria-label="Prioridade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda prioridade</SelectItem>
              {(Object.keys(PRIORITY) as CommercialPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="lg:w-52" aria-label="Tipo de pendência">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {(Object.keys(TYPE_LABEL) as CommercialTaskType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={due} onValueChange={(v) => setDue(v as DueFilter)}>
            <SelectTrigger className="lg:w-44" aria-label="Prazo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Qualquer prazo</SelectItem>
              <SelectItem value="atrasadas">Atrasadas</SelectItem>
              <SelectItem value="hoje">Até hoje</SelectItem>
              <SelectItem value="semana">Próximos 7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtersOn ? (
          <Button variant="ghost" size="sm" className="gap-1 self-start lg:self-auto" onClick={clear}>
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        ) : null}
      </div>

      {error ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={all.length === 0 ? "Nenhuma pendência comercial agora" : "Nenhuma pendência neste filtro"}
          description={all.length === 0 ? "Orçamentos, pedidos, prazos e mensagens estão em dia." : undefined}
          action={
            filtersOn ? (
              <Button size="sm" variant="outline" onClick={clear}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl border-neutral-200 shadow-none">
          <CardContent className="divide-y p-0">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} today={today} />
            ))}
          </CardContent>
        </Card>
      )}

      {data && data.prospectsHidden > 0 && (group === null || group === "prospeccao") ? (
        <p className="text-xs text-muted-foreground">
          Mais {data.prospectsHidden} academia(s) com contato iniciado há 3+ dias.{" "}
          <Link to="/admin/leads/pipeline" className="underline">
            Ver funil de prospecção
          </Link>
        </p>
      ) : null}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        As mensagens sugeridas abrem no WhatsApp para você revisar e enviar. Clientes cobrando andamento pelo WhatsApp
        passam a aparecer aqui quando a caixa de entrada do WhatsApp estiver no admin.
      </p>
    </PageShell>
  );
}

function TaskRow({ task: t, today }: { task: CommercialTask; today: string }) {
  const router = useRouter();
  const p = PRIORITY[t.priority];
  const d = dueLabel(t.due, today);
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", p.dot)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{t.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", p.badge)}>{p.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{TYPE_LABEL[t.type]}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            {t.customer ? <span className="font-medium text-foreground">{t.customer}</span> : null}
            {t.phone ? <span className="tabular-nums">{t.phone}</span> : null}
            {t.reference ? <span>{t.reference}</span> : null}
            {t.amount ? <span className="tabular-nums">{formatBRL(t.amount)}</span> : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-primary" />
            <span className="min-w-0 flex-1">{t.next_action}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 pl-5 sm:flex-col sm:items-end sm:pl-0">
        <span className={cn("text-xs", d.tone)}>{d.text}</span>
        <div className="flex gap-1.5">
          {t.chat_id ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-emerald-700"
              title={t.message ?? "Abrir conversa"}
              onClick={() =>
                router.navigate({ to: "/admin/whatsapp", search: { chat: t.chat_id!, ...(t.message ? { texto: t.message } : {}) } })
              }
            >
              <MessageCircle className="h-3.5 w-3.5" /> Responder
            </Button>
          ) : t.phone ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-emerald-700" asChild>
              <a href={whatsappLink(t.phone, t.message ?? undefined)} target="_blank" rel="noreferrer" title={t.message ?? "Abrir conversa"}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="h-8" onClick={() => router.history.push(t.href)}>
            Abrir
          </Button>
        </div>
      </div>
    </div>
  );
}
