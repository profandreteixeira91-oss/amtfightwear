import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, XCircle, Shield } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getIgAdminInfo, subscribeIgWebhook } from "@/lib/ig-hub.functions";

export const Route = createFileRoute("/_authenticated/instagram/admin")({
  component: IgAdmin,
});

function IgAdmin() {
  const fn = useServerFn(getIgAdminInfo);
  const subscribeFn = useServerFn(subscribeIgWebhook);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["ig-admin"], queryFn: () => fn() });

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast.success("Copiado.");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader title="Administração do Instagram Hub" description="Conexões, logs e configuração do webhook oficial." />

      <SectionCard title="Webhook oficial Meta">
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            Configure no <b>Meta App → Instagram → Webhooks</b> subscrevendo aos campos: <code>messages</code>, <code>messaging_postbacks</code>, <code>comments</code>, <code>mentions</code>.
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2 font-mono text-xs">
            <span className="flex-1 truncate">{data?.webhookUrl ?? "—"}</span>
            <Button size="sm" variant="ghost" onClick={() => data && copy(data.webhookUrl)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <b>Verify token:</b> valor do secret <code>META_VERIFY_TOKEN</code>.
          </div>
          <div className="pt-2">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const r = await subscribeFn();
                  toast.success("Webhook assinado com sucesso na página do Facebook.");
                  console.log("subscribe result", r);
                  refetch();
                } catch (e: any) {
                  toast.error(e?.message ?? "Falha ao assinar webhook");
                }
              }}
            >
              Ativar webhook Instagram
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Conexões Meta">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (data?.connections ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma conexão ativa.</div>
        ) : (
          <div className="divide-y">
            {(data?.connections ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-3 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">@{c.instagram_username ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    Status: {c.status}
                    {c.token_expires_at && ` · Token expira em ${new Date(c.token_expires_at).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                <Badge variant={c.status === "active" ? "default" : "destructive"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Últimas sincronizações">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (data?.syncLogs ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem registros ainda.</div>
        ) : (
          <div className="divide-y text-xs">
            {(data?.syncLogs ?? []).map((l: any) => (
              <div key={l.id} className="flex items-center gap-2 py-2">
                {l.status === "success" ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-destructive" />}
                <span className="text-muted-foreground w-40">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <Badge variant="outline">{l.sync_type}</Badge>
                <span>{l.items_count ?? 0} itens</span>
                {l.duration_ms && <span className="text-muted-foreground">· {l.duration_ms}ms</span>}
                {l.error && <span className="text-destructive truncate">· {l.error}</span>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Últimos webhooks recebidos">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (data?.webhookLogs ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum webhook recebido ainda.</div>
        ) : (
          <div className="divide-y text-xs">
            {(data?.webhookLogs ?? []).map((l: any) => (
              <div key={l.id} className="flex items-center gap-2 py-2">
                {l.signature_valid ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-destructive" />}
                <span className="text-muted-foreground w-40">{new Date(l.received_at).toLocaleString("pt-BR")}</span>
                <Badge variant="outline">{l.event_type ?? "—"}</Badge>
                <span className="truncate">{l.entry_id ?? ""}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
