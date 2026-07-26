import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Store,
  Building2,
  Wallet,
  ShoppingCart,
  Users,
  Rocket,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminGetDashboard } from "@/lib/store/dashboard.functions";
import { adminListDojoAccounts } from "@/lib/store/dojo-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Central AMT — Ecossistema" },
      {
        name: "description",
        content:
          "Central administrativa unificada do ecossistema AMT: Fight Wear e Dojo Manager em um único painel.",
      },
    ],
  }),
  component: AdminOverview,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const num = (n: number) => new Intl.NumberFormat("pt-BR").format(n || 0);

type Module = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
};

const MODULES: Module[] = [
  {
    title: "AMT Fight Wear",
    description:
      "Loja online: dashboard de vendas, produtos, pedidos, clientes, atacado, frete e chat.",
    href: "/store",
    icon: Store,
    badge: "E-commerce",
  },
  {
    title: "AMT Dojo Manager",
    description:
      "Visão SaaS cross-tenant: dojos cadastrados, assinaturas, split AMT Pay e suporte.",
    href: "/store/dojo-manager",
    icon: Building2,
    badge: "SaaS",
  },
  {
    title: "Growth Engine",
    description:
      "Inteligência comercial, CRM, KPIs e o motor de marketing com IA generativa.",
    href: "/growth/intelligence",
    icon: Rocket,
    badge: "Growth",
  },
];

function AdminOverview() {
  const getDashboard = useServerFn(adminGetDashboard);
  const listDojos = useServerFn(adminListDojoAccounts);

  const dashboard = useQuery({
    queryKey: ["admin", "central", "dashboard", "30d"],
    queryFn: () => getDashboard({ data: { range: "30d" } }),
    staleTime: 60_000,
  });

  const dojos = useQuery({
    queryKey: ["admin", "central", "dojos"],
    queryFn: () => listDojos(),
    staleTime: 60_000,
  });

  const loading = dashboard.isLoading || dojos.isLoading;
  const err = dashboard.error || dojos.error;

  // Fight Wear metrics
  const netRevenue = dashboard.data?.finance.net_revenue ?? 0;
  const paidOrders = dashboard.data?.finance.paid_orders ?? 0;
  const customersTotal = dashboard.data?.customers.total ?? 0;
  const newCustomers = dashboard.data?.customers.new ?? 0;
  const liveActive = dashboard.data?.live.active ?? 0;
  const todayGrowth = dashboard.data?.today.growth ?? 0;
  const todayRevenue = dashboard.data?.today.revenue ?? 0;

  // Dojo Manager metrics
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-6 md:p-8">
      {/* Hero */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600 shadow-sm">
          <Sparkles className="h-3 w-3 text-red-600" />
          Central AMT
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
          Ecossistema AMT em um só lugar
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-500 md:text-base">
          Painel unificado para operar a{" "}
          <span className="font-medium text-neutral-800">AMT Fight Wear</span> e a{" "}
          <span className="font-medium text-neutral-800">AMT Dojo Manager</span>. Métricas em
          tempo real e módulos administrativos em um único ponto.
        </p>
      </header>

      {err ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <div>
            <div className="font-semibold">Não foi possível carregar as métricas.</div>
            <div className="text-xs text-red-600">{(err as Error).message}</div>
          </div>
        </div>
      ) : null}

      {/* KPIs — Fight Wear */}
      <section aria-label="Fight Wear" className="space-y-3">
        <SectionTitle
          label="AMT Fight Wear"
          hint="Últimos 30 dias"
          icon={Store}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={ShoppingCart}
            tone="red"
            hint="Receita líquida"
            value={loading ? "—" : brl(netRevenue)}
            label={`${paidOrders} pedidos pagos`}
          />
          <KpiCard
            icon={todayGrowth >= 0 ? TrendingUp : TrendingDown}
            tone={todayGrowth >= 0 ? "red" : "neutral"}
            hint="Hoje"
            value={loading ? "—" : brl(todayRevenue)}
            label={
              todayGrowth === 0
                ? "sem base de comparação"
                : `${todayGrowth >= 0 ? "+" : ""}${todayGrowth.toFixed(0)}% vs ontem`
            }
          />
          <KpiCard
            icon={Users}
            tone="neutral"
            hint="Clientes"
            value={loading ? "—" : num(customersTotal)}
            label={`+${num(newCustomers)} novos no período`}
          />
          <KpiCard
            icon={Activity}
            tone="neutral"
            hint="Ao vivo"
            value={loading ? "—" : num(liveActive)}
            label="visitantes agora"
          />
        </div>
      </section>

      {/* KPIs — Dojo Manager */}
      <section aria-label="Dojo Manager" className="space-y-3">
        <SectionTitle
          label="AMT Dojo Manager"
          hint="Todos os tenants"
          icon={Building2}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Wallet}
            tone="red"
            hint="MRR"
            value={loading ? "—" : brl(mrr)}
            label={`${dojosActive} assinaturas ativas`}
          />
          <KpiCard
            icon={Building2}
            tone="neutral"
            hint="Dojos"
            value={loading ? "—" : num(dojosTotal)}
            label={`${dojosActive} ativos · ${dojosTrial} em trial`}
          />
          <KpiCard
            icon={Users}
            tone="neutral"
            hint="Alunos"
            value={loading ? "—" : num(totalStudents)}
            label="cadastrados no ecossistema"
          />
          <KpiCard
            icon={Sparkles}
            tone="red"
            hint="Onboarding"
            value={
              loading
                ? "—"
                : `${num(dojoRows.filter((d) => d.onboarding_completed).length)}/${num(dojosTotal)}`
            }
            label="completaram configuração"
          />
        </div>
      </section>

      {/* Módulos */}
      <section aria-label="Módulos do ecossistema" className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Módulos</h2>
          <span className="text-xs text-neutral-500">Selecione um universo para operar</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.href} to={m.href} preload="intent" className="group block">
              <Card className="h-full border-neutral-200 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600">
                      <m.icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      {m.badge}
                    </span>
                  </div>
                  <CardTitle className="pt-3 text-base font-semibold text-neutral-900">
                    {m.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-neutral-500">{m.description}</p>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 transition-transform group-hover:translate-x-0.5">
                    Abrir módulo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Insights + últimos dojos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Sparkles className="h-4 w-4 text-red-600" /> Insights do período
          </div>
          {loading ? (
            <div className="text-sm text-neutral-400">Carregando…</div>
          ) : dashboard.data?.insights?.length ? (
            <ul className="space-y-2 text-sm text-neutral-600">
              {dashboard.data.insights.map((i, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-neutral-400">
              Sem sinais relevantes nos últimos 30 dias.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold text-neutral-900">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-600" /> Últimos dojos cadastrados
            </span>
            <Link
              to="/store/dojo-manager"
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              ver todos
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-neutral-400">Carregando…</div>
          ) : dojoRows.length === 0 ? (
            <div className="text-sm text-neutral-400">Nenhum dojo cadastrado ainda.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {dojoRows.slice(0, 5).map((d) => (
                <li key={d.owner_id} className="flex items-center justify-between py-2">
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
    </div>
  );
}

function SectionTitle({
  label,
  hint,
  icon: Icon,
}: {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <Icon className="h-4 w-4 text-red-600" />
        {label}
      </h2>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
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
  tone: "red" | "neutral";
  hint: string;
  value: string;
  label: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className={
            tone === "red"
              ? "grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600"
              : "grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-600"
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          {hint}
        </span>
      </div>
      <div className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
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
