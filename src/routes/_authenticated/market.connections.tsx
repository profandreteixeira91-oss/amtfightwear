import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plug,
  Facebook,
  Instagram,
  ShieldCheck,
  KeyRound,
  Send,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/market/connections")({
  head: () => ({ meta: [{ title: "Conexões e APIs — AMT MarketEngine" }] }),
  component: ConnectionsPage,
});

type MetaAsset = {
  id: string;
  name: string;
  type: "page" | "instagram";
  followers: string;
  avatar: string;
};

const AVAILABLE_ASSETS: MetaAsset[] = [
  {
    id: "pg-amt",
    name: "AMT Fight Wear",
    type: "page",
    followers: "48.2k",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=AMT&backgroundColor=b91c1c",
  },
  {
    id: "pg-atacado",
    name: "AMT Atacado — Academias",
    type: "page",
    followers: "6.1k",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=AT&backgroundColor=7f1d1d",
  },
  {
    id: "ig-amt",
    name: "@amtfightwear",
    type: "instagram",
    followers: "112k",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=IG&backgroundColor=be123c",
  },
  {
    id: "ig-team",
    name: "@amt.teamoficial",
    type: "instagram",
    followers: "24.7k",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TM&backgroundColor=991b1b",
  },
];

type LogRow = {
  id: string;
  event: string;
  platform: "instagram" | "facebook";
  timestamp: string;
  status: number;
  latency: string;
};

const INITIAL_LOGS: LogRow[] = [
  { id: "l1", event: "post_publish", platform: "instagram", timestamp: "01/07/2026 14:22", status: 200, latency: "482ms" },
  { id: "l2", event: "story_publish", platform: "instagram", timestamp: "01/07/2026 13:58", status: 200, latency: "391ms" },
  { id: "l3", event: "ad_creative_sync", platform: "facebook", timestamp: "01/07/2026 12:41", status: 200, latency: "1.2s" },
  { id: "l4", event: "lead_form_fetch", platform: "facebook", timestamp: "01/07/2026 11:15", status: 200, latency: "228ms" },
  { id: "l5", event: "post_publish", platform: "facebook", timestamp: "30/06/2026 22:03", status: 429, latency: "—" },
  { id: "l6", event: "insights_pull", platform: "instagram", timestamp: "30/06/2026 20:47", status: 200, latency: "612ms" },
  { id: "l7", event: "comment_reply", platform: "instagram", timestamp: "30/06/2026 18:12", status: 200, latency: "173ms" },
];

function ConnectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authStep, setAuthStep] = useState<"idle" | "loading" | "select">("idle");
  const [selected, setSelected] = useState<Record<string, boolean>>({
    "pg-amt": true,
    "ig-amt": true,
  });
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>(INITIAL_LOGS);

  const openMetaFlow = () => {
    setDialogOpen(true);
    setAuthStep("loading");
    setTimeout(() => setAuthStep("select"), 1400);
  };

  const finalizeConnection = () => {
    const picked = AVAILABLE_ASSETS.filter((a) => selected[a.id]);
    if (picked.length === 0) {
      toast.error("Selecione ao menos uma página ou conta Instagram.");
      return;
    }
    setConnected(true);
    setDialogOpen(false);
    setAuthStep("idle");
    toast.success(`${picked.length} ativo(s) conectados via Meta Business.`);
  };

  const connectedAssets = AVAILABLE_ASSETS.filter((a) => selected[a.id] && connected);

  const runWebhookTest = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      const newLog: LogRow = {
        id: `l${Date.now()}`,
        event: "webhook_test",
        platform: "facebook",
        timestamp: new Date().toLocaleString("pt-BR"),
        status: 200,
        latency: `${Math.floor(200 + Math.random() * 400)}ms`,
      };
      setLogs((l) => [newLog, ...l]);
      toast.success("Webhook enviado com sucesso — 200 OK.");
    }, 1600);
  };

  return (
    <>
      <PageHeader
        eyebrow="MarketEngine"
        title="Conexões e APIs"
        description="Integre suas contas Meta Business, monitore tokens e acompanhe os disparos automatizados."
        actions={
          <Badge variant="secondary" className="gap-1">
            <Plug className="h-3 w-3" /> {connected ? "1 integração ativa" : "Nenhuma integração"}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Meta Business Card */}
        <SectionCard title="Meta Business Integration" className="lg:col-span-2">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#1877F2]/15 text-[#1877F2]">
                  <Facebook className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Instagram & Facebook</div>
                  <div className="text-xs text-muted-foreground">
                    Publique posts, sincronize criativos e capture leads via Graph API.
                  </div>
                </div>
              </div>

              {connected ? (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
                </Badge>
              ) : (
                <Button
                  onClick={openMetaFlow}
                  className="gap-2 bg-[#1877F2] text-white hover:bg-[#1668d8]"
                >
                  <Facebook className="h-4 w-4" />
                  Conectar via Facebook Login
                </Button>
              )}
            </div>

            <AnimatePresence>
              {connectedAssets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-2"
                >
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Ativos conectados
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {connectedAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 rounded-md border border-border/60 bg-card p-3"
                      >
                        <img
                          src={asset.avatar}
                          alt={asset.name}
                          className="h-10 w-10 rounded-full ring-2 ring-emerald-500/40"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {asset.type === "instagram" ? (
                              <Instagram className="h-3.5 w-3.5 text-pink-500" />
                            ) : (
                              <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
                            )}
                            {asset.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {asset.followers} seguidores
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setConnected(false);
                      toast.info("Integração desconectada.");
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refazer conexão
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>

        {/* Token / Webhook Monitor */}
        <SectionCard title="Monitor de Webhooks & Tokens">
          <div className="space-y-5">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Graph API Token
                </div>
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3" /> Válido
                </Badge>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Expira em 60 dias</span>
                  <span className="font-mono">30/08/2026</span>
                </div>
                <Progress value={82} className="h-1.5" />
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
                <span className="truncate">EAAG•••••••••••••ZDkm9x2vQ</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Webhook className="h-4 w-4 text-primary" />
                Teste de Webhook
              </div>
              <div className="space-y-2">
                <Label htmlFor="hook-url" className="text-xs">Endpoint</Label>
                <Input
                  id="hook-url"
                  defaultValue="https://graph.facebook.com/v20.0/me/messages"
                  className="font-mono text-xs"
                />
              </div>
              <Button
                onClick={runWebhookTest}
                disabled={testing || !connected}
                className="w-full gap-2"
                variant="secondary"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando payload...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Enviar teste
                  </>
                )}
              </Button>
              {!connected && (
                <p className="text-[11px] text-muted-foreground">
                  Conecte uma conta Meta para habilitar o teste.
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Logs */}
      <div className="mt-4">
        <SectionCard title="Logs de Automação — Meta API">
          <div className="overflow-hidden rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Evento</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Latência</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/40 last:border-0"
                  >
                    <TableCell className="font-mono text-xs">{log.event}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        {log.platform === "instagram" ? (
                          <>
                            <Instagram className="h-3.5 w-3.5 text-pink-500" />
                            Instagram
                          </>
                        ) : (
                          <>
                            <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
                            Facebook
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.timestamp}</TableCell>
                    <TableCell className="font-mono text-xs">{log.latency}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          log.status === 200
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                            : log.status >= 400 && log.status < 500
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                            : "border-red-500/40 bg-red-500/10 text-red-500"
                        }
                      >
                        {log.status} {log.status === 200 ? "OK" : log.status === 429 ? "Rate Limit" : ""}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>

      {/* Meta Auth Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-[#1877F2]" />
              Meta Business Login
            </DialogTitle>
            <DialogDescription>
              Selecione as Páginas do Facebook e contas Instagram que o AMT MarketEngine poderá gerenciar.
            </DialogDescription>
          </DialogHeader>

          {authStep === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Autenticando com Meta Graph API...</p>
            </div>
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto py-2">
              {AVAILABLE_ASSETS.map((asset) => (
                <label
                  key={asset.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border/60 p-3 transition hover:bg-muted/40"
                >
                  <Checkbox
                    checked={!!selected[asset.id]}
                    onCheckedChange={(v) =>
                      setSelected((s) => ({ ...s, [asset.id]: !!v }))
                    }
                  />
                  <img src={asset.avatar} alt={asset.name} className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {asset.type === "instagram" ? (
                        <Instagram className="h-3.5 w-3.5 text-pink-500" />
                      ) : (
                        <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
                      )}
                      {asset.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {asset.type === "instagram" ? "Conta Comercial" : "Página Facebook"} · {asset.followers}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={finalizeConnection}
              disabled={authStep !== "select"}
              className="gap-2 bg-[#1877F2] text-white hover:bg-[#1668d8]"
            >
              <CheckCircle2 className="h-4 w-4" /> Autorizar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
