import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Tags,
  FileBarChart,
  RefreshCw,
  Settings2,
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

export const Route = createFileRoute("/dojo/app/finance")({
  head: () => ({ meta: [{ title: "Financeiro — AMT Dojo Manager" }] }),
  component: FinancePage,
});

type SectionId =
  | "dashboard"
  | "revenue"
  | "expenses"
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

  { id: "revenue", label: "Receitas", icon: TrendingUp, group: "Movimentações" },
  { id: "expenses", label: "Despesas", icon: TrendingDown, group: "Movimentações" },
  { id: "tuition", label: "Mensalidades", icon: Users, group: "Movimentações" },
  { id: "charges", label: "Cobranças", icon: Receipt, group: "Movimentações" },

  { id: "cashflow", label: "Fluxo de caixa", icon: Wallet, group: "Consolidados" },
  { id: "receivables", label: "Contas a receber", icon: ArrowDownRight, group: "Consolidados" },
  { id: "payables", label: "Contas a pagar", icon: ArrowUpRight, group: "Consolidados" },

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
      case "revenue":
      case "charges":
      case "receivables":
        return <FinanceReceivables />;
      case "expenses":
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
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Sub-navegação lateral */}
      <aside className="lg:w-60 shrink-0">
        <div className="lg:sticky lg:top-20 rounded-xl border border-[color:var(--dojo-border)] bg-white p-2">
          {/* Mobile: horizontal scroll chips */}
          <div className="flex lg:hidden gap-1 overflow-x-auto pb-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === active;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: grouped list */}
          <div className="hidden lg:block">
            {groupOrder.map((group) => (
              <div key={group} className="mb-3 last:mb-0">
                <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {sections
                    .filter((s) => s.group === group)
                    .map((s) => {
                      const Icon = s.icon;
                      const isActive = s.id === active;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setActive(s.id)}
                          className={cn(
                            "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-foreground/80 hover:bg-muted",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold tracking-tight">{current.label}</h2>
          <p className="text-xs text-muted-foreground">
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
