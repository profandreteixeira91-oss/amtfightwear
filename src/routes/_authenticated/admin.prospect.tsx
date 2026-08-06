import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Users, Sparkles, Mail, MessageCircle, Instagram, TrendingUp,
  Radar, Handshake, Target, MapPin,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { StatCard } from "@/components/common/StatCard";
import { SectionCard } from "@/components/common/SectionCard";
import { ErrorState } from "@/components/common/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/prospect/prospect.functions";
import { fmtDateTime } from "@/features/prospect/utils";

export const Route = createFileRoute("/_authenticated/admin/prospect")({
  head: () => ({
    meta: [
      { title: "Prospect Engine — AMT Growth Engine" },
      { name: "description", content: "Central de prospecção B2B com IA." },
    ],
  }),
  component: ProspectDashboardPage,
});

function ProspectDashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prospect", "dashboard"],
    queryFn: () => fetchStats(),
    refetchInterval: 60_000,
  });

  return (
    <PageShell
        eyebrow="Prospect Engine"
        title="Central de Prospecção"
        description="Motor de busca, enriquecimento e pipeline de leads B2B com IA."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/leads" search={{ q: "", pipeline_stage: "all" }}><Users className="mr-2 h-4 w-4" />Leads</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/leads/busca"><Radar className="mr-2 h-4 w-4" />Nova busca</Link>
            </Button>
          </>
        }
      >

      {error && <ErrorState message={String(error)} onRetry={() => refetch()} />}

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Leads (total)" value={data.total} icon={Users} index={0} />
            <StatCard label="Capturados 24h" value={data.captured.day} icon={Radar} index={1} hint={`${data.captured.week} nesta semana`} />
            <StatCard label="Enriquecidos" value={data.enriched} icon={Sparkles} index={2} hint={`${data.enrichmentRate}% da base`} />
            <StatCard label="Qualificados" value={data.qualified} icon={Target} index={3} hint={`${data.conversionRate}% conversão`} />
            <StatCard label="Com E-mail" value={data.emailCount} icon={Mail} index={4} />
            <StatCard label="Com WhatsApp" value={data.whatsappCount} icon={MessageCircle} index={5} />
            <StatCard label="Com Instagram" value={data.instagramCount} icon={Instagram} index={6} />
            <StatCard label="Captados 30d" value={data.captured.month} icon={TrendingUp} index={7} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <SectionCard title="Top segmentos" description="Distribuição da base por categoria" delay={0.05}>
              <RankList items={data.bySegment} empty="Ainda sem dados" />
            </SectionCard>
            <SectionCard title="Top estados" description="Concentração geográfica" delay={0.1}>
              <RankList items={data.byState} empty="Ainda sem dados" icon={MapPin} />
            </SectionCard>
            <SectionCard title="Top cidades" description="Cidades com mais leads" delay={0.15}>
              <RankList items={data.byCity} empty="Ainda sem dados" />
            </SectionCard>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Últimos eventos" description="Timeline recente do módulo" delay={0.2}>
              {data.recentTimeline.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem eventos ainda.</div>
              ) : (
                <ul className="space-y-2">
                  {data.recentTimeline.map((e) => (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.event_type}</div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Pesquisas recentes" description="Últimas buscas executadas" delay={0.25}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/leads/busca"><Radar className="mr-2 h-4 w-4" />Nova</Link>
                </Button>
              }>
              {data.recentSearches.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma busca salva.</div>
              ) : (
                <ul className="space-y-2">
                  {data.recentSearches.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Handshake className="h-4 w-4 text-primary" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{fmtDateTime(s.last_run_at)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageShell>
  );
}

function RankList({ items, empty, icon: Icon }: { items: { name: string; value: number }[]; empty: string; icon?: typeof MapPin }) {
  if (!items.length) return <div className="text-sm text-muted-foreground">{empty}</div>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.name} className="text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 truncate font-medium">
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              {i.name}
            </span>
            <span className="text-xs text-muted-foreground">{i.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
