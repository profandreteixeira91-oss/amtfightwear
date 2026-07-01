import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Rocket, TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { REVENUE_SERIES, FUNNEL } from "@/lib/marketMock";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/overview")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Painel Geral" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  const revenue = REVENUE_SERIES.reduce((a, r) => a + r.revenue, 0);
  const ads = REVENUE_SERIES.reduce((a, r) => a + r.ads, 0);
  const roas = revenue / ads;

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Painel Geral"
        description="Motor de vendas AMT Fight Wear para o mercado de Jiu-Jitsu e Judô."
        actions={<Badge variant="secondary" className="gap-1"><Rocket className="h-3 w-3" /> Ao vivo</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receita 30d" value={brl(revenue)} icon={DollarSign} delta={12.4} />
        <StatCard label="Investimento em Ads" value={brl(ads)} icon={Target} delta={-3.1} />
        <StatCard label="ROAS" value={`${roas.toFixed(2)}x`} icon={TrendingUp} delta={8.7} />
        <StatCard label="Academias no funil" value="342" icon={Users} delta={22.3} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Receita vs. Tráfego Pago (simulado)" className="lg:col-span-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <AreaChart data={REVENUE_SERIES}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" />
                <Area type="monotone" dataKey="ads" stroke="hsl(var(--muted-foreground))" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Funil Alunos & Academias" delay={0.1}>
          <div className="space-y-3">
            {FUNNEL.map((f, i) => {
              const pct = (f.value / FUNNEL[0].value) * 100;
              return (
                <motion.div
                  key={f.stage}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{f.stage}</span>
                    <span className="font-semibold">{f.value.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Distribuição de investimento diário em Ads">
          <div className="h-[220px] w-full">
            <ResponsiveContainer>
              <BarChart data={REVENUE_SERIES}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="ads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
