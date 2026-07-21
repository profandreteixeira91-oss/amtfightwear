import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
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
  ComposedChart,
  Area,
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
  Percent,
  Clock,
  Sparkles,
} from "lucide-react";
import { dojoFinanceDashboard } from "@/lib/dojo/finance-dashboard.functions";
import { brl, pct } from "./shared";

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
      <div
        className={`font-display text-xl md:text-2xl font-bold tracking-tight truncate ${toneClass}`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</div>
      )}
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="p-4 border border-[color:var(--dojo-border)] min-w-0">
      <div className="h-3 w-24 bg-muted rounded animate-pulse mb-3" />
      <div className="h-6 w-32 bg-muted rounded animate-pulse" />
    </Card>
  );
}

export function FinanceDashboard() {
  const fn = useServerFn(dojoFinanceDashboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dojo-finance-dashboard"],
    queryFn: () => fn({ data: {} }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (error) {
    return (
      <Card className="p-6 border border-red-200 bg-red-50 text-red-700 text-sm">
        Erro ao carregar dashboard financeiro: {String((error as Error).message)}
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const { wallet, month, pipeline, mrr, months, projection, paymentMethods, topStudents } =
    data;

  return (
    <div className="space-y-6 min-w-0">
      {/* Carteira AMT Pay */}
      <Card className="p-5 border border-[color:var(--dojo-border)] bg-gradient-to-br from-primary/5 via-transparent to-transparent min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              Carteira AMT Pay
            </div>
            <div className="mt-1 font-display text-3xl md:text-4xl font-bold tracking-tight truncate">
              {brl(wallet.available)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Saldo disponível para saque
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-x-6 gap-y-3 text-right">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                A liberar
              </div>
              <div className="font-semibold text-amber-600 truncate">{brl(wallet.pending)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Bloqueado
              </div>
              <div className="font-semibold text-red-600 truncate">{brl(wallet.blocked)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Total
              </div>
              <div className="font-semibold truncate">{brl(wallet.total)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))] 2xl:grid-cols-6">

        <Kpi
          icon={TrendingUp}
          label="Receita bruta (mês)"
          value={brl(month.gross)}
          tone="positive"
          hint={`${month.payersCount} pagante(s)`}
        />
        <Kpi
          icon={CircleDollarSign}
          label="Receita líquida"
          value={brl(month.net)}
          tone="positive"
          hint="Após taxas gateway + AMT"
        />
        <Kpi
          icon={Percent}
          label="Taxas totais"
          value={brl(month.totalFees)}
          tone="warning"
          hint={`${pct(month.feeRate)} do bruto`}
        />
        <Kpi
          icon={TrendingDown}
          label="Despesas (mês)"
          value={brl(month.expenses)}
          tone="negative"
        />
        <Kpi
          icon={Calculator}
          label="Lucro líquido"
          value={brl(month.profit)}
          tone={month.profit >= 0 ? "positive" : "negative"}
          hint="Líquido − despesas"
        />
        <Kpi
          icon={LineIcon}
          label="MRR"
          value={brl(mrr)}
          hint="Recorrências ativas"
        />
        <Kpi
          icon={ArrowDownRight}
          label="A receber"
          value={brl(pipeline.pendingReceivables)}
          tone="warning"
          hint={`${pipeline.openCount} fatura(s)`}
        />
        <Kpi
          icon={AlertTriangle}
          label="Em atraso"
          value={brl(pipeline.overdueAmount)}
          tone="warning"
          hint={`${pipeline.overdueCount} cobrança(s)`}
        />
        <Kpi
          icon={Users}
          label="Ticket médio"
          value={brl(month.avgTicket)}
          hint="Por aluno pagante"
        />
        <Kpi
          icon={AlertTriangle}
          label="Inadimplência"
          value={pct(pipeline.overdueRate)}
          tone={pipeline.overdueRate > 10 ? "negative" : "default"}
        />
        <Kpi
          icon={Receipt}
          label="Taxa gateway"
          value={brl(month.gatewayFees)}
          hint="Asaas / Mercado Pago"
        />
        <Kpi
          icon={Sparkles}
          label="Taxa AMT (2%)"
          value={brl(month.platformFees)}
          hint="Split plataforma"
        />
      </div>

      {/* Projeção de fluxo de caixa */}
      <Card className="p-4 border border-[color:var(--dojo-border)] min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-sm">Projeção de recebíveis</h3>
            <p className="text-xs text-muted-foreground">
              Faturas em aberto + recorrências agendadas
            </p>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {projection.map((p) => (
            <div
              key={p.label}
              className="rounded-lg border border-[color:var(--dojo-border)] p-3"
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Próximos {p.days} dias
              </div>
              <div className="font-display text-lg font-bold tracking-tight text-emerald-700 mt-1">
                {brl(p.amount)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bruto × Líquido × Taxas × Despesas */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] min-w-0">

        <Card className="p-4 border border-[color:var(--dojo-border)] min-w-0 overflow-hidden">

          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">
                Bruto × Líquido × Despesas
              </h3>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              R$
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dojo-border)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="gross" name="Bruto" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="net"
                name="Líquido"
                stroke="#0a0a0a"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border border-[color:var(--dojo-border)] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">Métodos de pagamento</h3>
              <p className="text-xs text-muted-foreground">Recebido no mês</p>
            </div>
            <PieIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          {paymentMethods.length === 0 ? (
            <div className="grid place-items-center h-[260px] text-xs text-muted-foreground">
              Sem recebimentos no mês
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                >
                  {paymentMethods.map((_, i) => (
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

      {/* Fluxo de caixa + Top alunos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 border border-[color:var(--dojo-border)] lg:col-span-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">
                Saldo líquido acumulado
              </h3>
              <p className="text-xs text-muted-foreground">
                Líquido − despesas por mês
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={months}>
              <defs>
                <linearGradient id="gBalance" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dojo-border)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#gBalance)"
              />
              <Line
                type="monotone"
                dataKey="fees"
                name="Taxas"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border border-[color:var(--dojo-border)] min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-sm">Top alunos (mês)</h3>
              <p className="text-xs text-muted-foreground">Maiores receitas líquidas</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          {topStudents.length === 0 ? (
            <div className="grid place-items-center h-[220px] text-xs text-muted-foreground">
              Nenhum pagamento no mês
            </div>
          ) : (
            <ul className="space-y-2">
              {topStudents.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 text-sm border-b border-[color:var(--dojo-border)] last:border-0 pb-2 last:pb-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </div>
                  <span className="font-semibold shrink-0">{brl(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
