import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart4,
  PackageSearch,
  AlertTriangle,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  CheckCircle2,
  Target,
  Users2,
  GraduationCap,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AMT_CATALOG } from "@/lib/marketMock";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/catalog")({
  head: () => ({ meta: [{ title: "Catálogo Inteligente — AMT MarketEngine" }] }),
  component: CatalogPage,
});

// ---------- Traffic / ROI data ----------
const TRAFFIC_DATA = [
  { day: "Sem 1", metaProf: 4200, metaAlunos: 2800, googleProf: 3100, googleAlunos: 3600 },
  { day: "Sem 2", metaProf: 5100, metaAlunos: 3400, googleProf: 3800, googleAlunos: 4100 },
  { day: "Sem 3", metaProf: 6300, metaAlunos: 3900, googleProf: 4700, googleAlunos: 4800 },
  { day: "Sem 4", metaProf: 7800, metaAlunos: 4600, googleProf: 5600, googleAlunos: 5500 },
  { day: "Sem 5", metaProf: 9200, metaAlunos: 5300, googleProf: 6400, googleAlunos: 6100 },
  { day: "Sem 6", metaProf: 10800, metaAlunos: 6100, googleProf: 7500, googleAlunos: 6800 },
];

const ROI_BY_CAMPAIGN = [
  { name: "Meta — Prof.", spend: 4800, revenue: 22400, roas: 4.67 },
  { name: "Meta — Alunos", spend: 6200, revenue: 19100, roas: 3.08 },
  { name: "Google — Prof.", spend: 3900, revenue: 17800, roas: 4.56 },
  { name: "Google — Alunos", spend: 5100, revenue: 18400, roas: 3.61 },
];

// ---------- Hot products (nicho) ----------
type Trend = "up" | "flat" | "down";
const HOT_PRODUCTS: {
  name: string;
  line: string;
  category: string;
  interest: number;
  trend: Trend;
  delta: number;
  note: string;
}[] = [
  {
    name: "Faixa Premium com Ponteira Autismo",
    line: "Premium",
    category: "Faixas BJJ",
    interest: 96,
    trend: "up",
    delta: 38.4,
    note: "Alta demanda — campanha institucional em abril amplificou buscas.",
  },
  {
    name: "Faixa Premium Bordado Kanji Personalizado",
    line: "Premium",
    category: "Faixas BJJ",
    interest: 92,
    trend: "up",
    delta: 24.1,
    note: "Buscas por 'faixa personalizada nome' cresceram nas academias.",
  },
  {
    name: "Kimono Trançadinho Adulto Branco",
    line: "Pro",
    category: "Kimonos",
    interest: 88,
    trend: "flat",
    delta: 1.2,
    note: "Estável — carro-chefe da linha Pro adulto.",
  },
  {
    name: "Kimono Trançadinho Infantil A2",
    line: "Training",
    category: "Kimonos",
    interest: 84,
    trend: "up",
    delta: 12.8,
    note: "Sazonalidade de matrículas infantis puxando volume.",
  },
  {
    name: "Faixa Judô Training Adulto",
    line: "Training",
    category: "Faixas Judô",
    interest: 79,
    trend: "up",
    delta: 9.4,
    note: "Movimento de graduação em federações regionais.",
  },
  {
    name: "Patches Sublimados AMT (kit 5)",
    line: "Especial",
    category: "Patches",
    interest: 74,
    trend: "flat",
    delta: 0.6,
    note: "Complemento recorrente em pedidos de kimono.",
  },
  {
    name: "Backnumber Personalizado Sublimado",
    line: "Especial",
    category: "Patches",
    interest: 62,
    trend: "down",
    delta: -6.3,
    note: "Queda leve — competições regionais em pausa.",
  },
  {
    name: "Faixa Pro Marrom Bordada",
    line: "Pro",
    category: "Faixas BJJ",
    interest: 58,
    trend: "down",
    delta: -4.8,
    note: "Menor volume — público de nicho graduado.",
  },
];

