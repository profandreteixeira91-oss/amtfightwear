import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Instagram, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Unplug, Facebook, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getIgAccount, syncIgProfile, syncIgMedia } from "@/lib/ig-hub.functions";
import { getMetaConnection, disconnectMeta, getMetaAuthUrl } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/instagram/account")({
  component: IgAccount,
});

function IgAccount() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getIgAccount);
  const syncProfile = useServerFn(syncIgProfile);
  const syncMedia = useServerFn(syncIgMedia);
  const fetchMetaConn = useServerFn(getMetaConnection);
  const disconnectFn = useServerFn(disconnectMeta);
  const authUrlFn = useServerFn(getMetaAuthUrl);
  const { data, isLoading } = useQuery({ queryKey: ["ig-account"], queryFn: () => fetchAccount() });
  const { data: metaConn } = useQuery({ queryKey: ["meta-conn"], queryFn: () => fetchMetaConn() });

  const mSync = useMutation({
    mutationFn: async () => {
      await syncProfile();
      await syncMedia();
    },
    onSuccess: () => {
      toast.success("Sincronização concluída.");
      qc.invalidateQueries({ queryKey: ["ig-account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mDisconnect = useMutation({
    mutationFn: async (id: string) => disconnectFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conta Meta desconectada.");
      qc.invalidateQueries({ queryKey: ["ig-account"] });
      qc.invalidateQueries({ queryKey: ["meta-conn"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mReconnect = useMutation({
    mutationFn: async () => authUrlFn(),
    onSuccess: (r: { url: string }) => {
      window.location.href = r.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const acc = data?.account;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Conta do Instagram"
        description="Perfil oficial conectado via Meta Business. Sincronize sob demanda ou aguarde o job automático."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => mReconnect.mutate()}
              disabled={mReconnect.isPending}
            >
              {mReconnect.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Facebook className="mr-2 h-4 w-4" />}
              Reconectar Meta
            </Button>
            {metaConn && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm("Desconectar a conta Meta? As sincronizações vão parar até reconectar.")) {
                    mDisconnect.mutate(metaConn.id);
                  }
                }}
                disabled={mDisconnect.isPending}
              >
                <Unplug className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            )}
            <Button onClick={() => mSync.mutate()} disabled={mSync.isPending || !data?.hasConnection}>
              <RefreshCw className={`mr-2 h-4 w-4 ${mSync.isPending ? "animate-spin" : ""}`} />
              Sincronizar agora
            </Button>
          </div>
        }
      />


      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.hasConnection ? (
        <SectionCard title="">
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <b>Nenhuma conta Meta ativa.</b>
              <p className="text-muted-foreground mt-1">
                Acesse <a href="/market/connections" className="underline">Conexões e APIs</a> para conectar sua conta do Facebook e vincular o Instagram Business.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex flex-col items-center gap-3">
              {acc?.profile_picture_url ? (
                <img src={acc.profile_picture_url} alt={acc.username ?? ""} className="h-32 w-32 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="grid h-32 w-32 place-items-center rounded-full bg-muted">
                  <Instagram className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </Badge>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-2xl font-bold">{acc?.name ?? "—"}</div>
                <div className="text-muted-foreground">@{acc?.username ?? "—"}</div>
              </div>
              {acc?.biography && <p className="text-sm">{acc.biography}</p>}
              {acc?.website && (
                <a href={acc.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  {acc.website} <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <Stat label="Seguidores" value={acc?.followers_count ?? 0} />
                <Stat label="Segue" value={acc?.follows_count ?? 0} />
                <Stat label="Publicações" value={acc?.media_count ?? 0} />
              </div>
              {acc?.category && <div className="text-xs text-muted-foreground">Categoria: {acc.category}</div>}
              <div className="text-xs text-muted-foreground">
                Última sincronização: {acc?.last_synced_at ? new Date(acc.last_synced_at).toLocaleString("pt-BR") : "nunca"}
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
