import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
import { listCampaigns } from "@/lib/ads/ads.functions";
import { brl } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/anuncios/campanhas")({
  head: () => ({ meta: [{ title: "Campanhas — Tráfego Pago IA" }] }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const fn = useServerFn(listCampaigns);
  const { data, isLoading } = useQuery({
    queryKey: ["ads", "campaigns"],
    queryFn: () => fn(),
  });

  return (
    <>
      <PageHeader eyebrow="Tráfego Pago IA" title="Campanhas" description="Rascunhos e campanhas geradas com IA." />
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Rocket} title="Nenhuma campanha ainda" description="Crie sua primeira campanha em Nova Campanha IA." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orç. diário</TableHead>
                <TableHead>Publicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <Link to="/admin/anuncios/campanhas/$id" params={{ id: c.id }} className="hover:underline">{c.name}</Link>
                  </TableCell>
                  <TableCell>{c.objective}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-right">{c.budget_daily ? brl(Number(c.budget_daily)) : "—"}</TableCell>
                  <TableCell>{c.meta_campaign_id ? <Badge variant="outline" className="text-[10px]">Meta</Badge> : <Badge variant="secondary" className="text-[10px]">Rascunho</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
