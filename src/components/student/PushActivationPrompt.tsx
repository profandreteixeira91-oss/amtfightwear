import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import { getVapidPublicKey, subscribeMyPush } from "@/lib/student/push.functions";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  subscriptionToPayload,
} from "@/lib/pwa/push-client";

const STORAGE_KEY = "student_push_prompt_v1";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari
  const ios = (window.navigator as any).standalone === true;
  return !!(mm || ios);
}

/** Ao abrir o app instalado (PWA), pede permissão de notificação imediatamente. */
export function PushActivationPrompt() {
  const getKey = useServerFn(getVapidPublicKey);
  const sub = useServerFn(subscribeMyPush);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) return;
      if (!isStandalone()) return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "granted") {
        // Já concedido — garantir que existe assinatura
        const existing = await getCurrentSubscription();
        if (existing) return;
      } else if (Notification.permission === "denied") {
        return;
      }
      if (localStorage.getItem(STORAGE_KEY) === "dismissed") return;
      if (!cancelled) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function activate() {
    setBusy(true);
    try {
      const { key } = await getKey({});
      if (!key) {
        toast.error("Servidor sem chave de notificações configurada");
        return;
      }
      const s = await subscribePush(key);
      if (!s) {
        toast.error("Permissão de notificação negada");
        localStorage.setItem(STORAGE_KEY, "dismissed");
        setOpen(false);
        return;
      }
      await sub({ data: subscriptionToPayload(s) });
      toast.success("Notificações ativadas!");
      localStorage.setItem(STORAGE_KEY, "activated");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível ativar as notificações");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="relative flex items-center justify-center px-6 py-8"
          style={{ background: "var(--sa-primary, #dc2626)" }}
        >
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white/15 ring-4 ring-white/20">
            <Bell className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="space-y-4 px-6 py-6 text-center">
          <h2 className="text-xl font-bold text-neutral-900">Ativar notificações</h2>
          <p className="text-sm leading-relaxed text-neutral-600">
            Receba avisos importantes da sua academia: novos comunicados, lembretes de aulas,
            graduações e cobranças. Você pode desativar quando quiser.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={activate}
              disabled={busy}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--sa-primary, #dc2626)" }}
            >
              {busy ? "Ativando..." : "Ativar agora"}
            </button>
            <button
              onClick={dismiss}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
