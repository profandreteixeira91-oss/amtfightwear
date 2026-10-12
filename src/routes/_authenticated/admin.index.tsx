import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_REFRESH_MS = 15_000;
import { useServerFn } from "@tanstack/react-start";
import {
  Store,
  Building2,
  Wallet,
  ShoppingCart,
  Users,
  Rocket,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
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
  Command,
  Zap,
} from "lucide-react";
import { adminGetDashboard } from "@/lib/store/dashboard.functions";
import { adminListDojoAccounts } from "@/lib/store/dojo-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Central AMT — Ecossistema" },
      {
        name: "description",
        content:
          "Central administrativa unificada do ecossistema AMT: Fight Wear, Dojo Manager e Growth em um único painel premium.",
      },
    ],
  }),
  component: AdminOverview,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("pt-BR").format(n || 0);

/* ------------------------- Shortcut data ------------------------- */

type Shortcut = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const QUICK_ACTIONS: Shortcut[] = [
  { title: "Novo pedido", href: "/admin/pedidos", icon: ShoppingCart },
  { title: "Adicionar produto", href: "/admin/produtos", icon: Package },
  { title: "Novo lead", href: "/admin/leads", icon: Target },
  { title: "Campanha", href: "/admin/anuncios/campanhas", icon: Megaphone },
  { title: "SaaS · Dojos", href: "/admin/dojo", icon: Building2 },
];

type UniverseGroup = {
  label: string;
  eyebrow: string;
  color: "red" | "slate" | "amber";
  icon: React.ComponentType<{ className?: string }>;
  primary: { title: string; href: string; description: string };
  items: Shortcut[];
};

const UNIVERSES: UniverseGroup[] = [
  {
    label: "AMT Fight Wear",
    eyebrow: "E-commerce",
    color: "red",
    icon: Store,
    primary: {
      title: "Painel da Loja",
      href: "/admin/loja",
      description: "Vendas, atacado, frete, chat e visitantes em tempo real.",
    },
    items: [
      { title: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart },
      { title: "Produtos", href: "/admin/produtos", icon: Package },
      { title: "Clientes", href: "/admin/clientes", icon: Users },
      { title: "Atacado", href: "/admin/atacado", icon: ShoppingBag },
      { title: "Envio", href: "/admin/envio", icon: Truck },
      { title: "Atendimento", href: "/admin/atendimento", icon: MessageCircle },
    ],
  },
  {
    label: "AMT Dojo Manager",
    eyebrow: "SaaS · Visão administrativa",
    color: "slate",
    icon: Building2,
    primary: {
      title: "Painel SaaS do Dojo Manager",
      href: "/admin/dojo",
      description:
        "Métricas cross-tenant: dojos cadastrados, assinaturas, MRR e tráfego da landing. Sem acesso aos dados operacionais de cada academia.",
    },
    items: [
      { title: "Contas & Assinaturas", href: "/admin/dojo", icon: Building2 },
      { title: "Suporte SaaS", href: "/admin/saas/suporte", icon: MessageCircle },
      { title: "Landing /dojo", href: "/dojo", icon: Rocket },
    ],
  },
  {
    label: "Growth Engine",
    eyebrow: "Comercial",
    color: "amber",
    icon: Rocket,
    primary: {
      title: "Inteligência",
      href: "/growth/intelligence",
      description: "CRM, leads, Instagram, anúncios e insights com IA generativa.",
    },
    items: [
      { title: "Leads", href: "/admin/leads", icon: Target },
      { title: "Instagram", href: "/admin/instagram", icon: Instagram },
      { title: "Campanhas", href: "/admin/anuncios/campanhas", icon: Megaphone },
      { title: "CRM", href: "/growth/crm", icon: Users },
      { title: "KPIs", href: "/growth/kpis", icon: TrendingUp },
      { title: "Mercado", href: "/growth/market", icon: Sparkles },
    ],
  },
];

const SYSTEM_LINKS: Shortcut[] = [
  { title: "Usuários", href: "/users", icon: UserCog },
  { title: "Logs", href: "/logs", icon: ShieldCheck },
  { title: "Configurações", href: "/settings", icon: Settings },
];

