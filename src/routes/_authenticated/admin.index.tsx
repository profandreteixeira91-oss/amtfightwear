import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Store,
  Building2,
  Wallet,
  ShoppingCart,
  Users,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Instagram,
  Megaphone,
  Package,
  Truck,
  MessageCircle,
  ShoppingBag,
  UserCog,
  ShieldCheck,
  Settings,
  FileText,
  Factory,
  Clock,
  LifeBuoy,
  CheckCircle2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { adminGetDashboard } from "@/lib/store/dashboard.functions";
import { adminListDojoAccounts } from "@/lib/store/dojo-admin.functions";
import { adminGetOpsInbox } from "@/lib/store/ops-inbox.functions";
import { PageShell } from "@/components/common/PageShell";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Pendências mudam rápido; o panorama de 30 dias é mais pesado e muda devagar. */
const INBOX_REFRESH_MS = 30_000;
const DASHBOARD_REFRESH_MS = 60_000;

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Central AMT — Ecossistema" },
      {
        name: "description",
        content:
          "Central administrativa unificada do ecossistema AMT: pendências do dia, Fight Wear, Dojo Manager e Growth em um único painel.",
      },
    ],
  }),
  component: AdminOverview,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("pt-BR").format(n || 0);

/* ------------------------- Atalhos ------------------------- */

type Shortcut = { title: string; href: string; icon: LucideIcon };

