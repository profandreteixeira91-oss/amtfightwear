import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listScraperLogs } from "@/lib/lead-scraper.functions";

export const Route = createFileRoute("/_authenticated/lead-scraper/logs")({
  head: () => ({ meta: [{ title: "Logs — Lead Scraper IA" }] }),
  component: LogsPage,
});

function LogsPage() {
  const list = useServerFn(listScraperLogs);
  const { data, isLoading } = useQuery({ queryKey: ["scraper-logs"], queryFn: () => list() });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader eyebrow="Lead Scraper IA" title="Logs & Auditoria" description="Trilha completa de eventos do módulo — pesquisas, enriquecimentos, exportações e automações." />

      <SectionCard title="Eventos recentes">
        {isLoading ? <Skeleton className="h-40 w-full" /> : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum log registrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at!).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="secondary">{l.kind}</Badge></TableCell>
                  <TableCell className="text-sm">{l.message ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">{JSON.stringify(l.metadata ?? {})}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </motion.div>
  );
}
