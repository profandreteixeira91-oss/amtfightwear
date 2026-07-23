import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Download, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { registerPwa } from "@/lib/pwa/register";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  subscriptionToPayload,
} from "@/lib/pwa/push-client";
import {
  getAdminPushPublicKey,
  listMyAdminPushSubscriptions,
  removeAdminPushSubscription,
  saveAdminPushSubscription,
  sendAdminPushTest,
} from "@/lib/store/admin-push.functions";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Card premium para gerenciar instalação do PWA e notificações push do admin. */
export function AdminPushCard() {
  const qc = useQueryClient();
  const getPublicKey = useServerFn(getAdminPushPublicKey);
  const listSubs = useServerFn(listMyAdminPushSubscriptions);
  const saveSub = useServerFn(saveAdminPushSubscription);
  const removeSub = useServerFn(removeAdminPushSubscription);
  const testPush = useServerFn(sendAdminPushTest);

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    void registerPwa();
    // Troca o manifest para o do painel /store para permitir instalação branded.
    const existing = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    const previous = existing?.href ?? null;
    if (existing) existing.setAttribute("href", "/store-manifest.webmanifest");
    // Meta theme-color vermelho enquanto o card estiver montado.
    const theme = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    const prevTheme = theme?.getAttribute("content") ?? null;
    if (theme) theme.setAttribute("content", "#dc2626");
    return () => {
      if (existing && previous) existing.setAttribute("href", previous);
      if (theme && prevTheme) theme.setAttribute("content", prevTheme);
    };
  }, []);

  useEffect(() => {
    if (!isPushSupported()) return;
    void getCurrentSubscription().then((s) => setCurrentEndpoint(s?.endpoint ?? null));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const setInst = () => setIsInstalled(!!mql?.matches || (navigator as any).standalone === true);
    setInst();
    mql?.addEventListener?.("change", setInst);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mql?.removeEventListener?.("change", setInst);
    };
  }, []);

  const subsQuery = useQuery({
    queryKey: ["admin-push-subs"],
    queryFn: () => listSubs(),
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error("Este navegador não suporta notificações push.");
      await registerPwa();
      const { publicKey } = await getPublicKey();
      const sub = await subscribePush(publicKey);
      if (!sub) throw new Error("Permissão de notificação negada.");
      const payload = subscriptionToPayload(sub);
      await saveSub({
        data: {
          endpoint: payload.endpoint,
          p256dh: payload.p256dh,
          auth: payload.auth,
          userAgent: payload.user_agent ?? null,
        },
      });
      setCurrentEndpoint(sub.endpoint);
      setPermission(Notification.permission);
    },
    onSuccess: () => {
      toast.success("Notificações ativadas neste dispositivo.");
      qc.invalidateQueries({ queryKey: ["admin-push-subs"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao ativar notificações."),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const sub = await getCurrentSubscription();
      if (!sub) return;
      await sub.unsubscribe().catch(() => {});
      await removeSub({ data: { endpoint: sub.endpoint } });
      setCurrentEndpoint(null);
    },
    onSuccess: () => {
      toast.success("Notificações desativadas neste dispositivo.");
      qc.invalidateQueries({ queryKey: ["admin-push-subs"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Não foi possível desativar."),
  });

  const testMutation = useMutation({
    mutationFn: () => testPush(),
    onSuccess: (r: any) => {
      if (r?.sent > 0) toast.success("Push de teste enviado — confira a notificação.");
      else toast.error("Nenhum dispositivo inscrito recebeu o teste.");
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao enviar teste."),
  });

  const installApp = async () => {
    if (!installEvent) {
      toast.info(
        "No iPhone use o botão Compartilhar → Adicionar à Tela de Início. No Android, o navegador exibirá o prompt de instalação automaticamente.",
        { duration: 8000 },
      );
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") toast.success("Aplicativo instalado.");
    setInstallEvent(null);
  };

  const subs = subsQuery.data?.subscriptions ?? [];
  const enabled = !!currentEndpoint;
  const supported = isPushSupported();

  return (
    <Card className="border-red-500/20 bg-gradient-to-br from-red-950/40 via-neutral-950 to-neutral-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/15 p-2.5">
              <Bell className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-base">Aplicativo & Notificações Push</CardTitle>
              <p className="text-xs text-muted-foreground">
                Instale o painel no celular e receba alertas de vendas, chat e assinaturas em tempo real.
              </p>
            </div>
          </div>
          {enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={installApp}
            disabled={isInstalled}
          >
            <Download className="h-4 w-4" />
            {isInstalled ? "Aplicativo já instalado" : installEvent ? "Instalar aplicativo" : "Como instalar"}
          </Button>

          {enabled ? (
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
            >
              {disableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Desativar notificações
            </Button>
          ) : (
            <Button
              className="justify-start gap-2 bg-red-600 hover:bg-red-500"
              onClick={() => enableMutation.mutate()}
              disabled={!supported || enableMutation.isPending || permission === "denied"}
            >
              {enableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {permission === "denied" ? "Permissão bloqueada" : "Ativar notificações"}
            </Button>
          )}
        </div>

        {!supported && (
          <p className="text-xs text-amber-400">
            Este navegador não suporta Web Push. Use Chrome/Edge no Android ou Safari 16.4+ no iOS após instalar o app.
          </p>
        )}
        {permission === "denied" && (
          <p className="text-xs text-amber-400">
            Permissão bloqueada nas configurações do navegador. Libere as notificações e recarregue a página.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/30 p-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span>
              {subs.length} dispositivo{subs.length === 1 ? "" : "s"} inscrito
              {subs.length === 1 ? "" : "s"} nesta conta
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => testMutation.mutate()}
            disabled={!enabled || testMutation.isPending}
          >
            {testMutation.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Enviar teste
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