/** Acesso rápido por ecossistema — sempre para as rotas da Central (sem redirects legados). */
const SHORTCUT_GROUPS: Array<{ label: string; items: Shortcut[] }> = [
  {
    label: "AMT Fight Wear",
    items: [
      { title: "Gestão da Loja", href: "/admin/loja", icon: Store },
      { title: "Produtos", href: "/admin/produtos", icon: Package },
      { title: "Clientes", href: "/admin/clientes", icon: Users },
      { title: "Atacado", href: "/admin/atacado", icon: ShoppingBag },
      { title: "Logística / Envio", href: "/admin/envio", icon: Truck },
    ],
  },
  {
    label: "Dojo Manager",
    items: [
      { title: "Assinaturas & Faturas", href: "/admin/dojo", icon: Building2 },
      { title: "Donos de Dojo", href: "/admin/clientes-growth", icon: Users },
      { title: "Suporte", href: "/admin/saas/suporte", icon: LifeBuoy },
    ],
  },
  {
    label: "Growth",
    items: [
      { title: "Leads", href: "/admin/leads", icon: Target },
      { title: "CRM Unificado", href: "/admin/crm", icon: Users },
      { title: "Instagram", href: "/admin/instagram", icon: Instagram },
      { title: "Anúncios", href: "/admin/anuncios", icon: Megaphone },
      { title: "Inteligência", href: "/admin/marketing/inteligencia", icon: Sparkles },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Usuários / Equipe", href: "/admin/usuarios", icon: UserCog },
      { title: "Logs & Segurança", href: "/admin/logs", icon: ShieldCheck },
      { title: "Ajustes do Sistema", href: "/admin/configuracoes", icon: Settings },
    ],
  },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/* ------------------------- Component ------------------------- */

function AdminOverview() {
  const getDashboard = useServerFn(adminGetDashboard);
  const listDojos = useServerFn(adminListDojoAccounts);
  const getInbox = useServerFn(adminGetOpsInbox);
  const { user } = useAuth();
  const qc = useQueryClient();

  const inbox = useQuery({
    queryKey: ["admin", "central", "ops-inbox"],
    queryFn: () => getInbox(),
    refetchInterval: INBOX_REFRESH_MS,
  });

  const dashboard = useQuery({
    queryKey: ["admin", "central", "dashboard", "30d"],
    queryFn: () => getDashboard({ data: { range: "30d" } }),
    refetchInterval: DASHBOARD_REFRESH_MS,
  });

  const dojos = useQuery({
    queryKey: ["admin", "central", "dojos"],
    queryFn: () => listDojos(),
    refetchInterval: DASHBOARD_REFRESH_MS,
  });

  // Atualização instantânea: novos cadastros/assinaturas de dojo recarregam os cards.
  useEffect(() => {
    const refreshDojos = () => qc.invalidateQueries({ queryKey: ["admin", "central", "dojos"] });
    const ch = supabase
      .channel("admin-central-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_subscriptions" },
        refreshDojos,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_academy_profile" },
        refreshDojos,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_users" }, refreshDojos)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const loading = dashboard.isLoading || dojos.isLoading;
  const err = dashboard.error || dojos.error;

  // Fight Wear
  const netRevenue = dashboard.data?.finance.net_revenue ?? 0;
  const paidOrders = dashboard.data?.finance.paid_orders ?? 0;
  const ordersAll = dashboard.data?.orders_all;
  const allOrdersCount = ordersAll?.count ?? 0;
  const allOrdersValue = ordersAll?.value ?? 0;
  const pendingCount = ordersAll?.pending_count ?? 0;
  const pendingValue = ordersAll?.pending_value ?? 0;
  const sectors = ordersAll?.by_sector ?? [];
  const customersTotal = dashboard.data?.customers.total ?? 0;
  const newCustomers = dashboard.data?.customers.new ?? 0;
  const liveActive = dashboard.data?.live.active ?? 0;
  const todayGrowth = dashboard.data?.today.growth ?? 0;
  const todayRevenue = dashboard.data?.today.revenue ?? 0;

  // Dojo Manager
  const dojoRows = dojos.data ?? [];
  const dojosTotal = dojoRows.length;
  const isActiveSub = (s: string | null) => s === "authorized" || s === "active";
  const dojosActive = dojoRows.filter((d) => isActiveSub(d.sub_status)).length;
  const dojosTrial = dojoRows.filter((d) => d.sub_status === "trial").length;
  const mrr = dojoRows
    .filter((d) => isActiveSub(d.sub_status))
    .reduce((a, b) => a + Number(b.sub_plan_amount || 0), 0);
  const totalStudents = dojoRows.reduce((a, b) => a + (b.students_count || 0), 0);
  const onboardingDone = dojoRows.filter((d) => d.onboarding_completed).length;

  const firstName =
    ((user?.user_metadata?.full_name as string | undefined) ?? "").trim().split(/\s+/)[0] || null;

  const i = inbox.data;
  const actions: ActionItem[] = i
    ? [
        {
          label: "Pedidos a preparar/enviar",
          count: i.orders.toShip,
          hint: "pagos, aguardando separação ou etiqueta",
          href: "/admin/pedidos",
          search: { tab: "enviar" },
          icon: Truck,
          tone: "primary",
        },
        {
          label: "Produção atrasada",
          count: i.production.late,
          hint: `${num(i.production.dueToday)} vencem hoje · ${num(i.production.open)} na fila`,
          href: "/admin/producao",
          icon: Factory,
          tone: "danger",
        },
        {
          label: "Aguardando pagamento",
          count: i.orders.pendingPayment,
          hint: "pedidos dos últimos 7 dias",
          href: "/admin/pedidos",
          search: { tab: "pagamento" },
          icon: Clock,
          tone: "warning",
        },
        {
          label: "Orçamentos sem resposta",
          count: i.quotes.sent,
          hint: `${num(i.quotes.approved)} aprovado(s) aguardando pagamento`,
          href: "/admin/orcamentos",
          search: { status: "sent" },
          icon: FileText,
          tone: "warning",
        },
        {
          label: "Atendimento humano",
          count: i.chats.human,
          hint: "conversas aguardando resposta da equipe",
          href: "/admin/atendimento",
          icon: MessageCircle,
          tone: "primary",
        },
        ...(i.support
          ? [
              {
                label: "Suporte Dojo Manager",
                count: i.support.open,
                hint: "chamados abertos",
                href: "/admin/saas/suporte",
                search: { status: "aberto" },
                icon: LifeBuoy,
                tone: "primary",
              } satisfies ActionItem,
            ]
          : []),
      ]
    : [];
  const pendingTotal = actions.reduce((a, x) => a + x.count, 0);

  return (
    <PageShell
      eyebrow="Central AMT"
      title={firstName ? `${greeting()}, ${firstName}` : greeting()}
      description={
        inbox.isLoading
          ? "Verificando o que precisa da sua atenção…"
          : pendingTotal > 0
            ? `${num(pendingTotal)} pendência(s) aguardando ação agora.`
            : "Nenhuma pendência no momento. Tudo em dia."
      }
      actions={
        <Button variant="outline" asChild className="gap-2">
          <Link to="/admin/dashboard">
            <BarChart3 className="h-4 w-4" />
            Analytics Global
          </Link>
        </Button>
      }
    >
      {/* Pendências */}
      <section aria-labelledby="ops-inbox" className="space-y-3">
        <SectionTitle id="ops-inbox" title="Precisa de ação" hint="Atualiza a cada 30 segundos" />
        {inbox.error ? (
          <ErrorState
            title="Não foi possível carregar as pendências"
            message={(inbox.error as Error).message}
            onRetry={() => inbox.refetch()}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inbox.isLoading
              ? Array.from({ length: 6 }).map((_, k) => (
                  <Skeleton key={k} className="h-[104px] rounded-xl" />
                ))
              : actions.map((a) => <ActionCard key={a.label} item={a} />)}
          </div>
        )}
      </section>

      {/* Panorama */}
      <section aria-labelledby="panorama" className="space-y-3">
        <SectionTitle
          id="panorama"
          title="Panorama"
          hint="Últimos 30 dias · atualiza a cada minuto"
        />
        {err ? (
          <ErrorState
            title="Não foi possível carregar as métricas"
            message={(err as Error).message}
            onRetry={() => {
              dashboard.refetch();
              dojos.refetch();
            }}
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            icon={ShoppingCart}
            label="Pedidos da loja"
            loading={loading}
            value={brl(allOrdersValue)}
            hint={`${num(allOrdersCount)} pedidos · ${num(pendingCount)} com pagamento pendente`}
          />
          <StatCard
            index={1}
            icon={todayGrowth >= 0 ? TrendingUp : TrendingDown}
            label="Vendas hoje"
            loading={loading}
            value={brl(todayRevenue)}
            delta={todayGrowth === 0 ? null : todayGrowth}
            hint={todayGrowth === 0 ? "sem base de comparação com ontem" : "vs ontem"}
          />
          <StatCard
            index={2}
            icon={Wallet}
            label="MRR Dojo Manager"
            loading={loading}
            value={brl(mrr)}
            hint={`${dojosActive} assinaturas · ${dojosTrial} em trial`}
          />
          <StatCard
            index={3}
            icon={Activity}
            label="Ao vivo na loja"
            loading={loading}
            value={num(liveActive)}
            hint="visitantes agora"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MiniStat
            loading={loading}
            label="Receita paga (Loja)"
            value={brl(netRevenue)}
            hint={`${num(paidOrders)} pedidos pagos`}
          />
          <MiniStat
            loading={loading}
            label="Clientes (Loja)"
            value={num(customersTotal)}
            hint={`+${num(newCustomers)} novos`}
          />
          <MiniStat
            loading={loading}
            label="Dojos"
            value={num(dojosTotal)}
            hint={`${dojosActive} ativos`}
          />
          <MiniStat
            loading={loading}
            label="Alunos no ecossistema"
            value={num(totalStudents)}
            hint="somando todos os dojos"
          />
          <MiniStat
            loading={loading}
            label="Onboarding"
            value={`${onboardingDone}/${dojosTotal || 0}`}
            hint="dojos configurados"
          />
        </div>
      </section>

      <SectionCard
        title="Pedidos por setor"
        description={loading ? undefined : `${num(pendingCount)} pendentes · ${brl(pendingValue)}`}
      >
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : sectors.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Nenhum pedido no período" className="py-8" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => (
              <div key={s.sector} className="rounded-lg border bg-muted/30 p-3">
                <div className="text-sm font-semibold">{s.sector}</div>
                <div className="mt-1 text-lg font-bold tabular-nums">{brl(s.value)}</div>
                <div className="text-xs text-muted-foreground">
                  {num(s.count)} pedidos
                  {s.pending > 0 ? (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">
                      · {num(s.pending)} pendentes ({brl(s.pending_value)})
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-5">
        <SectionCard
          title="Insights do período"
          description="Sinais automáticos dos últimos 30 dias"
          className="lg:col-span-3"
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : dashboard.data?.insights?.length ? (
            <ul className="space-y-2 text-sm">
              {dashboard.data.insights.map((text, idx) => (
                <li key={idx} className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Sem sinais relevantes nos últimos 30 dias"
              className="py-8"
            />
          )}
        </SectionCard>

        <SectionCard
          title="Últimos dojos"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
              <Link to="/admin/dojo">
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : dojoRows.length === 0 ? (
            <EmptyState icon={Building2} title="Nenhum dojo cadastrado ainda" className="py-8" />
          ) : (
            <ul className="divide-y">
              {dojoRows.slice(0, 5).map((d) => (
                <li key={d.owner_id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {d.trade_name || d.legal_name || d.full_name || d.email || "—"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {d.city && d.state ? `${d.city}/${d.state} · ` : ""}
                      {d.students_count} alunos
                    </div>
                  </div>
                  <StatusPill status={d.sub_status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Acesso rápido" description="Ctrl+K busca qualquer módulo da Central">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUT_GROUPS.map((g) => (
            <div key={g.label} className="min-w-0">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {g.label}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      to={it.href}
                      preload="intent"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <it.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{it.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}

/* ------------------------- Sub-components ------------------------- */

type ActionItem = {
  label: string;
  count: number;
  hint: string;
  href: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  /** Cor quando há pendência; zerado, o card fica neutro com "em dia". */
  tone: "primary" | "warning" | "danger";
};

const TONE: Record<ActionItem["tone"], { icon: string; ring: string }> = {
  primary: { icon: "bg-primary/10 text-primary", ring: "hover:border-primary/40" },
  warning: {
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    ring: "border-amber-500/30 hover:border-amber-500/60",
  },
  danger: {
    icon: "bg-destructive/10 text-destructive",
    ring: "border-destructive/30 hover:border-destructive/60",
  },
};

function ActionCard({ item }: { item: ActionItem }) {
  const Icon = item.icon;
  const idle = item.count === 0;
  const tone = TONE[item.tone];
  return (
    <Link
      to={item.href}
      search={item.search as never}
      preload="intent"
      className={cn(
        "group flex min-w-0 items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        idle ? "hover:border-border" : tone.ring,
      )}
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-lg",
          idle ? "bg-muted text-muted-foreground" : tone.icon,
        )}
      >
        {idle ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold tabular-nums", idle && "text-muted-foreground")}>
            {num(item.count)}
          </span>
          <span className="truncate text-sm font-medium">{item.label}</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{idle ? "Em dia" : item.hint}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function SectionTitle({ id, title, hint }: { id: string; title: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <span className="text-[11px] font-medium text-muted-foreground">{hint}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  loading?: boolean;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <>
          <div className="mt-1.5 text-xl font-bold tracking-tight tabular-nums">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    authorized: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    active: { label: "Ativo", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    trial: { label: "Trial", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
    paused: { label: "Pausado", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
    none: { label: "Sem plano", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status ?? "none"] ?? map.none;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}
