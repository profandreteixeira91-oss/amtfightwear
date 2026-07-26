import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Library, FileText, ListChecks, FolderTree,
  Dumbbell, History, Settings as SettingsIcon, ClipboardCheck, Flame,
} from "lucide-react";

export const Route = createFileRoute("/dojo/app/evaluations")({
  head: () => ({
    meta: [
      { title: "Avaliações — AMT Dojo Manager" },
      { name: "description", content: "Painel de avaliações: modelos, sessões e histórico de desempenho dos alunos." },
      { property: "og:title", content: "Avaliações — AMT Dojo Manager" },
      { property: "og:description", content: "Gerencie modelos, sessões e histórico de avaliações com padrão premium." },
    ],
  }),
  component: EvaluationsLayout,
});

const NAV = [
  { to: "/dojo/app/evaluations", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dojo/app/evaluations/library", label: "Biblioteca", icon: Library },
  { to: "/dojo/app/evaluations/templates", label: "Modelos", icon: FileText },
  { to: "/dojo/app/evaluations/sessions", label: "Avaliações", icon: ListChecks },
  { to: "/dojo/app/evaluations/categories", label: "Categorias", icon: FolderTree },
  { to: "/dojo/app/evaluations/techniques", label: "Técnicas", icon: Dumbbell },
  { to: "/dojo/app/evaluations/history", label: "Histórico", icon: History },
  { to: "/dojo/app/evaluations/settings", label: "Configurações", icon: SettingsIcon },
];

function EvaluationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 text-white shadow-[0_30px_80px_-40px_rgba(220,38,38,0.65)]">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-600/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 top-8 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.06),transparent_45%)]" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white shadow-[0_10px_25px_-10px_rgba(220,38,38,0.9)] ring-1 ring-white/20">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-200 backdrop-blur">
                <Flame className="h-3 w-3" /> Avaliações
              </div>
              <h1 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl">
                Cada aluno, um diagnóstico afiado.
              </h1>
              <p className="mt-1 max-w-xl text-sm text-neutral-300">
                Monte modelos, aplique sessões e acompanhe o progresso técnico com precisão cirúrgica.
              </p>
            </div>
          </div>

          {/* Nav tabs */}
          <nav aria-label="Seções" className="-mx-1 flex flex-wrap gap-1.5">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] ring-1 ring-white/20"
                      : "border border-white/15 bg-white/5 text-neutral-200 backdrop-blur hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <Outlet />
    </div>
  );
}