const TREND_STYLE: Record<Trend, string> = {
  up: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  flat: "text-muted-foreground bg-muted border-border",
  down: "text-red-500 bg-red-500/10 border-red-500/30",
};
const TREND_ICON = { up: TrendingUp, flat: Minus, down: TrendingDown };

// ---------- Margin simulator ----------
const BASE_PRICE = 189; // preço médio de faixa AMT no varejo
const BASE_COST = 74; // custo médio de produção

const TIERS = [
  { qty: 20, defaultDisc: 8 },
  { qty: 50, defaultDisc: 15 },
  { qty: 100, defaultDisc: 22 },
];

function CatalogPage() {
  const [discounts, setDiscounts] = useState<number[]>(TIERS.map((t) => t.defaultDisc));
  const [simulated, setSimulated] = useState(false);

  const simulation = useMemo(() => {
    return TIERS.map((t, i) => {
      const disc = discounts[i];
      const unit = BASE_PRICE * (1 - disc / 100);
      const revenue = unit * t.qty;
      const cost = BASE_COST * t.qty;
      const profit = revenue - cost;
      const margin = (profit / revenue) * 100;
      return { qty: t.qty, disc, unit, revenue, cost, profit, margin };
    });
  }, [discounts]);

  const totalTraffic = TRAFFIC_DATA.reduce(
    (a, d) => a + d.metaProf + d.metaAlunos + d.googleProf + d.googleAlunos,
    0,
  );
  const totalRevenue = ROI_BY_CAMPAIGN.reduce((a, c) => a + c.revenue, 0);
  const totalSpend = ROI_BY_CAMPAIGN.reduce((a, c) => a + c.spend, 0);
  const blendedRoas = totalRevenue / totalSpend;
  const lowStock = AMT_CATALOG.filter((p) => p.stock < 25).length;

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Catálogo Inteligente & Analytics"
        description="Desempenho de tráfego pago, produtos quentes AMT e simulação de margem de atacado."
        actions={
          <Badge variant="secondary" className="gap-1">
            <BarChart4 className="h-3 w-3" /> Últimos 42 dias
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cliques totais" value={totalTraffic.toLocaleString("pt-BR")} icon={Users2} delta={17.8} />
        <StatCard label="Receita atribuída (Ads)" value={brl(totalRevenue)} icon={TrendingUp} delta={12.4} />
        <StatCard label="ROAS combinado" value={`${blendedRoas.toFixed(2)}x`} icon={Target} delta={6.1} />
        <StatCard label="Alertas de estoque" value={String(lowStock)} icon={AlertTriangle} delta={-2} />
      </div>

      {/* ---------- Traffic performance ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Cliques por semana — Professores vs Alunos"
          className="lg:col-span-2"
        >
          <div className="mb-3 flex flex-wrap gap-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 text-primary" /> Professores/Academias
            </span>
            <span className="flex items-center gap-1.5">
              <Users2 className="h-3 w-3 text-amber-500" /> Alunos/Varejo
            </span>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer>
              <LineChart data={TRAFFIC_DATA}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="metaProf"
                  name="Meta — Prof."
                  stroke="hsl(210 90% 55%)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="googleProf"
                  name="Google — Prof."
                  stroke="hsl(160 70% 45%)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="metaAlunos"
                  name="Meta — Alunos"
                  stroke="hsl(0 84% 60%)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="googleAlunos"
                  name="Google — Alunos"
                  stroke="hsl(35 92% 55%)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="ROAS por campanha" delay={0.1}>
          <div className="h-[320px] w-full">
            <ResponsiveContainer>
              <BarChart data={ROI_BY_CAMPAIGN} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, k) => (k === "roas" ? `${v.toFixed(2)}x` : brl(Number(v)))}
                />
                <Bar dataKey="roas" radius={[6, 6, 0, 0]}>
                  {ROI_BY_CAMPAIGN.map((c, i) => (
                    <Cell
                      key={c.name}
                      fill={
                        c.roas >= 4
                          ? "hsl(160 70% 45%)"
                          : c.roas >= 3.3
                            ? "hsl(210 90% 55%)"
                            : "hsl(35 92% 55%)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ---------- Hot products ---------- */}
      <div className="mt-6">
        <SectionCard
          title="Monitor de produtos quentes AMT"
          delay={0.15}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {HOT_PRODUCTS.map((p, i) => {
              const Icon = TREND_ICON[p.trend];
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 rounded-md border bg-card p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium leading-tight">{p.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {p.category} · Linha {p.line}
                        </div>
                      </div>
                      <Badge variant="outline" className={`gap-1 ${TREND_STYLE[p.trend]}`}>
                        <Icon className="h-3 w-3" />
                        {p.trend === "flat" ? "estável" : `${p.delta > 0 ? "+" : ""}${p.delta.toFixed(1)}%`}
                      </Badge>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.interest}%` }}
                        transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                        className={`h-full ${
                          p.trend === "up"
                            ? "bg-emerald-500"
                            : p.trend === "down"
                              ? "bg-red-500"
                              : "bg-primary"
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{p.note}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ---------- Wholesale margin simulator ---------- */}
      <div className="mt-6">
        <SectionCard
          title="Painel de controle — Margem de atacado"
          delay={0.2}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Base: faixa média AMT — preço varejo {brl(BASE_PRICE)} · custo {brl(BASE_COST)} por unidade.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setSimulated(true);
                setTimeout(() => setSimulated(false), 2200);
              }}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              Simular cenário
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {simulation.map((s, i) => {
              const healthy = s.margin >= 45;
              return (
                <motion.div
                  key={s.qty}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative overflow-hidden rounded-lg border bg-card p-4"
                >
                  <AnimatePresence>
                    {simulated && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500"
                      >
                        <CheckCircle2 className="h-3 w-3" /> simulado
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      Lote {s.qty}+
                    </Badge>
                    <span className="text-xs text-muted-foreground">faixas</span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Desconto</span>
                      <span className="text-lg font-semibold text-primary">{s.disc}%</span>
                    </div>
                    <Slider
                      value={[s.disc]}
                      onValueChange={(v) =>
                        setDiscounts((prev) => {
                          const next = [...prev];
                          next[i] = v[0];
                          return next;
                        })
                      }
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Unitário
                      </div>
                      <div className="text-sm font-semibold">{brl(s.unit)}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Receita
                      </div>
                      <div className="text-sm font-semibold">{brl(s.revenue)}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Custo
                      </div>
                      <div className="text-sm font-semibold">{brl(s.cost)}</div>
                    </div>
                    <div
                      className={`rounded-md p-2 ${
                        healthy ? "bg-emerald-500/10" : "bg-amber-500/10"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Lucro
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          healthy ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {brl(s.profit)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Margem</span>
                      <span
                        className={`font-semibold ${
                          healthy ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {s.margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        animate={{ width: `${Math.max(0, Math.min(100, s.margin))}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                        className={`h-full ${healthy ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground">
            Margem saudável ≥ 45%. Cenários abaixo desse limite ficam em alerta amarelo para revisão de política de atacado.
          </p>
        </SectionCard>
      </div>

      {/* ---------- Legacy: monitored SKUs quick view ---------- */}
      <div className="mt-6">
        <SectionCard title={`SKUs monitorados — ${AMT_CATALOG.length} itens`} delay={0.25}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AMT_CATALOG.slice(0, 9).map((p, i) => {
              const pct = Math.min(100, (p.stock / 300) * 100);
              const low = p.stock < 25;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-md border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium leading-tight">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.category} · Linha {p.line}
                      </div>
                    </div>
                    {low && (
                      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500">
                        Baixo
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${low ? "bg-red-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{p.stock} un.</span>
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
