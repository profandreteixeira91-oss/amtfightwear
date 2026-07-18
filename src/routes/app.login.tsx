import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/login")({
  head: () => ({ meta: [{ title: "Entrar — Portal do Aluno" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app/home", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    navigate({ to: "/app/home", replace: true });
  }

  async function onForgot() {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      return toast.error("Informe seu e-mail", { description: "Digite o e-mail no campo acima." });
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error("Falha", { description: error.message });
    else toast.success("Verifique seu e-mail para redefinir a senha.");
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg" />
        <h1 className="text-2xl font-bold tracking-tight">Portal do Aluno</h1>
        <p className="mt-1 text-sm text-neutral-500">Acesse com seu e-mail e senha</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">E-mail</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            placeholder="voce@exemplo.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Senha</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <button
          type="button"
          onClick={onForgot}
          className="w-full text-center text-sm text-neutral-500 underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </button>
      </form>
      <p className="mt-10 text-center text-xs text-neutral-400">
        Sua academia precisa habilitar seu acesso previamente.
      </p>
    </div>
  );
}
