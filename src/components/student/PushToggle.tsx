import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { getVapidPublicKey, subscribeMyPush, unsubscribeMyPush } from "@/lib/student/push.functions";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  subscriptionToPayload,
} from "@/lib/pwa/push-client";

/** Botão compacto para ativar/desativar notificações push no App do Aluno. */
export function PushToggle() {
  const getKey = useServerFn(getVapidPublicKey);
  const sub = useServerFn(subscribeMyPush);
  const unsub = useServerFn(unsubscribeMyPush);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    void getCurrentSubscription().then((s) => setActive(!!s));
  }, []);

  if (!supported) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (active) {
        const s = await getCurrentSubscription();
        if (s) {
          await unsub({ data: { endpoint: s.endpoint } });
          await s.unsubscribe();
        }
        setActive(false);
        toast.success("Notificações desativadas");
      } else {
        const { key } = await getKey({});
        if (!key) return toast.error("Servidor sem chave VAPID configurada");
        const s = await subscribePush(key);
        if (!s) return toast.error("Permissão de notificação negada");
        await sub({ data: subscriptionToPayload(s) });
        setActive(true);
        toast.success("Notificações ativadas");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao alterar notificações");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
      aria-label={active ? "Desativar notificações" : "Ativar notificações"}
      title={active ? "Notificações ativas" : "Ativar notificações"}
    >
      {active ? <Bell className="h-5 w-5 text-red-600" /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}
