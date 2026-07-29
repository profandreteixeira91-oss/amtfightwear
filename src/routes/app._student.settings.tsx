import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { studentSupabase as supabase } from "@/lib/student-auth/student-client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { LogOut, KeyRound, Bell, BellOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getVapidPublicKey, subscribeMyPush, unsubscribeMyPush } from "@/lib/student/push.functions";
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  subscriptionToPayload,
} from "@/lib/pwa/push-client";

export const Route = createFileRoute("/app/_student/settings")({
  head: () => ({ meta: [{ title: "Configurações — Portal do Aluno" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Push notifications
  const getKey = useServerFn(getVapidPublicKey);
  const sub = useServerFn(subscribeMyPush);
  const unsub = useServerFn(unsubscribeMyPush);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");

  useEffect(() => {
    if (!isPushSupported()) return;
    setPushSupported(true);
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    void getCurrentSubscription().then((s) => setPushActive(!!s));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushActive) {
        const s = await getCurrentSubscription();
        if (s) {
          await unsub({ data: { endpoint: s.endpoint } });
          await s.unsubscribe();
        }
        setPushActive(false);
        toast.success("Notificações desativadas");
      } else {
        const { key } = await getKey({});
        if (!key) {
          toast.error("Servidor sem chave VAPID configurada");
          return;
        }
        const s = await subscribePush(key);
        if (!s) {
          toast.error("Permissão de notificação negada", {
            description: "Habilite as notificações nas configurações do navegador/celular.",
          });
          if (typeof Notification !== "undefined") setPermission(Notification.permission);
          return;
        }
        await sub({ data: subscriptionToPayload(s) });
        setPushActive(true);
        if (typeof Notification !== "undefined") setPermission(Notification.permission);
        toast.success("Notificações ativadas");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao alterar notificações");
    } finally {
      setPushBusy(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Senha muito curta");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) toast.error("Falha", { description: error.message });
    else {
      toast.success("Senha atualizada");
      setNewPassword("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/app/login", replace: true });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Configurações</h1>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {pushActive ? <Bell className="h-4 w-4 text-red-600" /> : <BellOff className="h-4 w-4" />}
          Notificações push
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Receba avisos da academia, lembretes de vencimento e novidades diretamente no seu celular.
        </p>

        {!pushSupported ? (
          <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 ring-1 ring-neutral-100">
            Este dispositivo/navegador não suporta notificações push. Para melhor experiência,
            instale o app no seu celular.
          </div>
        ) : (
          <>
            <button
              onClick={togglePush}
              disabled={pushBusy || permission === "denied"}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-md transition disabled:opacity-60 ${
                pushActive
                  ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  : "text-white"
              }`}
              style={pushActive ? undefined : { background: "var(--sa-primary, #dc2626)" }}
            >
              {pushActive ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {pushBusy
                ? "Aguarde…"
                : pushActive
                  ? "Desativar notificações"
                  : "Ativar notificações"}
            </button>
            {permission === "denied" && (
              <p className="mt-2 text-xs text-red-600">
                As notificações estão bloqueadas nas configurações do navegador. Libere a
                permissão para este site e tente novamente.
              </p>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4" /> Alterar senha
        </h2>
        <form onSubmit={updatePassword} className="mt-3 space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nova senha (mín. 6 caracteres)"
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
            style={{ background: "var(--sa-primary, #dc2626)" }}
          >
            {saving ? "Salvando…" : "Atualizar senha"}
          </button>
        </form>
      </section>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white p-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" /> Sair do aplicativo
      </button>
    </div>
  );
}
