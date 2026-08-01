import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Target,
  TrendingUp,
  MousePointerClick,
  Rocket,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { brl } from "@/lib/format";
import { getAdsDashboard } from "@/lib/ads/ads.functions";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/anuncios/")({
  head: () => ({ meta: [{ title: "Tráfego Pago IA — Dashboard" }] }),
  component: AdsDashboard,
});

function AdsDashboard() {
  const fetchDash = useServerFn(getAdsDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["ads", "dashboard"],
    queryFn: () => fetchDash(),
    refetchInterval: 60_000,
  });

  const kpis = data?.kpis;
  const hasData = (data?.series?.length ?? 0) > 0;

  const isReal = data?.source === "meta";

  return (
    <>
      <PageHeader
        eyebrow="Tráfego Pago IA"
        title="Dashboard de Campanhas"
        description={
          isReal
            ? "Dados em tempo real da conta Meta Ads conectada."
            : "Consultor de mídia paga com IA — dados reais do Meta Ads após conectar sua conta."
        }
        actions={
          <>
            {isReal && (
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
                Meta em tempo real
              </Badge>
            )}
            <Button asChild size="sm">
              <Link to="/admin/anuncios/nova"><Sparkles className="mr-2 h-4 w-4" /> Nova Campanha IA</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Gasto hoje" value={brl(kpis?.spendToday ?? 0)} icon={DollarSign} />
            <StatCard label="Gasto no mês" value={brl(kpis?.spendMonth ?? 0)} icon={BarChart3} />
            <StatCard label="ROAS" value={(kpis?.roas ?? 0).toFixed(2) + "x"} icon={TrendingUp} />
            <StatCard label="CPA médio" value={brl(kpis?.cpa ?? 0)} icon={Target} />
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="CTR" value={(kpis?.ctr ?? 0).toFixed(2) + "%"} icon={MousePointerClick} />
        <StatCard label="CPM" value={brl(kpis?.cpm ?? 0)} icon={BarChart3} />
        <StatCard label="CPC" value={brl(kpis?.cpc ?? 0)} icon={MousePointerClick} />
        <StatCard label="Conversões (mês)" value={String(kpis?.conversionsMonth ?? 0)} icon={Target} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Desempenho diário"
          description="Últimos 30 dias — gasto vs receita"
        >
          {hasData ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data!.series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Gasto" />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2, 142 71% 45%))" strokeWidth={2} dot={false} name="Receita" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Sem dados de campanhas ainda"
              description="Conecte sua conta Meta Ads e lance a primeira campanha com IA para ver métricas reais aqui."
            />
          )}
        </SectionCard>

        <SectionCard title="Contas de anúncio">
          {(data?.accounts?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Rocket}
              title="Nenhuma conta conectada"
              description="Vá em Conexão Meta Ads para sincronizar suas contas."
              action={<Button asChild size="sm"><Link to="/admin/anuncios/conexoes">Conectar</Link></Button>}
            />
          ) : (
            <ul className="space-y-2">
              {data!.accounts.map((a: { id: string; name: string; currency: string | null; status: string }) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.currency ?? ""}</div>
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Campanhas ativas" value={String(data?.campaigns?.active ?? 0)} icon={Rocket} />
        <StatCard label="Campanhas pausadas" value={String(data?.campaigns?.paused ?? 0)} icon={Rocket} />
        <StatCard label="Total de campanhas" value={String(data?.campaigns?.total ?? 0)} icon={Rocket} />
      </div>
    </>
  );
}
