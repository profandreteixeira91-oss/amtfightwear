import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Settings, TrendingUp, DollarSign, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/produtos/faixa-calc")({
  component: CalculatorV2,
});

function CalculatorV2() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <PageShell
      title="Formação de Preço — AMT Fight Wear"
      description="Ferramenta completa para formação de preço baseada em custos reais e margens operacionais."
    >
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["overview", "composition", "variables", "fixed", "pricing", "simulations"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
              activeTab === tab 
                ? "bg-primary text-white" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visão Geral — Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">O módulo está em processo de refatoração para a versão 2.0 premium.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Faturamento Estimado" value="R$ 0,00" icon={<DollarSign />} />
              <MetricCard label="Custo Médio" value="R$ 0,00" icon={<Package />} />
              <MetricCard label="Margem Líquida" value="0%" icon={<TrendingUp />} />
              <MetricCard label="Ponto de Equilíbrio" value="R$ 0,00" icon={<Settings />} />
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for tabs content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Conteúdo da aba: {activeTab}</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
            <span className="text-muted-foreground">Em construção: {activeTab}</span>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 border rounded-xl bg-card">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
