import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { BarChart4, PackageSearch, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { AMT_CATALOG } from "@/lib/marketMock";

export const Route = createFileRoute("/_authenticated/market/catalog")({
  head: () => ({ meta: [{ title: "Analytics Catálogo — AMT MarketEngine" }] }),
  component: CatalogPage,
});

const LINE_COLORS: Record<string, string> = {
  Training: "hsl(210 90% 55%)",
  Pro: "hsl(35 92% 55%)",
  Premium: "hsl(0 84% 60%)",
  Especial: "hsl(160 70% 45%)",
};

function CatalogPage() {
  const topSearched = [...AMT_CATALOG].sort((a, b) => b.searches30d - a.searches30d).slice(0, 8);
  const lowStock = AMT_CATALOG.filter((p) => p.stock < 25);
  const byLine = ["Training", "Pro", "Premium", "Especial"].map((line) => ({
    name: line,
    value: AMT_CATALOG.filter((p) => p.line === line).reduce((a, p) => a + p.searches30d, 0),
  }));
  const totalSearches = AMT_CATALOG.reduce((a, p) => a + p.searches30d, 0);
  const totalStock = AMT_CATALOG.reduce((a, p) => a + p.stock, 0);

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Analytics do Catálogo AMT"
        description="Kimonos Trançados, Faixas BJJ/Judô (Training/Pro/Premium) e Patches/Backnumbers."
        actions={<Badge variant="secondary" className="gap-1"><BarChart4 className="h-3 w-3" /> 30 dias</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Buscas no catálogo (30d)" value={totalSearches.toLocaleString("pt-BR")} icon={PackageSearch} delta={9.3} />
        <StatCard label="SKUs monitorados" value={String(AMT_CATALOG.length)} icon={BarChart4} />
        <StatCard label="Alertas de estoque baixo" value={String(lowStock.length)} icon={AlertTriangle} delta={-2} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Produtos mais buscados" className="lg:col-span-2">
          <div className="h-[320px] w-full">
            <ResponsiveContainer>
              <BarChart data={topSearched} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={10} width={220} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="searches30d" radius={[0, 4, 4, 0]}>
                  {topSearched.map((p) => (
                    <Cell key={p.id} fill={LINE_COLORS[p.line]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Buscas por linha" delay={0.1}>
          <div className="h-[320px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byLine} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {byLine.map((l) => <Cell key={l.name} fill={LINE_COLORS[l.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {byLine.map((l) => (
              <div key={l.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: LINE_COLORS[l.name] }} />
                <span className="text-muted-foreground">{l.name}</span>
                <span className="ml-auto font-medium">{l.value.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title={`Controle de estoque simulado — ${totalStock.toLocaleString("pt-BR")} unidades`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AMT_CATALOG.map((p, i) => {
              const pct = Math.min(100, (p.stock / 300) * 100);
              const low = p.stock < 25;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-md border bg-card p-3"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium leading-tight">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.category} · Linha {p.line}</div>
                    </div>
                    {low && <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500">Baixo</Badge>}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${low ? "bg-red-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{p.stock} un. em estoque</span>
                    <span>{p.searches30d.toLocaleString("pt-BR")} buscas</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
