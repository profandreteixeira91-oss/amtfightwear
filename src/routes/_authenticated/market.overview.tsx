import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Package, Users, Handshake, Radar } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { brl } from "@/lib/format";
import { SocialInsights } from "@/components/market/SocialInsights";

export const Route = createFileRoute("/_authenticated/market/overview")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Painel Geral" }] }),
  component: OverviewPage,
});

async function fetchOverview() {
  const [{ count: leads }, { count: deals }, { count: products }, { data: dealRows }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("crm_deals").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("crm_deals").select("value,stage"),
    ]);
  const pipeline = (dealRows ?? []).reduce((sum, d: { value: number | null }) => sum + Number(d.value ?? 0), 0);
  const closed = (dealRows ?? [])
    .filter((d: { stage: string }) => /fechad|conver/i.test(d.stage))
    .reduce((s, d: { value: number | null }) => s + Number(d.value ?? 0), 0);
  return { leads: leads ?? 0, deals: deals ?? 0, products: products ?? 0, pipeline, closed };
}

function OverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["market", "overview"],
    queryFn: fetchOverview,
    refetchInterval: 30_000,
  });

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Painel Geral"
        description="Visão consolidada do motor de vendas AMT Fight Wear com dados reais."
        actions={<Badge variant="secondary" className="gap-1"><Rocket className="h-3 w-3" /> Ao vivo</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Leads cadastrados" value={String(data?.leads ?? 0)} icon={Radar} />
            <StatCard label="Negócios no CRM" value={String(data?.deals ?? 0)} icon={Handshake} />
            <StatCard label="Pipeline aberto" value={brl(data?.pipeline ?? 0)} icon={Users} />
            <StatCard label="Produtos no catálogo" value={String(data?.products ?? 0)} icon={Package} />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Receita fechada">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : (data?.closed ?? 0) > 0 ? (
            <div className="py-6 text-center">
              <div className="text-4xl font-bold text-primary">{brl(data?.closed ?? 0)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Somatório dos negócios em estágio "Fechado/Convertido"</div>
            </div>
          ) : (
            <EmptyState title="Nenhum negócio fechado ainda" description="Cadastre negócios no CRM e mova para o estágio 'Fechado' para acompanhar." />
          )}
        </SectionCard>

        <SectionCard title="Como começar" delay={0.1}>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span> Cadastre leads em <b>Lead Scraper</b>.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span> Crie negociações no <b>CRM & E-mail</b>.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span> Gere copies com IA no <b>IA Content Hub</b>.</li>
            <li className="flex gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">4</span> Acompanhe o desempenho aqui.</li>
          </ol>
        </SectionCard>
      </div>
    </>
  );
}
