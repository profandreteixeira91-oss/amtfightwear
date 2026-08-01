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
import { getDirectMetaAccount, syncDirectMetaAdAccounts } from "@/lib/ads/meta-ads-direct.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/anuncios/conexoes")({
  head: () => ({ meta: [{ title: "Conexão Meta Ads — Tráfego Pago IA" }] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAdsAccounts);
  const sync = useServerFn(syncMetaAdAccounts);
  const getConn = useServerFn(getMetaConnection);
  const getDirect = useServerFn(getDirectMetaAccount);
  const syncDirect = useServerFn(syncDirectMetaAdAccounts);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["ads", "accounts"],
    queryFn: () => list(),
  });
  const { data: meta } = useQuery({
    queryKey: ["ads", "meta-conn"],
    queryFn: () => getConn(),
  });

  const { data: direct, isLoading: loadingDirect, error: directError } = useQuery({
    queryKey: ["ads", "direct-account"],
    queryFn: () => getDirect(),
    retry: false,
  });

  const syncDirectMut = useMutation({
    mutationFn: () => syncDirect(),
    onSuccess: (r) => {
      toast.success(`${r.synced} conta(s) de anúncio sincronizada(s)`);
      qc.invalidateQueries({ queryKey: ["ads", "accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
          <Button
            onClick={() => (direct ? syncDirectMut.mutate() : syncMut.mutate())}
            disabled={syncDirectMut.isPending || syncMut.isPending || (!meta && !direct)}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncDirectMut.isPending || syncMut.isPending ? "animate-spin" : ""}`}
            />
            Sincronizar contas
          </Button>
        }
      />

      <SectionCard
        title="Ads Manager (token de sistema)"
        description="Conexão direta com a Graph API usando as credenciais configuradas no servidor."
      >
        {loadingDirect ? (
          <Skeleton className="h-20" />
        ) : direct ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Conta</div>
              <div className="font-semibold">{direct.name}</div>
              <div className="text-xs text-muted-foreground">{direct.id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge className="gap-1 mt-1" variant={direct.status === "active" ? "default" : "outline"}>
                <CheckCircle2 className="h-3 w-3" />
                {direct.status === "active" ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Investido</div>
              <div className="font-semibold">
                {direct.spent.toLocaleString("pt-BR", { style: "currency", currency: direct.currency || "BRL" })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Fuso / Moeda</div>
              <div className="font-semibold">{direct.timezone} · {direct.currency}</div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="Token de sistema indisponível"
            description={(directError as Error | null)?.message ?? "Configure as credenciais da Meta Ads API no servidor."}
          />
        )}
      </SectionCard>

      <div className="mt-4" />

      <SectionCard title="Conexão Meta principal">
        {!meta ? (
          <EmptyState
            icon={Plug}
            title="Nenhuma conta Meta conectada"
            description="Vá em Instagram Hub → Conta Conectada para autorizar o app."
            action={<Button asChild size="sm"><Link to="/admin/instagram/conta">Conectar Meta</Link></Button>}
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
