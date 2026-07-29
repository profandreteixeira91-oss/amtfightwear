import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { studentSupabase as supabase } from "@/lib/student-auth/student-client";
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
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Ambient glow layer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-red-600/25 blur-[140px]" />
        <div className="absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-red-900/40 blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>
      {/* Grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-10">
        {/* Header / Logo */}
        <div className="pt-6">
          <div className="mx-auto flex flex-col items-center text-center">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-red-500/40 via-red-700/20 to-transparent blur-2xl" />
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 shadow-[0_20px_60px_-25px_rgba(220,38,38,0.6)] backdrop-blur-md">
                <img
                  src={logoAsset.url}
                  alt="AMT Dojo Manager"
                  className="mx-auto h-24 w-auto select-none sm:h-28"
                  draggable={false}
                />
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-red-200">
              <Sparkles className="h-3 w-3" /> Portal do Aluno
            </div>
            <h1 className="mt-4 font-display text-3xl font-black leading-tight tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 max-w-sm text-sm text-white/60">
              {step === "email" && "Acesse com o e-mail cadastrado na sua academia"}
              {step === "password" && "Informe sua senha para continuar"}
              {step === "activate" && "Primeiro acesso — crie sua senha"}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="relative mt-8">
          <div aria-hidden className="absolute -inset-px rounded-3xl bg-gradient-to-b from-red-500/30 via-white/5 to-transparent opacity-70 blur-[1px]" />
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-7">

            {step === "email" && (
              <form onSubmit={onEmailContinue} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">E-mail</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-base text-white placeholder:text-white/30 outline-none transition focus:border-red-400/60 focus:ring-2 focus:ring-red-500/30"
                    placeholder="voce@exemplo.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-base font-bold text-white shadow-[0_15px_40px_-15px_rgba(239,68,68,0.75)] transition hover:from-red-500 hover:to-red-400 active:scale-[0.99] disabled:opacity-60"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{loading ? "Verificando…" : "Continuar"}</span>
                </button>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={onLogin} className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-white/80"><span className="text-white/40">E-mail: </span>{email}</span>
                  <button type="button" onClick={() => setStep("email")} className="shrink-0 text-[11px] font-semibold text-red-300 hover:text-red-200">Trocar</button>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Senha</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      autoFocus
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pr-11 text-base text-white placeholder:text-white/30 outline-none transition focus:border-red-400/60 focus:ring-2 focus:ring-red-500/30"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-white/50 hover:text-white">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-base font-bold text-white shadow-[0_15px_40px_-15px_rgba(239,68,68,0.75)] transition hover:from-red-500 hover:to-red-400 active:scale-[0.99] disabled:opacity-60"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{loading ? "Entrando…" : "Entrar"}</span>
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="inline-flex items-center gap-1 text-white/50 hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Trocar e-mail
                  </button>
                  <button
                    type="button"
                    onClick={onForgot}
                    className="text-white/60 underline-offset-4 hover:text-white hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            )}

            {step === "activate" && (
              <form onSubmit={onActivate} className="space-y-4">
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-100">
                  Este é seu primeiro acesso. Crie uma senha para continuar usando o app.
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-white/80"><span className="text-white/40">E-mail: </span>{email}</span>
                  <button type="button" onClick={() => setStep("email")} className="shrink-0 text-[11px] font-semibold text-red-300 hover:text-red-200">Trocar</button>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      autoFocus
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pr-11 text-base text-white placeholder:text-white/30 outline-none transition focus:border-red-400/60 focus:ring-2 focus:ring-red-500/30"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-white/50 hover:text-white">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">Confirme a senha</label>
                  <div className="relative">
                    <input
                      type={showPw2 ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 pr-11 text-base text-white placeholder:text-white/30 outline-none transition focus:border-red-400/60 focus:ring-2 focus:ring-red-500/30"
                      placeholder="Repita a senha"
                    />
                    <button type="button" onClick={() => setShowPw2((v) => !v)} aria-label={showPw2 ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-white/50 hover:text-white">
                      {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-base font-bold text-white shadow-[0_15px_40px_-15px_rgba(239,68,68,0.75)] transition hover:from-red-500 hover:to-red-400 active:scale-[0.99] disabled:opacity-60"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{loading ? "Criando acesso…" : "Criar senha e entrar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Trocar e-mail
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-3 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 text-red-400/70" />
            Conexão segura · Gestão · Disciplina · Evolução
          </div>
          <p className="text-[11px] text-white/30">
            Sua academia precisa cadastrar seu e-mail previamente para liberar o acesso.
          </p>
        </div>
      </div>
    </div>
  );
}
