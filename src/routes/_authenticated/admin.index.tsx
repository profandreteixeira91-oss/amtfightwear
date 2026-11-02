import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  CreditCard,
  Factory,
  FileText,
  MessageCircle,
  Package,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { adminGetDashboard } from "@/lib/store/dashboard.functions";
import { adminGetOpsInbox } from "@/lib/store/ops-inbox.functions";
import { orderStatusBadgeClass, orderStatusLabel } from "@/lib/store/order-status";
import { formatProductName } from "@/lib/store/product-name";
import { PageShell } from "@/components/common/PageShell";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState } from "@/components/common/ErrorState";
import { ProductImage } from "@/components/store/ProductImage";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Início — Central da loja AMT" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminHome,
});

type Range = "7d" | "30d" | "90d";
const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl(v);
const num = (v: number) => v.toLocaleString("pt-BR");

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

type ActionItem = {
  label: string;
  count: number;
  hint: string;
  href: string;
  search?: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
  tone: "red" | "amber" | "neutral";
};

function AdminHome() {
  const getDashboard = useServerFn(adminGetDashboard);
  const getInbox = useServerFn(adminGetOpsInbox);
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");

  const inbox = useQuery({
    queryKey: ["admin", "central", "ops-inbox"],
    queryFn: () => getInbox(),
    refetchInterval: ADMIN_REFRESH.live,
  });
  const dashboard = useQuery({
    queryKey: ["admin", "central", "dashboard", range],
    queryFn: () => getDashboard({ data: { range } }),
    refetchInterval: ADMIN_REFRESH.dashboard,
  });

  const d = dashboard.data;
  const loading = dashboard.isLoading;
  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? "").trim().split(/\s+/)[0] || null;
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const netRevenue = d?.finance.net_revenue ?? 0;
  const paidOrders = d?.finance.paid_orders ?? 0;
  const avgTicket = paidOrders > 0 ? netRevenue / paidOrders : 0;

  const i = inbox.data;
  const actions: ActionItem[] = i
    ? [
        {
          label: "Para preparar e enviar",
          count: i.orders.toShip,
          hint: "Pagos, aguardando separação ou etiqueta",
          href: "/admin/pedidos",
          search: { tab: "enviar" },
          icon: Truck,
          tone: "red",
        },
        {
          label: "Produção atrasada",
          count: i.production.late,
          hint: `${num(i.production.dueToday)} vencem hoje · ${num(i.production.open)} na fila`,
          href: "/admin/producao",
          icon: Factory,
          tone: "red",
        },
        {
          label: "Aguardando pagamento",
          count: i.orders.pendingPayment,
          hint: "Pedidos dos últimos 7 dias",
          href: "/admin/pedidos",
          search: { tab: "pagamento" },
          icon: Clock,
          tone: "amber",
        },
        {
          label: "Orçamentos sem resposta",
          count: i.quotes.sent,
          hint: `${num(i.quotes.approved)} aprovado(s) aguardando pagamento`,
          href: "/admin/orcamentos",
          search: { status: "sent" },
          icon: FileText,
          tone: "amber",
        },
        {
          label: "Conversas aguardando",
          count: i.chats.human,
          hint: "Clientes pedindo atendimento humano",
          href: "/admin/atendimento",
          icon: MessageCircle,
          tone: "neutral",
        },
      ]
    : [];

  return (
    <PageShell
      title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
      description={<span className="first-letter:uppercase">{today}</span>}
      actions={
        <div className="inline-flex rounded-full bg-neutral-100 p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                range === r.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Precisa de ação */}
      <section aria-label="Precisa de ação">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Precisa de ação</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {inbox.isLoading
            ? Array.from({ length: 5 }).map((_, k) => <Skeleton key={k} className="h-[104px] rounded-2xl" />)
            : actions.map((a) => {
                const zero = a.count === 0;
                return (
                  <Link
                    key={a.label}
                    to={a.href}
                    search={a.search as never}
                    className={cn(
                      "group flex flex-col justify-between rounded-2xl border bg-white p-4 transition-colors",
                      zero ? "border-neutral-200 hover:border-neutral-300" : "border-neutral-200 hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full",
                          zero
                            ? "bg-neutral-100 text-neutral-400"
                            : a.tone === "red"
                              ? "bg-red-50 text-primary"
                              : a.tone === "amber"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-neutral-100 text-foreground",
                        )}
                      >
                        <a.icon className="h-4 w-4" />
                      </span>
                      <span className={cn("text-2xl font-semibold tabular-nums", zero && "text-neutral-300")}>
                        {num(a.count)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        {a.label}
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{a.hint}</div>
                    </div>
                  </Link>
                );
              })}
        </div>
      </section>

      {dashboard.error ? (
        <ErrorState
          title="Não foi possível carregar os números da loja"
          message={dashboard.error instanceof Error ? dashboard.error.message : undefined}
          onRetry={() => dashboard.refetch()}
        />
      ) : (
        <>
          {/* Números do período */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores do período">
            <StatCard label="Faturamento líquido" value={brl(netRevenue)} icon={TrendingUp} loading={loading} />
            <StatCard label="Pedidos pagos" value={num(paidOrders)} icon={ShoppingBag} loading={loading} />
            <StatCard label="Ticket médio" value={brl(avgTicket)} icon={Receipt} loading={loading} />
            <StatCard
              label="Novos clientes"
              value={num(d?.customers.new ?? 0)}
              hint={d ? `${num(d.customers.total)} no total` : undefined}
              icon={Users}
              loading={loading}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Faturamento por dia */}
            <SectionCard
              title="Faturamento por dia"
              description={
                d
                  ? `Hoje: ${brl(d.today.revenue)} · ${num(d.today.orders)} pedido(s)` +
                    (d.today.revenue_yesterday > 0 ? ` · ${d.today.growth >= 0 ? "+" : ""}${d.today.growth.toFixed(0)}% vs. ontem` : "")
                  : undefined
              }
            >
              {loading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : (d?.daily_series.length ?? 0) === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Sem vendas pagas no período.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d!.daily_series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
                      <CartesianGrid vertical={false} stroke="oklch(0.93 0 0)" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                        tickFormatter={(v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`}
                        minTickGap={18}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={64}
                        tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                        tickFormatter={(v: number) => brlShort(v)}
                      />
                      <Tooltip
                        cursor={{ fill: "oklch(0.96 0 0)" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0 0)", fontSize: 12 }}
                        labelFormatter={(v: string) => new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR")}
                        formatter={(value: number, _n, item) => [
                          `${brl(value)} · ${num((item?.payload as { orders?: number })?.orders ?? 0)} pedido(s)`,
                          "Faturamento",
                        ]}
                      />
                      <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            {/* Mais vendidos */}
            <SectionCard
              title="Mais vendidos"
              action={
                <Link to="/admin/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Ver analytics
                </Link>
              }
            >
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Skeleton key={k} className="h-12 rounded-xl" />
                  ))}
                </div>
              ) : (d?.top_products.length ?? 0) === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
              ) : (
                <ol className="space-y-2.5">
                  {d!.top_products.slice(0, 6).map((p, idx) => (
                    <li key={p.product_id} className="flex items-center gap-3">
                      <span className="w-4 text-xs font-semibold text-muted-foreground tabular-nums">{idx + 1}</span>
                      <ProductImage
                        src={p.image_url}
                        alt=""
                        sizes="40px"
                        className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100"
                        imgClassName="p-1 mix-blend-multiply"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{formatProductName(p.name)}</div>
                        <div className="text-xs text-muted-foreground">{num(p.qty)} un.</div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{brl(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Últimos pedidos */}
            <SectionCard
              title="Últimos pedidos"
              action={
                <Link to="/admin/pedidos" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Ver todos
                </Link>
              }
            >
              {loading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : (d?.recent_orders.length ?? 0) === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhum pedido no período.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-2 pb-2 font-medium">Pedido</th>
                        <th className="px-2 pb-2 font-medium">Cliente</th>
                        <th className="px-2 pb-2 font-medium">Status</th>
                        <th className="px-2 pb-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {d!.recent_orders.slice(0, 8).map((o) => (
                        <tr key={o.id} className="hover:bg-neutral-50">
                          <td className="px-2 py-2.5">
                            <Link
                              to="/admin/pedidos/$orderId"
                              params={{ orderId: o.id }}
                              className="font-medium hover:text-primary"
                            >
                              #{o.order_number}
                            </Link>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(o.created_at).toLocaleDateString("pt-BR")}
                            </div>
                          </td>
                          <td className="max-w-[200px] px-2 py-2.5">
                            <div className="truncate">{o.customer}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{o.city}</div>
                          </td>
                          <td className="px-2 py-2.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", orderStatusBadgeClass(o.status))}>
                              {orderStatusLabel[o.status ?? ""] ?? o.status}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{brl(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            {/* Estoque baixo */}
            <SectionCard
              title="Estoque baixo"
              description="Produtos ativos com 5 unidades ou menos"
              action={
                <Link to="/admin/produtos" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Produtos
                </Link>
              }
            >
              {loading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : (d?.low_stock.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <Package className="h-5 w-5" />
                  Estoque em dia.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {d!.low_stock.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <AlertTriangle className={cn("h-4 w-4 shrink-0", p.stock <= 0 ? "text-primary" : "text-amber-500")} />
                      <div className="min-w-0 flex-1 truncate text-sm">{formatProductName(p.name)}</div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          p.stock <= 0 ? "bg-red-50 text-primary" : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {p.stock <= 0 ? "Esgotado" : `${p.stock} un.`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Atalhos operacionais */}
          <section aria-label="Atalhos" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { title: "Novo produto", href: "/admin/produtos", icon: Package },
              { title: "Fila de produção", href: "/admin/producao", icon: Factory },
              { title: "Faturamento (NF-e)", href: "/admin/fiscal/pedidos", icon: CreditCard },
              { title: "Envios", href: "/admin/envio", icon: Truck },
            ].map((s) => (
              <Link
                key={s.title}
                to={s.href}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-medium transition-colors hover:border-neutral-300"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100">
                  <s.icon className="h-4 w-4" />
                </span>
                {s.title}
              </Link>
            ))}
          </section>
        </>
      )}
    </PageShell>
  );
}
