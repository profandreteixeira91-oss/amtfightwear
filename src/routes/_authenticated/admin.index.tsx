import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Store,
  Building2,
  Wallet,
  ShoppingCart,
  Users,
  Rocket,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

type Kpi = {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "red" | "neutral";
};

const KPIS: Kpi[] = [
  { label: "Receita loja (30d)", value: "—", hint: "Fight Wear", icon: ShoppingCart, tone: "red" },
  { label: "MRR Dojo Manager", value: "—", hint: "SaaS", icon: Wallet, tone: "red" },
  { label: "Dojos ativos", value: "—", hint: "Tenants", icon: Building2, tone: "neutral" },
  { label: "Clientes loja", value: "—", hint: "Últimos 30d", icon: Users, tone: "neutral" },
];

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
          Painel unificado para operar a <span className="font-medium text-neutral-800">AMT Fight Wear</span>{" "}
          e a <span className="font-medium text-neutral-800">AMT Dojo Manager</span>. Métricas,
          módulos e ferramentas administrativas em um único ponto.
        </p>
      </header>

      {/* KPIs */}
      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div
                className={
                  k.tone === "red"
                    ? "grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600"
                    : "grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-600"
                }
              >
                <k.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                {k.hint}
              </span>
            </div>
            <div className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">{k.value}</div>
            <div className="mt-1 text-xs text-neutral-500">{k.label}</div>
          </div>
        ))}
      </section>

      {/* Módulos */}
      <section aria-label="Módulos do ecossistema" className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Módulos</h2>
          <span className="text-xs text-neutral-500">Selecione um universo para operar</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              to={m.href}
              preload="intent"
              className="group block"
            >
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

      <footer className="rounded-2xl border border-dashed border-neutral-200 bg-white/60 p-5 text-xs text-neutral-500">
        <span className="font-semibold text-neutral-700">Próximas fases: </span>
        agregação de KPIs em tempo real (receita, MRR, dojos ativos, churn) e
        painel de atividade recente do ecossistema.
      </footer>
    </div>
  );
}
