import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { listAdsAccounts, syncMetaAdAccounts } from "@/lib/ads/ads.functions";
import { getMetaConnection } from "@/lib/meta.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/connections")({
  head: () => ({ meta: [{ title: "Conexão Meta Ads — Tráfego Pago IA" }] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAdsAccounts);
  const sync = useServerFn(syncMetaAdAccounts);
  const getConn = useServerFn(getMetaConnection);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["ads", "accounts"],
    queryFn: () => list(),
  });
  const { data: meta } = useQuery({
    queryKey: ["ads", "meta-conn"],
    queryFn: () => getConn(),
  });

  const syncMut = useMutation({
    mutationFn: () => sync(),
    onSuccess: (r) => {
      toast.success(`${r.synced} contas sincronizadas`);
      qc.invalidateQueries({ queryKey: ["ads", "accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="Tráfego Pago IA"
        title="Conexão Meta Ads"
        description="Contas de anúncio, pixels e permissões para publicar campanhas automaticamente."
        actions={
          <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending || !meta}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Sincronizar contas
          </Button>
        }
      />

      <SectionCard title="Conexão Meta principal">
        {!meta ? (
          <EmptyState
            icon={Plug}
            title="Nenhuma conta Meta conectada"
            description="Vá em Instagram Hub → Conta Conectada para autorizar o app."
            action={<Button asChild size="sm"><Link to="/instagram/account">Conectar Meta</Link></Button>}
          />
        ) : (
          <div className="flex items-center gap-3 text-sm">
            {meta.page_picture_url && <img src={meta.page_picture_url} alt="" className="h-10 w-10 rounded-full" />}
            <div>
              <div className="font-semibold">{meta.page_name}</div>
              <div className="text-xs text-muted-foreground">
                Instagram: @{meta.instagram_username ?? "—"} · Status: {meta.status}
              </div>
            </div>
            <Badge className="ml-auto gap-1"><CheckCircle2 className="h-3 w-3" /> Ativa</Badge>
          </div>
        )}
      </SectionCard>

      <div className="mt-4">
        <SectionCard title="Contas de anúncio (act_)" description="Sincronizadas via Graph API /me/adaccounts">
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : !accounts || accounts.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="Nenhuma conta sincronizada"
              description="Clique em Sincronizar contas acima após conectar seu Meta Business."
            />
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.act_id} · {a.currency ?? ""} · {a.timezone ?? ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.pixel_id ? <Badge variant="secondary">Pixel: {a.pixel_id}</Badge> : <Badge variant="outline">Sem pixel</Badge>}
                    <Badge>{a.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
