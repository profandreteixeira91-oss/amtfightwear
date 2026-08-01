import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Pause, Play, AlertCircle } from "lucide-react";
import { brl } from "@/lib/format";
import { listCampaigns } from "@/lib/ads/ads.functions";
import {
  getDirectMetaCampaigns,
  toggleDirectMetaCampaign,
} from "@/lib/ads/meta-ads-direct.functions";
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
  const queryClient = useQueryClient();
  const listLocal = useServerFn(listCampaigns);
  const listDirect = useServerFn(getDirectMetaCampaigns);

  const { data: realCampaigns, isLoading: isLoadingReal, error: realError } = useQuery({
    queryKey: ["ads", "direct-campaigns"],
    queryFn: () => listDirect(),
    retry: 1,
  });

  const { data: localCampaigns, isLoading: isLoadingLocal } = useQuery({
    queryKey: ["ads", "campaigns"],
    queryFn: () => listLocal(),
    enabled: !realCampaigns && !!realError,
  });

  const toggle = useMutation({
    mutationFn: toggleDirectMetaCampaign,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads", "direct-campaigns"] }),
  });

  const isReal = !!realCampaigns;
  const campaigns = (realCampaigns ?? localCampaigns ?? []) as Array<{
    id?: string;
    metaCampaignId?: string;
    name: string;
    objective: string;
    status: string;
    effectiveStatus?: string;
    dailyBudget?: number | null;
    budget_daily?: number | null;
  }>;
  const isLoading = isLoadingReal || (isLoadingLocal && !realCampaigns);

  return (
    <>
      <PageHeader
        eyebrow="Tráfego Pago IA"
        title="Campanhas"
        description={
          isReal
            ? "Campanhas reais da conta Meta Ads conectada."
            : "Rascunhos e campanhas geradas com IA."
        }
      />

      {realError && !realCampaigns && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Conta Meta não conectada. Exibindo campanhas locais.</span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="Nenhuma campanha ainda"
          description="Crie sua primeira campanha em Nova Campanha IA."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Orç. diário</TableHead>
                {isReal && <TableHead className="w-24 text-center">Ação</TableHead>}
                <TableHead>Publicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const campaignId = c.metaCampaignId ?? c.id ?? "";
                const isActive = (c.effectiveStatus ?? c.status).toLowerCase() === "active";
                const daily = c.dailyBudget ?? c.budget_daily;

                return (
                  <TableRow key={campaignId || c.name} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      {c.id ? (
                        <Link
                          to="/admin/anuncios/campanhas/$id"
                          params={{ id: c.id }}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      ) : (
                        c.name
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{c.objective.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "ativo" : "pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {daily ? brl(Number(daily)) : "—"}
                    </TableCell>
                    {isReal && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={toggle.isPending}
                          onClick={() =>
                            toggle.mutate({
                              data: { campaignId: campaignId, active: !isActive },
                            })
                          }
                          title={isActive ? "Pausar campanha" : "Ativar campanha"}
                        >
                          {isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    <TableCell>
                      {c.metaCampaignId ? (
                        <Badge variant="outline" className="text-[10px]">
                          Meta
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Rascunho
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
