import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink, RefreshCw, TrendingUp, TrendingDown, ShoppingCart, Users,
  Eye, DollarSign, Package, AlertTriangle, Sparkles, ArrowRight, Activity,
  ShoppingBag, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { adminGetDashboard } from "@/lib/store/dashboard.functions";
import { orderStatusLabel } from "@/lib/store/order-status";
import { VisitorsPanel } from "@/components/store/VisitorsPanel";

type Range = "today" | "yesterday" | "7d" | "30d" | "90d" | "year";

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "year", label: "Ano" },
];

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const NUM = (v: number) => v.toLocaleString("pt-BR");

const COLORS = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

export const Route = createFileRoute("/_authenticated/admin/loja")({
  component: StoreDashboard,
});

function StoreDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const fetchDash = useServerFn(adminGetDashboard);
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["store", "dashboard", range],
    queryFn: () => fetchDash({ data: { range } }),
    refetchInterval: 30_000,
  });

  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, [now]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50/50">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 md:space-y-8 md:p-8">
        {/* Header premium — SaaS style (Stripe/Linear/Vercel) */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              AMT Store
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-[32px] md:leading-tight">
              {greeting}, Admin
            </h1>
            <p className="mt-1.5 flex items-center gap-2 truncate text-xs text-neutral-500 sm:text-sm">
              <span className="capitalize">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </span>
              <span className="text-neutral-300">·</span>
              <span className={`inline-flex items-center gap-1.5 ${isFetching ? "text-neutral-500" : "text-emerald-600"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isFetching ? "animate-pulse bg-neutral-400" : "bg-emerald-500"}`} />
                {isFetching ? "sincronizando" : `atualizado ${new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:shadow disabled:opacity-50"
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <a
              href="/loja"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-900 px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
              aria-label="Ver loja"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver loja</span>
              <span className="sm:hidden">Loja</span>
            </a>
          </div>
        </div>

        {/* Filtros de período */}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max gap-0.5 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  range === r.key
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard
            icon={DollarSign}
            label="Faturamento hoje"
            value={data ? BRL(data.today.revenue) : undefined}
            loading={isLoading}
            delta={data?.today.growth}
            hint={data ? `vs ontem: ${BRL(data.today.revenue_yesterday)}` : undefined}
            tone="revenue"
          />
          <KpiCard
            icon={ShoppingBag}
            label="Pedidos hoje"
            value={data ? NUM(data.today.orders) : undefined}
            loading={isLoading}
            hint={data ? `Ticket ${BRL(data.today.avg_ticket)}` : undefined}
            tone="orders"
          />
          <KpiCard
            icon={Eye}
            label="Visitantes agora"
            value={data ? NUM(data.live.active) : undefined}
            loading={isLoading}
            hint={
              data
                ? `${data.live.checkout} checkout · ${data.live.product_views} produtos`
                : undefined
            }
            tone="live"
            live
          />
          <KpiCard
            icon={ShoppingCart}
            label="Carrinhos abandonados"
            value={data ? NUM(data.abandoned.carts.length) : undefined}
            loading={isLoading}
            hint={data ? `Potencial ${BRL(data.abandoned.total_value)}` : undefined}
            tone="cart"
          />
        </div>


      {/* Visitors analytics */}
      <VisitorsPanel />

      {/* Financial + chart */}
      <div className="grid gap-4 lg:grid-cols-3">

        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" /> Evolução de vendas
                </CardTitle>
                <CardDescription>Receita e pedidos por dia</CardDescription>
              </div>
              {data && (
                <div className="text-right text-xs">
                  <div className="text-muted-foreground">Receita líquida</div>
                  <div className="text-lg font-black">{BRL(data.finance.net_revenue)}</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.daily_series ?? []}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip
                      formatter={(v: number, name: string) => [name === "revenue" ? BRL(v) : NUM(v), name === "revenue" ? "Receita" : "Pedidos"]}
                      labelClassName="font-semibold"
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo financeiro</CardTitle>
            <CardDescription>Somente pedidos pagos no período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FinanceRow label="Receita bruta" value={data?.finance.gross_revenue} loading={isLoading} />
            <FinanceRow label="Descontos" value={data?.finance.discounts} loading={isLoading} negative />
            <FinanceRow label="Fretes" value={data?.finance.shipping} loading={isLoading} />
            <FinanceRow label="Receita líquida" value={data?.finance.net_revenue} loading={isLoading} highlight />
            <FinanceRow
              label="Produção finalizada"
              value={data?.finance.production_revenue}
              loading={isLoading}
            />
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Pedidos pagos</span>
              <span className="font-bold">{data ? NUM(data.finance.paid_orders) : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Itens finalizados na produção</span>
              <span className="font-bold">{data ? NUM(data.finance.production_entries) : "—"}</span>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Status + Traffic sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pedidos por status</CardTitle>
            <CardDescription>Distribuição no período</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.status_breakdown.length ?? 0) === 0 ? (
              <EmptyState text="Sem pedidos no período." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.status_breakdown ?? []} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v: number) => NUM(v)} />
                    <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Origem do tráfego</CardTitle>
            <CardDescription>Referrers dos visitantes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.traffic_sources.length ?? 0) === 0 ? (
              <EmptyState text="Sem dados de visitantes ainda." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.traffic_sources ?? []}
                      dataKey="count"
                      nameKey="source"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {(data?.traffic_sources ?? []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => NUM(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products + Low stock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
              <CardDescription>Top 10 do período</CardDescription>
            </div>
            <Link to="/admin/produtos" className="text-xs font-semibold text-primary hover:underline">
              Ver todos <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (data?.top_products.length ?? 0) === 0 ? (
              <EmptyState text="Sem vendas no período." />
            ) : (
              <div className="space-y-2">
                {data?.top_products.map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                    <div className="w-6 shrink-0 text-center text-sm font-black text-muted-foreground">
                      {i + 1}
                    </div>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku ?? "—"} · {NUM(p.qty)} un.</div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-bold">{BRL(p.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Estoque baixo
              </CardTitle>
              <CardDescription>Produtos com ≤ 5 unidades</CardDescription>
            </div>
            <Link to="/admin/produtos" className="text-xs font-semibold text-primary hover:underline">
              Repor <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (data?.low_stock.length ?? 0) === 0 ? (
              <EmptyState text="Estoque saudável." />
            ) : (
              <div className="space-y-2">
                {data?.low_stock.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku ?? "—"} · {BRL(Number(p.price ?? 0))}</div>
                    </div>
                    <Badge variant={p.stock === 0 ? "destructive" : "secondary"}>
                      {p.stock} un.
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales by category + Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vendas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (data?.sales_by_category.length ?? 0) === 0 ? (
              <EmptyState text="Sem vendas no período." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.sales_by_category ?? []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(v: number) => BRL(v)} />
                    <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" /> Insights
            </CardTitle>
            <CardDescription>Gerados a partir dos dados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (data?.insights.length ?? 0) === 0 ? (
              <EmptyState text="Sem insights por enquanto." />
            ) : (
              <ul className="space-y-2 text-sm">
                {data?.insights.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + Customers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Últimos pedidos</CardTitle>
              <CardDescription>Atualização automática</CardDescription>
            </div>
            <Link to="/admin/pedidos" className="text-xs font-semibold text-primary hover:underline">
              Ver todos <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><Skeleton className="h-40 w-full" /></div>
            ) : (data?.recent_orders.length ?? 0) === 0 ? (
              <div className="p-6"><EmptyState text="Nenhum pedido recente." /></div>
            ) : (
              <>
                {/* Mobile: lista em cards */}
                <ul className="divide-y md:hidden">
                  {data?.recent_orders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">{o.order_number}</span>
                          <PaymentBadge status={o.payment_status} />
                        </div>
                        <div className="mt-0.5 truncate text-sm font-semibold">{o.customer}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="truncate">{o.city || "—"}</span>
                          <span>·</span>
                          <Badge variant="outline" className="h-4 text-[10px]">{orderStatusLabel[o.status] ?? o.status}</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-black">{BRL(o.total)}</div>
                    </li>
                  ))}
                </ul>
                {/* Desktop: tabela */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Cidade</th>
                        <th className="p-3">Pagamento</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recent_orders.map((o) => (
                        <tr key={o.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{o.order_number}</td>
                          <td className="p-3">{o.customer}</td>
                          <td className="p-3 text-xs text-muted-foreground">{o.city}</td>
                          <td className="p-3">
                            <PaymentBadge status={o.payment_status} />
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">{o.status}</Badge>
                          </td>
                          <td className="p-3 text-right font-bold">{BRL(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>

        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Total" value={data ? NUM(data.customers.total) : "—"} />
              <MiniStat label="Novos" value={data ? NUM(data.customers.new) : "—"} />
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Top clientes</div>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (data?.customers.top.length ?? 0) === 0 ? (
                <EmptyState text="Sem clientes ainda." />
              ) : (
                <ul className="space-y-2">
                  {data?.customers.top.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.full_name || c.email}</div>
                        <div className="text-xs text-muted-foreground">{c.orders_count ?? 0} pedidos</div>
                      </div>
                      <div className="shrink-0 font-bold">{BRL(Number(c.total_spent ?? 0))}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abandoned carts + Activity teaser */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-primary" /> Carrinhos abandonados
            </CardTitle>
            <CardDescription>Últimas 24h</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (data?.abandoned.carts.length ?? 0) === 0 ? (
              <EmptyState text="Sem carrinhos abandonados." />
            ) : (
              <ul className="space-y-2">
                {data?.abandoned.carts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold">{c.items} item(s)</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(c.updated_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold">{BRL(c.value)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Integrações</CardTitle>
            <CardDescription>Conecte para desbloquear métricas</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <IntegrationCard label="Google Analytics" status="pending" />
            <IntegrationCard label="Google Search Console" status="pending" />
            <IntegrationCard label="Meta Ads" status="pending" />
            <IntegrationCard label="Google Ads" status="pending" />
            <IntegrationCard label="Mercado Pago" status="active" />
            <IntegrationCard label="WhatsApp" status="pending" />
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  loading,
  tone,
  live,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  hint?: string;
  delta?: number;
  loading: boolean;
  tone: "revenue" | "orders" | "live" | "cart";
  live?: boolean;
}) {
  const toneClass = {
    revenue: { icon: "bg-red-50 text-red-600 ring-1 ring-red-100", accent: "bg-red-500" },
    orders: { icon: "bg-blue-50 text-blue-600 ring-1 ring-blue-100", accent: "bg-blue-500" },
    live: { icon: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100", accent: "bg-emerald-500" },
    cart: { icon: "bg-amber-50 text-amber-600 ring-1 ring-amber-100", accent: "bg-amber-500" },
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClass.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100 sm:text-[10px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Ao vivo
          </span>
        )}
      </div>
      <div className="mt-3 truncate text-[11px] font-medium uppercase tracking-wider text-neutral-500 sm:text-xs">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-1.5 h-8 w-24" />
      ) : (
        <div className="mt-1 truncate text-2xl font-bold tracking-tight text-neutral-900 sm:text-[28px] sm:leading-tight">
          {value ?? "—"}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
        {typeof delta === "number" && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
            delta >= 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-red-50 text-red-700 ring-1 ring-red-100"
          }`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
          </span>
        )}
        {hint && <span className="truncate text-neutral-500">{hint}</span>}
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 ${toneClass.accent} transition-transform duration-300 group-hover:scale-x-100`} />
    </div>
  );
}


function FinanceRow({ label, value, loading, highlight, negative }: { label: string; value?: number; loading: boolean; highlight?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${highlight ? "border-t pt-3" : ""}`}>
      <span className={highlight ? "font-bold" : "text-muted-foreground"}>{label}</span>
      {loading ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <span className={`font-bold ${highlight ? "text-lg text-primary" : negative ? "text-red-600" : ""}`}>
          {negative && (value ?? 0) > 0 ? "− " : ""}{BRL(value ?? 0)}
        </span>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function PaymentBadge({ status }: { status: string | null | undefined }) {
  const s = (status || "pending").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-700" },
    approved: { label: "Aprovado", cls: "bg-emerald-500/15 text-emerald-700" },
    pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-700" },
    failed: { label: "Falhou", cls: "bg-red-500/15 text-red-700" },
    refunded: { label: "Reembolsado", cls: "bg-slate-500/15 text-slate-700" },
    cancelled: { label: "Cancelado", cls: "bg-slate-500/15 text-slate-700" },
  };
  const conf = map[s] ?? { label: s, cls: "bg-muted text-muted-foreground" };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${conf.cls}`}>{conf.label}</span>;
}

function IntegrationCard({ label, status }: { label: string; status: "active" | "pending" }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <span className="truncate font-semibold">{label}</span>
      <Badge variant={status === "active" ? "default" : "outline"} className="text-[10px]">
        {status === "active" ? "Ativo" : "Configurar"}
      </Badge>
    </div>
  );
}
