import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, ArrowLeft, CheckCircle2, AlertTriangle, Smartphone } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getVapidPublicKey, subscribeMyPush, unsubscribeMyPush } from "@/lib/student/push.functions";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  subscriptionToPayload,
} from "@/lib/pwa/push-client";

export const Route = createFileRoute("/app/_student/notifications")({
  head: () => ({ meta: [{ title: "Notificações do app — Portal do Aluno" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const getKey = useServerFn(getVapidPublicKey);
  const sub = useServerFn(subscribeMyPush);
  const unsub = useServerFn(unsubscribeMyPush);

  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    void getCurrentSubscription().then((s) => setActive(!!s));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const { publicKey } = await getKey({});
      if (!publicKey) {
        toast.error("Notificações push ainda não configuradas.");
        return;
      }
      const s = await subscribePush(publicKey);
      if (!s) {
        toast.error("Não foi possível ativar as notificações.");
        return;
      }
      await sub({ data: subscriptionToPayload(s) });
      setActive(true);
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
      toast.success("Notificações ativadas ✓");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao ativar notificações");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const s = await getCurrentSubscription();
      if (s) {
        await unsub({ data: { endpoint: s.endpoint } });
        await s.unsubscribe();
      }
      setActive(false);
      toast.success("Notificações desativadas");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao desativar");
    } finally {
      setBusy(false);
    }
  }

  const blocked = permission === "denied";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4">
      <Link
        to="/app/home"
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-red-600 hover:text-red-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Início
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-red-500 to-red-700 text-white shadow-[0_8px_24px_-8px_rgba(220,38,38,0.9)]">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Notificações do app</h1>
          <p className="text-sm text-neutral-500">
            Receba avisos da sua academia direto no celular.
          </p>
        </div>
      </div>

      {/* Card principal */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900">Status</div>
            <div className="mt-1 text-xs text-neutral-500">
              {active
                ? "Você está recebendo notificações neste dispositivo."
                : "Notificações desativadas neste dispositivo."}
            </div>
          </div>
          <span
            className={
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold " +
              (active
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200")
            }
          >
            {active ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Ativas
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5" /> Desativadas
              </>
            )}
          </span>
        </div>

        {!supported && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Este dispositivo/navegador não suporta notificações push. Instale o app na tela inicial e abra pelo ícone
              para tentar novamente.
            </div>
          </div>
        )}

        {supported && blocked && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              As notificações foram bloqueadas neste navegador. Abra as configurações do site e permita notificações
              para ativar.
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {active ? (
            <button
              onClick={disable}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              <BellOff className="h-4 w-4" />
              {busy ? "Desativando…" : "Desativar notificações"}
            </button>
          ) : (
            <button
              onClick={enable}
              disabled={busy || !supported || blocked}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-600 to-red-800 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.9)] hover:from-red-500 hover:to-red-700 disabled:opacity-60"
            >
              <Bell className="h-4 w-4" />
              {busy ? "Ativando…" : "Ativar notificações"}
            </button>
          )}
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Smartphone className="h-4 w-4 text-red-600" /> Para receber melhor
        </div>
        <ul className="mt-3 space-y-2 text-xs text-neutral-600">
          <li>• Instale o app na tela inicial do celular (Adicionar à tela inicial).</li>
          <li>• Abra sempre pelo ícone do app para manter as notificações ativas.</li>
          <li>• No iPhone, é necessário instalar o app antes de ativar as notificações.</li>
          <li>• Se trocar de celular ou reinstalar, ative novamente por aqui.</li>
        </ul>
      </div>

      <p className="mt-4 text-center text-[11px] text-neutral-400">
        Você pode desativar as notificações a qualquer momento.
      </p>
    </div>
  );
}
