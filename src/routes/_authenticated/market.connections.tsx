import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Facebook, Instagram, ExternalLink, Copy, Check, Loader2, ShieldCheck, Unplug } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getMetaAuthUrl, getMetaConnection, disconnectMeta } from "@/lib/meta.functions";

export const Route = createFileRoute("/_authenticated/market/connections")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Conexões e APIs" }] }),
  component: ConnectionsPage,
});

const REDIRECT_URI = "https://marketing.amtfightwear.com.br/api/public/meta/callback";

function ConnectionsPage() {
  const qc = useQueryClient();
  const fetchConnection = useServerFn(getMetaConnection);
  const authUrlFn = useServerFn(getMetaAuthUrl);
  const disconnectFn = useServerFn(disconnectMeta);
  const [copied, setCopied] = useState(false);

  const { data: conn, isLoading } = useQuery({
    queryKey: ["meta-connection"],
    queryFn: () => fetchConnection(),
    refetchInterval: 15000,
  });

  const connectMutation = useMutation({
    mutationFn: () => authUrlFn(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error("Falha ao iniciar OAuth", { description: e.message }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conexão removida");
      qc.invalidateQueries({ queryKey: ["meta-connection"] });
    },
  });

  const copyRedirect = () => {
    navigator.clipboard.writeText(REDIRECT_URI);
    setCopied(true);
    toast.success("URL de redirect copiada");
    setTimeout(() => setCopied(false), 2000);
  };

  const expiresIn = conn?.token_expires_at
    ? Math.max(0, Math.floor((new Date(conn.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Conexões e APIs"
        description="Integre o AMT MarketEngine com Meta (Facebook + Instagram) via Graph API."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Meta Business (Facebook & Instagram)">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1"><Facebook className="h-3 w-3" /> Facebook Pages</Badge>
              <Badge variant="outline" className="gap-1"><Instagram className="h-3 w-3" /> Instagram Business</Badge>
              {isLoading ? (
                <Badge variant="secondary">Verificando…</Badge>
              ) : conn ? (
                <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                  <ShieldCheck className="h-3 w-3" /> Conectado
                </Badge>
              ) : (
                <Badge variant="secondary">Não conectado</Badge>
              )}
            </div>

            {conn ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-3">
                  {conn.page_picture_url ? (
                    <img src={conn.page_picture_url} alt={conn.page_name} className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                  <div>
                    <div className="font-medium">{conn.page_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {conn.instagram_username ? `@${conn.instagram_username} · IG Business` : "Sem Instagram vinculado"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Token expira em {expiresIn} dias</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-destructive hover:text-destructive"
                    disabled={disconnectMutation.isPending}
                    onClick={() => disconnectMutation.mutate(conn.id)}
                  >
                    <Unplug className="h-3 w-3" /> Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Autorize o AMT MarketEngine a acessar suas Páginas do Facebook e Contas Instagram Business.
                O token de longa duração (~60 dias) é armazenado com segurança no backend.
              </p>
            )}

            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="w-full gap-2 bg-[#1877F2] hover:bg-[#166FE0] text-white"
            >
              {connectMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Preparando…</>
              ) : (
                <><Facebook className="h-4 w-4" /> {conn ? "Reconectar / Adicionar Página" : "Conectar via Facebook Login"}</>
              )}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Configuração no Meta for Developers" delay={0.1}>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Cole exatamente esta URL em <b>Facebook Login for Business → Configurações → URIs de redirecionamento OAuth válidos</b>:
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 font-mono text-xs">
              <code className="flex-1 break-all">{REDIRECT_URI}</code>
              <Button size="sm" variant="ghost" onClick={copyRedirect} className="h-7 shrink-0">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs space-y-1.5">
              <div className="font-medium text-foreground">Checklist rápido:</div>
              <div>✅ App Business criado</div>
              <div>✅ App ID e Secret salvos como secrets</div>
              <div>⚠️ Adicionar redirect URI acima no painel Meta</div>
              <div>⚠️ Adicionar seus produtos: Facebook Login for Business + Instagram + Webhooks</div>
              <div>⚠️ Vincular Página AMT + IG Business no business.facebook.com</div>
            </div>
            <Button variant="outline" asChild className="gap-1 w-full">
              <a href="https://developers.facebook.com/apps/971201715885507/fb-login/settings/" target="_blank" rel="noreferrer">
                Abrir configurações do App <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
