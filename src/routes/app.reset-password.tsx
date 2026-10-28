import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { studentSupabase } from "@/lib/student-auth/student-client";
import { readRecoveryLinkError, translateRecoveryError } from "@/lib/student-auth/recovery";

export const Route = createFileRoute("/app/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — Portal do Aluno" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentResetPasswordPage,
});

function StudentResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    // Erro vindo do link (vencido/já usado) tem prioridade: nunca mostrar o
    // formulário com uma sessão antiga como se o link fosse válido.
    const err = readRecoveryLinkError(window.location.hash, window.location.search);
    if (err) {
      setLinkError(err);
      setReady(true);
      return;
    }
    const { data: sub } = studentSupabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
        setReady(true);
      }
    });
    studentSupabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sessões independentes: o Portal do Aluno usa `studentSupabase` (storageKey
  // próprio). Não lemos nem alteramos a sessão do painel administrativo aqui.

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres");
    if (password !== confirm) return toast.error("As senhas não conferem");
    setSaving(true);
    const { error } = await studentSupabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error("Erro ao redefinir senha", { description: translateRecoveryError(error.message) });
    toast.success("Senha atualizada com sucesso");
    navigate({ to: "/app/home", replace: true });
  }

  const canReset = hasSession && !linkError;

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#050505] p-6 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_60px_-25px_rgba(220,38,38,0.6)] backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-400">
          <ShieldCheck className="h-4 w-4" /> Portal do Aluno
        </div>
        <h1 className="text-xl font-bold">Redefinir senha</h1>
        <p className="mt-1 text-sm text-white/60">
          {hasSession
            ? "Escolha uma nova senha para acessar o Portal do Aluno."
            : "Link inválido ou expirado. Solicite um novo e-mail de recuperação."}
        </p>

        {hasSession ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha (mín. 8 caracteres)"
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
                tabIndex={-1}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-red-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar nova senha
            </button>
          </form>
        ) : (
          <button
            onClick={() => navigate({ to: "/app/login", replace: true })}
            className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold transition-colors hover:bg-red-700"
          >
            Voltar para o login
          </button>
        )}
      </div>
    </div>
  );
}
