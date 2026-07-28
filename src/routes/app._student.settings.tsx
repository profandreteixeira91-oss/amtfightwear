import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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
