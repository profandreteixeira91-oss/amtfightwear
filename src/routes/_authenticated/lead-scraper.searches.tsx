import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { listScrapeRuns } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/searches")({
  head: () => ({ meta: [{ title: "Pesquisas — Lead Scraper IA" }] }),
  component: SearchesPage,
});

function SearchesPage() {
  const fetchRuns = useServerFn(listScrapeRuns);
  const { data, isLoading } = useQuery({ queryKey: ["scrape-runs-all"], queryFn: () => fetchRuns() });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="Lead Scraper IA"
        title="Pesquisas realizadas"
        description="Histórico completo de rodadas do piloto automático. As pesquisas rodam diariamente via cron, priorizando o Nordeste."
      />

      <SectionCard title="Histórico" description="Ordenadas por data (mais recentes primeiro)">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma pesquisa executada ainda. As buscas automáticas rodam pelos cron jobs configurados no Supabase.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / hora</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Encontrados</TableHead>
                <TableHead className="text-right">Inseridos</TableHead>
                <TableHead className="text-right">Duração (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at!).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{r.city ?? "—"}</TableCell>
                  <TableCell>{r.state ?? "—"}</TableCell>
                  <TableCell>{r.theme ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.source ?? "google"}</TableCell>
                  <TableCell><Badge variant={r.status === "done" ? "default" : r.status === "error" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{r.found ?? 0}</TableCell>
                  <TableCell className="text-right">{r.inserted ?? 0}</TableCell>
                  <TableCell className="text-right">{r.duration_ms ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </motion.div>
  );
}