/* ------------------------- Component ------------------------- */

function AdminOverview() {
  const getDashboard = useServerFn(adminGetDashboard);
  const listDojos = useServerFn(adminListDojoAccounts);

  const qc = useQueryClient();

  const dashboard = useQuery({
    queryKey: ["admin", "central", "dashboard", "30d"],
    queryFn: () => getDashboard({ data: { range: "30d" } }),
    refetchInterval: ADMIN_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  const dojos = useQuery({
    queryKey: ["admin", "central", "dojos"],
    queryFn: () => listDojos(),
    refetchInterval: ADMIN_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  // Atualização instantânea: novos cadastros/assinaturas de dojo recarregam os cards.
  useEffect(() => {
    const refreshDojos = () => qc.invalidateQueries({ queryKey: ["admin", "central", "dojos"] });
    const ch = supabase
      .channel("admin-central-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_subscriptions" }, refreshDojos)
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_academy_profile" }, refreshDojos)
      .on("postgres_changes", { event: "*", schema: "public", table: "dojo_users" }, refreshDojos)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const loading = dashboard.isLoading || dojos.isLoading;
  const err = dashboard.error || dojos.error;

  // Fight Wear metrics
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

  // Dojo metrics
  const dojoRows = dojos.data ?? [];
  const dojosTotal = dojoRows.length;
  const dojosActive = dojoRows.filter(
    (d) => d.sub_status === "authorized" || d.sub_status === "active",
  ).length;
  const dojosTrial = dojoRows.filter((d) => d.sub_status === "trial").length;
  const mrr = dojoRows
    .filter((d) => d.sub_status === "authorized" || d.sub_status === "active")
    .reduce((a, b) => a + Number(b.sub_plan_amount || 0), 0);
  const totalStudents = dojoRows.reduce((a, b) => a + (b.students_count || 0), 0);
  const onboardingDone = dojoRows.filter((d) => d.onboarding_completed).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-10 p-6 md:p-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-white via-white to-neutral-50 p-8 shadow-sm md:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-red-500/20 to-red-700/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-neutral-900/5 to-transparent blur-3xl"
        />

        <div className="relative flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600 shadow-sm backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
            </span>
            Central AMT · Ecossistema
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-5xl">
              Bem-vindo à Central AMT.
            </h1>
            <p className="text-sm leading-relaxed text-neutral-500 md:text-base">
              Um único painel premium para operar{" "}
              <span className="font-medium text-neutral-800">AMT Fight Wear</span>,{" "}
              <span className="font-medium text-neutral-800">AMT Dojo Manager</span> e{" "}
              <span className="font-medium text-neutral-800">Growth Engine</span>. Atalhos rápidos,
              métricas ao vivo e busca global em um clique.
            </p>
          </div>

          {/* Quick actions */}
          <div className="relative flex flex-wrap gap-2 pt-2">
            {QUICK_ACTIONS.map((q) => (
              <Link
                key={q.href + q.title}
                to={q.href}
                preload="intent"
                className="group inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-white hover:text-red-700 hover:shadow-md"
              >
                <q.icon className="h-3.5 w-3.5 text-neutral-500 transition-colors group-hover:text-red-600" />
                {q.title}
              </Link>
            ))}
            <div className="ml-auto hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/60 px-3 py-2 text-xs text-neutral-500 shadow-sm backdrop-blur md:inline-flex">
              <Zap className="h-3.5 w-3.5 text-red-600" />
              Busca global
              <kbd className="inline-flex items-center gap-0.5 rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-[10px]">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>
      </section>

      {err ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>
            <div className="font-semibold">Não foi possível carregar as métricas.</div>
            <div className="text-xs text-red-600">{(err as Error).message}</div>
          </div>
        </div>
      ) : null}

      {/* KPIs unificados */}
      <section className="space-y-4">
        <SectionHeader
          title="Panorama em tempo real"
          hint="Últimos 30 dias · atualizado a cada minuto"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            tone="red"
            icon={ShoppingCart}
            hint="Loja · Todos os pedidos"
            value={loading ? "—" : brl(allOrdersValue)}
            label={`${num(allOrdersCount)} pedidos · ${num(pendingCount)} com pagamento pendente`}
          />
          <KpiCard
            tone={todayGrowth >= 0 ? "emerald" : "neutral"}
            icon={todayGrowth >= 0 ? TrendingUp : TrendingDown}
            hint="Hoje"
            value={loading ? "—" : brl(todayRevenue)}
            label={
              todayGrowth === 0
                ? "sem base de comparação"
                : `${todayGrowth >= 0 ? "+" : ""}${todayGrowth.toFixed(0)}% vs ontem`
            }
          />
          <KpiCard
            tone="red"
            icon={Wallet}
            hint="Dojo Manager · MRR"
            value={loading ? "—" : brl(mrr)}
            label={`${dojosActive} assinaturas · ${dojosTrial} em trial`}
          />
          <KpiCard
            tone="neutral"
            icon={Activity}
            hint="Ao vivo"
            value={loading ? "—" : num(liveActive)}
            label="visitantes agora na loja"
          />
        </div>
        {/* Pedidos por setor — inclui pagamentos pendentes */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Pedidos por setor
            </div>
            <div className="min-w-0 text-[11px] font-medium text-amber-700">
              {loading ? "—" : `${num(pendingCount)} pendentes · ${brl(pendingValue)}`}
            </div>
          </div>
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl bg-neutral-100" />
          ) : sectors.length === 0 ? (
            <div className="text-sm text-neutral-500">Nenhum pedido no período.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectors.map((s) => (
                <div key={s.sector} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                  <div className="text-sm font-semibold text-neutral-900">{s.sector}</div>
                  <div className="mt-1 text-lg font-bold text-neutral-900">{brl(s.value)}</div>
                  <div className="text-[11px] text-neutral-500">
                    {num(s.count)} pedidos
                    {s.pending > 0 ? (
                      <span className="ml-1 text-amber-700">
                        · {num(s.pending)} pendentes ({brl(s.pending_value)})
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MiniStat label="Receita paga (Loja)" value={brl(netRevenue)} hint={`${num(paidOrders)} pedidos pagos`} />
          <MiniStat label="Clientes (Loja)" value={num(customersTotal)} hint={`+${num(newCustomers)} novos`} />
          <MiniStat label="Dojos totais" value={num(dojosTotal)} hint={`${dojosActive} ativos`} />
          <MiniStat label="Alunos no ecossistema" value={num(totalStudents)} hint="somando todos os dojos" />
          <MiniStat label="Onboarding" value={`${onboardingDone}/${dojosTotal || 0}`} hint="dojos configurados" />
        </div>
      </section>

      {/* Universos com atalhos */}
      <section className="space-y-4">
        <SectionHeader title="Universos" hint="Selecione um ecossistema para operar" />
        <div className="grid gap-5 lg:grid-cols-3">
          {UNIVERSES.map((u) => (
            <UniverseCard key={u.label} group={u} />
          ))}
        </div>
      </section>

      {/* Insights + últimos dojos */}
      <section className="grid gap-5 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              Insights do período
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              IA · Growth
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-neutral-100" />
              ))}
            </div>
          ) : dashboard.data?.insights?.length ? (
            <ul className="space-y-3 text-sm text-neutral-700">
              {dashboard.data.insights.map((i, idx) => (
                <li key={idx} className="flex gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-red-700" />
                  <span className="leading-relaxed">{i}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
              Sem sinais relevantes nos últimos 30 dias.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between text-sm font-semibold text-neutral-900">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-600" /> Últimos dojos
            </span>
            <Link to="/admin/saas" className="text-xs font-semibold text-red-600 hover:underline">
              ver todos
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-neutral-100" />
              ))}
            </div>
          ) : dojoRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
              Nenhum dojo cadastrado ainda.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {dojoRows.slice(0, 5).map((d) => (
                <li key={d.owner_id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900">
                      {d.trade_name || d.legal_name || d.full_name || d.email || "—"}
                    </div>
                    <div className="truncate text-xs text-neutral-500">
                      {d.city && d.state ? `${d.city}/${d.state} · ` : ""}
                      {d.students_count} alunos
                    </div>
                  </div>
                  <StatusPill status={d.sub_status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Sistema */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-900">Sistema</div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Administração
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SYSTEM_LINKS.map((s) => (
            <Link
              key={s.href}
              to={s.href}
              preload="intent"
              className="group flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3 text-sm font-medium text-neutral-700 transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-white hover:text-red-700 hover:shadow-sm"
            >
              <span className="flex items-center gap-2.5">
                <s.icon className="h-4 w-4 text-neutral-500 group-hover:text-red-600" />
                {s.title}
              </span>
              <ArrowUpRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-red-600" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------- Sub-components ------------------------- */

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">{title}</h2>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {hint}
      </span>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  hint,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "red" | "neutral" | "emerald";
  hint: string;
  value: string;
  label: string;
}) {
  const toneClass =
    tone === "red"
      ? "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-red-200/60"
      : tone === "emerald"
        ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-200/60"
        : "bg-neutral-900 text-white shadow-neutral-300/60";
  return (
    <div className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="min-w-0 text-right text-[10px] font-semibold uppercase leading-tight tracking-widest text-neutral-400">
          {hint}
        </span>
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">{value}</div>
      <div className="mt-1 text-xs leading-relaxed text-neutral-500">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl border border-neutral-200 bg-white/70 p-4 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        {label}
      </div>
      <div className="mt-1.5 text-xl font-bold tracking-tight text-neutral-900">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}

function UniverseCard({ group }: { group: UniverseGroup }) {
  const accent =
    group.color === "red"
      ? {
          bg: "from-red-500 to-red-700",
          soft: "bg-red-50 text-red-700 border-red-200",
          text: "text-red-600",
          hover: "hover:border-red-200",
        }
      : group.color === "amber"
        ? {
            bg: "from-amber-500 to-orange-600",
            soft: "bg-amber-50 text-amber-700 border-amber-200",
            text: "text-amber-600",
            hover: "hover:border-amber-200",
          }
        : {
            bg: "from-neutral-800 to-neutral-950",
            soft: "bg-neutral-100 text-neutral-700 border-neutral-200",
            text: "text-neutral-800",
            hover: "hover:border-neutral-300",
          };

  const Icon = group.icon;

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${accent.hover}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${accent.bg} opacity-10 blur-2xl`}
      />
      <div className="relative flex items-start justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent.bg} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-neutral-900">
              {group.label}
            </div>
            <span
              className={`mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${accent.soft}`}
            >
              {group.eyebrow}
            </span>
          </div>
        </div>
      </div>

      <div className="relative px-5">
        <Link
          to={group.primary.href}
          preload="intent"
          className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 transition-colors hover:bg-white"
        >
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${accent.text}`}>{group.primary.title}</div>
            <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
              {group.primary.description}
            </div>
          </div>
          <ArrowRight className={`h-4 w-4 shrink-0 ${accent.text} transition-transform group-hover:translate-x-0.5`} />
        </Link>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-1.5 p-5 pt-0">
        {group.items.map((it) => (
          <Link
            key={it.href + it.title}
            to={it.href}
            preload="intent"
            className="flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-xs font-medium text-neutral-600 transition-all hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <it.icon className="h-3.5 w-3.5 text-neutral-400" />
            <span className="truncate">{it.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    authorized: { label: "Ativo", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    active: { label: "Ativo", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    trial: { label: "Trial", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    pending: { label: "Pendente", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    paused: { label: "Pausado", cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
    cancelled: { label: "Cancelado", cls: "bg-red-50 text-red-700 border-red-200" },
    none: { label: "Sem plano", cls: "bg-neutral-100 text-neutral-500 border-neutral-200" },
  };
  const s = map[status ?? "none"] ?? map.none;
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
