import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Search, Users, Mail, Phone, Globe, Instagram, Sparkles, Download, TrendingUp, Building2,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getScraperDashboard, listScrapeRuns } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/")({
  head: () => ({ meta: [{ title: "Lead Scraper IA — Dashboard" }] }),
  component: DashboardPage,
});

const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

function DashboardPage() {
  const fetchDash = useServerFn(getScraperDashboard);
  const fetchRuns = useServerFn(listScrapeRuns);
  const { data, isLoading } = useQuery({ queryKey: ["scraper-dashboard"], queryFn: () => fetchDash() });
  const { data: runs } = useQuery({ queryKey: ["scrape-runs"], queryFn: () => fetchRuns() });

  const t = data?.totals;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Dashboard"
        description="Panorama do módulo de prospecção autônoma — dados 100% públicos e em conformidade com a LGPD."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads hoje" value={t?.leadsToday ?? 0} icon={Users} loading={isLoading} index={0} />
        <StatCard label="Total de leads" value={t?.leads ?? 0} icon={Building2} loading={isLoading} index={1} />
        <StatCard label="Enriquecidos" value={t?.enriched ?? 0} hint={`${data?.enrichmentRate ?? 0}% de taxa`} icon={Sparkles} loading={isLoading} index={2} />
        <StatCard label="Pesquisas" value={t?.searches ?? 0} icon={Search} loading={isLoading} index={3} />
        <StatCard label="E-mails encontrados" value={t?.emails ?? 0} icon={Mail} loading={isLoading} index={4} />
        <StatCard label="Instagrams" value={t?.instagrams ?? 0} icon={Instagram} loading={isLoading} index={5} />
        <StatCard label="Telefones" value={t?.phones ?? 0} icon={Phone} loading={isLoading} index={6} />
        <StatCard label="Sites" value={t?.sites ?? 0} icon={Globe} loading={isLoading} index={7} />
        <StatCard label="Enviados 24h" value={data?.outreachTotals?.sent24h ?? 0} icon={Mail} loading={isLoading} index={8} />
        <StatCard label="Enviados 7d" value={data?.outreachTotals?.sent7d ?? 0} icon={Mail} loading={isLoading} index={9} />
        <StatCard label="Respostas" value={t?.responses ?? 0} hint={`${data?.responseRate ?? 0}% de taxa`} icon={TrendingUp} loading={isLoading} index={10} />
        <StatCard label="Conversões" value={t?.customers ?? 0} hint={`${data?.conversionRate ?? 0}% de taxa`} icon={Building2} loading={isLoading} index={11} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Leads por dia" description="Últimos 30 dias">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data?.byDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="key" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Por segmento (modalidade)">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data?.bySegment ?? []} dataKey="value" nameKey="key" outerRadius={90} label>
                  {(data?.bySegment ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Top 10 cidades">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.byCity ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" fontSize={10} angle={-20} height={60} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Por estado (UF)">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.byState ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="key" fontSize={11} width={40} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard className="mt-6" title="Últimas pesquisas" description="Rodadas do piloto automático">
        {!runs?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma pesquisa executada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Encontrados</TableHead>
                <TableHead className="text-right">Inseridos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.slice(0, 15).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at!).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{r.city ?? "—"} / {r.state ?? "—"}</TableCell>
                  <TableCell>{r.theme ?? "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "done" ? "default" : r.status === "error" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{r.found ?? 0}</TableCell>
                  <TableCell className="text-right">{r.inserted ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </motion.div>
  );
}
