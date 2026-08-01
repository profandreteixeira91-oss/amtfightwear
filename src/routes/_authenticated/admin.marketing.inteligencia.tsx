import { createFileRoute } from "@tanstack/react-router";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, ShoppingBag, Users, TrendingUp, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { growthService } from "@/services/growthService";
import { brl, intFmt } from "@/lib/format";
import { dayISO } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/admin/marketing/inteligencia")({
  head: () => ({
    meta: [{ title: "Inteligência Comercial — AMT Growth" }],
  }),
  component: () => (<OwnerOnly><IntelligencePage /></OwnerOnly>),
});

function IntelligencePage() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: growthService.orders, refetchInterval: 30_000 });
  const customers = useQuery({ queryKey: ["customers"], queryFn: growthService.customers, refetchInterval: 30_000 });
  const products = useQuery({ queryKey: ["products"], queryFn: growthService.products, refetchInterval: 30_000 });

  const loading = orders.isLoading || customers.isLoading || products.isLoading;
  const error = orders.error || customers.error || products.error;

  const totalRevenue = (orders.data ?? []).reduce((a, o) => a + Number(o.total), 0);
  const totalOrders = orders.data?.length ?? 0;
  const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
  const activeCustomers = customers.data?.length ?? 0;

  // Daily revenue series (last 30 days)
  const series = buildDailySeries(orders.data ?? [], 30);

  return (
    <>
      <PageHeader
        eyebrow="Growth Intelligence"
        title="Inteligência Comercial"
        description="Panorama consolidado da operação AMT Fight Wear em tempo real."
        actions={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Live
          </Badge>
        }
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => orders.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Receita total" value={brl(totalRevenue)} icon={BarChart3} loading={loading} index={0} />
            <StatCard label="Pedidos" value={intFmt(totalOrders)} icon={ShoppingBag} loading={loading} index={1} />
            <StatCard label="Ticket médio" value={brl(avgTicket)} icon={TrendingUp} loading={loading} index={2} />
            <StatCard label="Clientes" value={intFmt(activeCustomers)} icon={Users} loading={loading} index={3} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard title="Receita (últimos 30 dias)" className="lg:col-span-2" delay={0.1}>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : series.length === 0 ? (
                <EmptyState
                  title="Sem pedidos ainda"
                  description="Assim que os primeiros pedidos entrarem, o gráfico será atualizado automaticamente."
                />
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={series}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => brl(v)} width={80} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(v: number) => brl(v)}
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </SectionCard>

            <SectionCard title="Top produtos" delay={0.2}>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (products.data?.length ?? 0) === 0 ? (
                <EmptyState title="Sem produtos cadastrados" description="Cadastre produtos para ver o ranking." />
              ) : (
                <ul className="divide-y divide-border">
                  {(products.data ?? []).slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.category ?? "sem categoria"}</div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold">{brl(Number(p.price))}</div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}

function buildDailySeries(orders: { placed_at: string; total: number }[], days: number) {
  if (orders.length === 0) return [];
  const map = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    const key = dayISO(o.placed_at);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + Number(o.total));
  }
  return Array.from(map.entries()).map(([date, value]) => ({
    label: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    value,
  }));
}
