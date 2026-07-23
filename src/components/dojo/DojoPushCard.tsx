import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Download, Loader2, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { registerPwa } from "@/lib/pwa/register";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  subscriptionToPayload,
} from "@/lib/pwa/push-client";
import {
  getOwnerPushPublicKey,
  listMyOwnerPushSubscriptions,
  sendOwnerPushTest,
  subscribeOwnerPush,
  unsubscribeOwnerPush,
  updateOwnerPushCategories,
} from "@/lib/dojo/owner-push.functions";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type CategoryKey =
  | "sales"
  | "enrollments"
  | "graduations"
  | "store_orders"
  | "support"
  | "system";

const CATEGORY_META: Array<{ key: CategoryKey; title: string; desc: string }> = [
  { key: "sales", title: "Vendas & Pagamentos", desc: "Novos pagamentos recebidos, vencimentos e inadimplência." },
  { key: "enrollments", title: "Matrículas & Alunos", desc: "Novos alunos, planos assinados e cancelamentos." },
  { key: "graduations", title: "Graduações & Presenças", desc: "Alunos aptos, aniversários e marcos técnicos." },
  { key: "store_orders", title: "Pedidos AMT Store", desc: "Novos pedidos e mudanças de status na loja." },
  { key: "support", title: "Suporte", desc: "Respostas do time AMT nos seus chamados." },
  { key: "system", title: "Sistema & AMT Pay", desc: "Saques, integrações e avisos importantes da conta." },
];

const DEFAULT_CATS: Record<CategoryKey, boolean> = {
  sales: true,
  enrollments: true,
  graduations: true,
  store_orders: true,
  support: true,
  system: true,
};

export function DojoPushCard() {
  const qc = useQueryClient();
  const getKey = useServerFn(getOwnerPushPublicKey);
  const listSubs = useServerFn(listMyOwnerPushSubscriptions);
  const sub = useServerFn(subscribeOwnerPush);
  const unsub = useServerFn(unsubscribeOwnerPush);
  const updateCats = useServerFn(updateOwnerPushCategories);
  const test = useServerFn(sendOwnerPushTest);

  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    void registerPwa();
    setSupported(isPushSupported());
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
    queryKey: ["dojo-owner-push-subs"],
    queryFn: () => listSubs(),
  });
  const subs: any[] = subsQuery.data?.subscriptions ?? [];
  const currentSub = subs.find((s) => s.endpoint === currentEndpoint) ?? null;
  const currentCats: Record<CategoryKey, boolean> = {
    ...DEFAULT_CATS,
    ...((currentSub?.categories ?? {}) as Record<CategoryKey, boolean>),
  };

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error("Este navegador não suporta notificações push.");
      await registerPwa();
      const { publicKey } = await getKey({});
      if (!publicKey) throw new Error("Servidor sem chave VAPID configurada.");
      const s = await subscribePush(publicKey);
      if (!s) throw new Error("Permissão de notificação negada.");
      const p = subscriptionToPayload(s);
      await sub({
        data: {
          endpoint: p.endpoint,
          p256dh: p.p256dh,
          auth: p.auth,
          user_agent: p.user_agent ?? null,
          device_label:
            typeof navigator !== "undefined"
              ? navigator.userAgent.includes("Mobile")
                ? "Celular"
                : "Computador"
              : null,
        },
      });
      setCurrentEndpoint(s.endpoint);
      setPermission(Notification.permission);
    },
    onSuccess: () => {
      toast.success("Notificações ativadas neste dispositivo.");
      qc.invalidateQueries({ queryKey: ["dojo-owner-push-subs"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao ativar notificações."),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const s = await getCurrentSubscription();
      if (!s) return;
      await unsub({ data: { endpoint: s.endpoint } });
      await s.unsubscribe().catch(() => {});
      setCurrentEndpoint(null);
    },
    onSuccess: () => {
      toast.success("Notificações desativadas neste dispositivo.");
      qc.invalidateQueries({ queryKey: ["dojo-owner-push-subs"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Não foi possível desativar."),
  });

  const toggleCat = useMutation({
    mutationFn: async (next: Record<CategoryKey, boolean>) => {
      await updateCats({
        data: {
          endpoint: currentEndpoint ?? undefined,
          categories: next,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojo-owner-push-subs"] }),
    onError: (err: any) => toast.error(err?.message ?? "Falha ao salvar preferências."),
  });

  const removeDevice = useMutation({
    mutationFn: (endpoint: string) => unsub({ data: { endpoint } }),
    onSuccess: () => {
      toast.success("Dispositivo removido.");
      qc.invalidateQueries({ queryKey: ["dojo-owner-push-subs"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => test({}),
    onSuccess: (r: any) => {
      if (r?.sent > 0) toast.success("Push de teste enviado — confira a notificação.");
      else toast.error("Nenhum dispositivo inscrito recebeu o teste.");
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao enviar teste."),
  });

  const installApp = async () => {
    if (!installEvent) {
      toast.info(
        "No iPhone: use Compartilhar → Adicionar à Tela de Início. No Android/Chrome, o navegador exibe o prompt automaticamente.",
        { duration: 8000 },
      );
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") toast.success("Aplicativo instalado.");
    setInstallEvent(null);
  };

  const enabled = !!currentEndpoint;

  return (
    <Card className="border-red-500/20 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-2.5">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base">Aplicativo & Notificações Push</CardTitle>
              <p className="text-xs text-muted-foreground">
                Instale o Dojo Manager como app e receba alertas em tempo real neste dispositivo.
              </p>
            </div>
          </div>
          {enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">Ativo</Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
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
              className="justify-start gap-2 bg-red-600 text-white hover:bg-red-500"
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
          <p className="text-xs text-amber-600">
            Este navegador não suporta Web Push. No iPhone é necessário instalar o app na Tela de Início (Safari 16.4+).
          </p>
        )}
        {permission === "denied" && (
          <p className="text-xs text-amber-600">
            Permissão bloqueada. Libere as notificações nas configurações do navegador e recarregue a página.
          </p>
        )}

        {enabled && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Categorias
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORY_META.map((c) => {
                const value = currentCats[c.key] !== false;
                return (
                  <label
                    key={c.key}
                    className="flex items-start justify-between gap-3 rounded-md border border-transparent bg-white px-3 py-2 hover:border-neutral-200"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-[11px] leading-snug text-neutral-500">{c.desc}</div>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(v) => {
                        const next = { ...currentCats, [c.key]: v };
                        toggleCat.mutate(next);
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-600">
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
            {testMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Enviar teste
          </Button>
        </div>

        {subs.length > 0 && (
          <div className="space-y-1.5">
            {subs.map((s) => {
              const isCurrent = s.endpoint === currentEndpoint;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {s.device_label || s.user_agent?.slice(0, 60) || "Dispositivo"}
                      {isCurrent && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          Este
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      Cadastrado em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                      {s.last_success_at &&
                        ` · último push ${new Date(s.last_success_at).toLocaleDateString("pt-BR")}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-neutral-500 hover:text-red-600"
                    onClick={() => removeDevice.mutate(s.endpoint)}
                    disabled={removeDevice.isPending}
                    aria-label="Remover dispositivo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
