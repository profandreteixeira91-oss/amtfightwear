import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertTriangle,
  Users,
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Calculator,
} from "lucide-react";
import { brl, pct, useFinanceKpis } from "./shared";

const chartColors = ["#dc2626", "#0a0a0a", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
  hint?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
      ? "text-red-600"
      : tone === "warning"
      ? "text-amber-600"
      : "text-foreground";
  return (
    <Card className="p-4 border border-[color:var(--dojo-border)] hover:border-[color:var(--dojo-border-strong)] transition-colors min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium truncate">
          {label}
        </span>
        <div className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-muted/50">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className={`font-display text-xl md:text-2xl font-bold tracking-tight truncate ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </Card>
  );
}

export function FinanceDashboard() {
  const k = useFinanceKpis();

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi icon={Wallet} label="Saldo disponível" value={brl(k.netProfit)} tone={k.netProfit >= 0 ? "positive" : "negative"} />
        <Kpi icon={TrendingUp} label="Receitas do mês" value={brl(k.paidThisMonth)} tone="positive" />
        <Kpi icon={TrendingDown} label="Despesas do mês" value={brl(k.expensesThisMonth)} tone="negative" />
        <Kpi icon={CircleDollarSign} label="Lucro líquido" value={brl(k.netProfit)} tone={k.netProfit >= 0 ? "positive" : "negative"} />
        <Kpi icon={Receipt} label="Mensalidades recebidas" value={brl(k.paidThisMonth)} hint="Faturas pagas no mês" />
        <Kpi icon={AlertTriangle} label="Mensalidades em atraso" value={brl(k.overdueAmount)} tone="warning" hint={`${k.overdueCount} cobrança(s)`} />
        <Kpi icon={ArrowDownRight} label="Contas a receber" value={brl(k.pendingReceivables)} tone="warning" />
        <Kpi icon={ArrowUpRight} label="Contas a pagar" value={brl(k.pendingPayables)} tone="warning" />
        <Kpi icon={Users} label="Ticket médio" value={brl(k.avgTicket)} hint="Por aluno pagante" />
        <Kpi icon={AlertTriangle} label="Inadimplência" value={pct(k.overdueRate)} tone={k.overdueRate > 10 ? "negative" : "default"} />
        <Kpi icon={LineIcon} label="MRR" value={brl(k.mrr)} hint="Últimos 30 dias" />
        <Kpi icon={Calculator} label="Fluxo projetado" value={brl(k.projectedCashflow)} tone={k.projectedCashflow >= 0 ? "positive" : "negative"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 border border-[color:var(--dojo-border)] lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">Receitas × Despesas</h3>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </div>
            <Badge variant="outline" className="text-[10px]">R$</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={k.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dojo-border)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">Formas de pagamento</h3>
              <p className="text-xs text-muted-foreground">Faturas recebidas</p>
            </div>
            <PieIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          {k.paymentMethods.length === 0 ? (
            <div className="grid place-items-center h-[240px] text-xs text-muted-foreground">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={k.paymentMethods} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {k.paymentMethods.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">Evolução do saldo</h3>
              <p className="text-xs text-muted-foreground">Receitas − despesas por mês</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={k.months}>
              <defs>
                <linearGradient id="gSaldo" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dojo-border)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Area type="monotone" dataKey="saldo" stroke="#dc2626" strokeWidth={2} fill="url(#gSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border border-[color:var(--dojo-border)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">Fluxo de caixa</h3>
              <p className="text-xs text-muted-foreground">Entradas × Saídas consolidadas</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={k.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dojo-border)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="receitas" name="Entradas" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="despesas" name="Saídas" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
