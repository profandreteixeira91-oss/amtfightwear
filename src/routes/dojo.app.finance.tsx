import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Tags,
  FileBarChart,
  RefreshCw,
  Settings2,
  Landmark,
} from "lucide-react";
import { FinanceDashboard } from "@/components/dojo/finance/Dashboard";
import { FinanceReceivables } from "@/components/dojo/finance/Receivables";
import { FinancePayables } from "@/components/dojo/finance/Payables";
import { FinanceTuition } from "@/components/dojo/finance/Tuition";
import { FinanceCashflow } from "@/components/dojo/finance/Cashflow";
import {
  FinanceCategories,
  FinanceReconciliation,
  FinanceReports,
  FinanceSettings,
} from "@/components/dojo/finance/Config";
import { PinGate } from "@/components/dojo/PinGate";

export const Route = createFileRoute("/dojo/app/finance")({
  head: () => ({ meta: [{ title: "Financeiro — AMT Dojo Manager" }] }),
  component: () => (
    <PinGate moduleName="Financeiro">
      <FinancePage />
    </PinGate>
  ),
});

type SectionId =
  | "dashboard"
  | "tuition"
  | "charges"
  | "cashflow"
  | "receivables"
  | "payables"
  | "categories"
  | "reports"
  | "reconciliation"
  | "settings";

type Section = {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
};

const sections: Section[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Visão geral" },

  { id: "receivables", label: "Contas a receber", icon: ArrowDownRight, group: "Movimentações" },
  { id: "payables", label: "Contas a pagar", icon: ArrowUpRight, group: "Movimentações" },
  { id: "tuition", label: "Mensalidades", icon: Users, group: "Movimentações" },
  { id: "charges", label: "Cobranças", icon: Receipt, group: "Movimentações" },

  { id: "cashflow", label: "Fluxo de caixa", icon: Wallet, group: "Consolidados" },

  { id: "categories", label: "Categorias e centros", icon: Tags, group: "Cadastros" },
  { id: "reports", label: "Relatórios", icon: FileBarChart, group: "Cadastros" },
  { id: "reconciliation", label: "Conciliação", icon: RefreshCw, group: "Cadastros" },
  { id: "settings", label: "Configurações", icon: Settings2, group: "Cadastros" },
];

const groupOrder = ["Visão geral", "Movimentações", "Consolidados", "Cadastros"];

function FinancePage() {
  const [active, setActive] = useState<SectionId>("dashboard");

  const renderSection = () => {
    switch (active) {
      case "dashboard":
        return <FinanceDashboard />;
      case "charges":
      case "receivables":
        return <FinanceReceivables />;
      case "payables":
        return <FinancePayables />;
      case "tuition":
        return <FinanceTuition />;
      case "cashflow":
        return <FinanceCashflow />;
      case "categories":
        return <FinanceCategories />;
      case "reports":
        return <FinanceReports />;
      case "reconciliation":
        return <FinanceReconciliation />;
      case "settings":
        return <FinanceSettings />;
    }
  };

  const current = sections.find((s) => s.id === active)!;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 min-w-0 overflow-x-hidden md:gap-7">
      {/* ============ HERO — RUBY NOIR ============ */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950/50 p-5 text-white shadow-[0_20px_60px_-30px_rgba(220,38,38,0.55)] md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white ring-1 ring-white/20 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">Financeiro</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-300">
              Motor financeiro completo do dojo: fluxo de caixa, cobranças, mensalidades, relatórios e conciliação.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-navegação horizontal — Ruby ribbon */}
      <div className="overflow-x-auto rounded-xl border border-red-500/15 bg-neutral-950/60 p-1 shadow-[0_10px_30px_-20px_rgba(220,38,38,0.6)]">
        <div className="flex w-max min-w-full flex-nowrap gap-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)]"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="min-w-0">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
            {current.group}
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight md:text-3xl">{current.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {current.group === "Visão geral"
              ? "Indicadores executivos em tempo real"
              : current.group === "Movimentações"
              ? "Lançamentos, cobranças e recebimentos"
              : current.group === "Consolidados"
              ? "Análises consolidadas e projeções"
              : "Cadastros, relatórios e configurações"}
          </p>
        </div>
        {renderSection()}
      </div>
    </div>
  );
}
