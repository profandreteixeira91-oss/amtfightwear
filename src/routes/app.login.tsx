import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { checkStudentAccess, activateStudentAccount } from "@/lib/student/activation.functions";
import logoAsset from "@/assets/amt-dojo-manager-logo.png.asset.json";

export const Route = createFileRoute("/app/login")({
  head: () => ({ meta: [{ title: "Entrar — Portal do Aluno" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

type Step = "email" | "password" | "activate";

function LoginPage() {
  const navigate = useNavigate();
  const check = useServerFn(checkStudentAccess);
  const activate = useServerFn(activateStudentAccount);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app/home", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function onEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("Informe um e-mail válido");
    setLoading(true);
    try {
      const res = await check({ data: { email: email.trim() } });
      if (!res.exists) {
        toast.error("E-mail não cadastrado", { description: "Fale com sua academia para liberar seu acesso." });
        return;
      }
      if (res.blocked) {
        toast.error("Acesso indisponível", { description: "Sua matrícula está inativa. Fale com sua academia." });
        return;
      }
      setPassword("");
      setPasswordConfirm("");
      setStep(res.activated ? "password" : "activate");
    } catch (err: any) {
      toast.error("Falha ao verificar", { description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    navigate({ to: "/app/home", replace: true });
  }

  async function onActivate(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres");
    if (password !== passwordConfirm) return toast.error("As senhas não conferem");
    setLoading(true);
    try {
      await activate({ data: { email: email.trim(), password } });
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Senha criada com sucesso!");
      try { localStorage.removeItem("amt-student-onboarded"); } catch {}
      navigate({ to: "/app/onboarding", replace: true });
    } catch (err: any) {
      toast.error("Falha ao criar acesso", { description: err?.message ?? String(err) });
    } finally {
      setLoading(false);
    }
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
        <p className="mt-1 text-sm text-neutral-500">
          {step === "email" && "Acesse com o e-mail cadastrado na sua academia"}
          {step === "password" && "Informe sua senha para continuar"}
          {step === "activate" && "Primeiro acesso — crie sua senha"}
        </p>
      </div>

      {step === "email" && (
        <form onSubmit={onEmailContinue} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">E-mail</label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="voce@exemplo.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Continuar"}
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onLogin} className="space-y-4">
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            <span className="text-neutral-400">E-mail:</span> {email}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Senha</label>
            <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 pr-11 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-md text-neutral-400 hover:text-neutral-700">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep("email")}
              className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Trocar e-mail
            </button>
            <button
              type="button"
              onClick={onForgot}
              className="text-neutral-500 underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>
      )}

      {step === "activate" && (
        <form onSubmit={onActivate} className="space-y-4">
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            Este é seu primeiro acesso. Crie uma senha para continuar usando o app.
          </div>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            <span className="text-neutral-400">E-mail:</span> {email}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nova senha</label>
            <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              autoFocus
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 pr-11 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="Mínimo 8 caracteres"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-md text-neutral-400 hover:text-neutral-700">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Confirme a senha</label>
            <div className="relative">
            <input
              type={showPw2 ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 pr-11 text-base outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              placeholder="Repita a senha"
            />
            <button type="button" onClick={() => setShowPw2((v) => !v)} aria-label={showPw2 ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-md text-neutral-400 hover:text-neutral-700">
              {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Criando acesso…" : "Criar senha e entrar"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Trocar e-mail
          </button>
        </form>
      )}

      <p className="mt-10 text-center text-xs text-neutral-400">
        Sua academia precisa cadastrar seu e-mail previamente para liberar o acesso.
      </p>
    </div>
  );
}
