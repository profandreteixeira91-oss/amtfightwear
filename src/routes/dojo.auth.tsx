import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { PasswordStrength, isPasswordStrong, PASSWORD_MIN_LENGTH } from "@/components/auth/PasswordStrength";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { isEmailTeamMember, checkTeamMemberGate } from "@/lib/dojo/team.functions";

const searchSchema = z.object({ redirect: z.string().optional() });


export const Route = createFileRoute("/dojo/auth")({
  validateSearch: searchSchema,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — AMT Dojo Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DojoAuthPage,
});

async function resolveDestination(_userId: string, requested?: string): Promise<string> {
  // Onboarding é opcional — acesso total ao painel desde o primeiro login.
  return requested && requested.startsWith("/dojo") ? requested : "/dojo/app";
}

function DojoAuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let redirected = false;
    const go = async (userId: string) => {
      if (redirected) return;
      redirected = true;
      // Team-member gate: bloqueia acesso caso o e-mail exista em
      // dojo_team_members sem vínculo ativo com este user_id.
      try {
        const gate = await checkTeamMemberGate();
        if (gate.blocked) {
          await supabase.auth.signOut();
          redirected = false;
          setChecking(false);
          toast.error("Acesso pendente", {
            description:
              gate.reason === "inactive"
                ? "Seu acesso foi desativado. Fale com o dono do dojo."
                : "Seu login precisa ser criado pelo dono do dojo no módulo Equipe.",
          });
          return;
        }
      } catch {
        // Se a checagem falhar, seguimos sem bloquear para não travar o dono.
      }
      await supabase.auth.updateUser({ data: { account_type: "dojo_manager" } });
      const target = await resolveDestination(userId, search.redirect);
      window.location.replace(target);
    };
    // Captura confirmação de email (hash tokens) e login em qualquer aba.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
        void go(session.user.id);
      }
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void go(data.user.id);
      else setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [search.redirect]);


  const goAfterAuth = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const target = await resolveDestination(data.user.id, search.redirect);
    window.location.assign(target);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return toast.error("Falha ao entrar", { description: error.message });
    }
    // Contas de aluno não podem acessar o Dojo Manager.
    if (signInData.user) {
      const { data: studentRows } = await supabase
        .from("dojo_students")
        .select("id")
        .eq("user_id", signInData.user.id)
        .limit(1);
      if (studentRows && studentRows.length > 0) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Acesso restrito", {
          description: "Este e-mail é de aluno. Use o App do Aluno em /app.",
        });
        window.location.assign("/app");
        return;
      }
    }
    setLoading(false);
    toast.success("Bem-vindo de volta!");
    await goAfterAuth();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast.error("Senha fraca", {
        description: "Atenda a todos os requisitos de segurança antes de continuar.",
      });
      return;
    }
    // E-mails já cadastrados como aluno não podem abrir conta de dono.
    const { data: studentByEmail } = await supabase
      .from("dojo_students")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .limit(1);
    if (studentByEmail && studentByEmail.length > 0) {
      toast.error("E-mail de aluno", {
        description: "Este e-mail está vinculado a uma matrícula. Use o App do Aluno em /app.",
      });
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dojo/auth`,
        data: { full_name: name, account_type: "dojo_manager" },
      },
    });
    setLoading(false);
    if (error) return toast.error("Falha ao criar conta", { description: error.message });
    if (data.user) {
      toast.success("Conta criada! Bem-vindo ao AMT Dojo Manager.");
      window.location.assign("/dojo/app");
    }
  };
    // E-mails cadastrados como membro de equipe não podem se auto-registrar:
    // o login precisa ser criado pelo dono no módulo Equipe.
    try {
      const teamCheck = await isEmailTeamMember({ data: { email: email.trim().toLowerCase() } });
      if (teamCheck.isTeamMember) {
        toast.error("E-mail de colaborador", {
          description:
            "Este e-mail é de um membro de equipe. Peça ao dono do dojo para criar seu login no módulo Equipe.",
        });
        return;
      }
    } catch { /* segue em caso de falha na checagem */ }

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dojo/auth`,
      });
      if (result.error) {
        toast.error("Falha no Google", { description: result.error.message });
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      await goAfterAuth();
    } catch (e: any) {
      toast.error("Falha no Google", { description: e?.message ?? String(e) });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return toast.error("Informe seu e-mail no campo acima.");
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um e-mail para redefinir a senha.");
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-[#111111]">
      {/* Background decoration matching dojo landing */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-[#C1121F]/[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#C1121F]/[0.05] blur-3xl" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-auth" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#111" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-auth)" />
        </svg>
      </div>

      <header className="border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dojo" className="flex items-center" aria-label="AMT Dojo Manager">
            <DojoLogo className="h-9 w-auto" />
          </Link>
          <Link
            to="/dojo"
            className="inline-flex items-center gap-1.5 text-sm text-[#111111]/60 hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-57px)] max-w-md items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <DojoLogo className="mb-4 h-24 w-auto drop-shadow-[0_10px_30px_rgba(193,18,31,0.15)] md:h-28" />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {isSignup ? (
                <>Crie sua conta no <span className="text-[#C1121F]">Dojo Manager</span></>
              ) : (
                <>Bem-vindo ao <span className="text-[#C1121F]">Dojo Manager</span></>
              )}
            </h1>
            <p className="mt-2 text-sm text-[#111111]/60">
              {isSignup
                ? "Comece o teste grátis de 14 dias."
                : "Acesse o painel de gestão da sua academia."}
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(17,17,17,0.15)] md:p-7">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className="h-11 w-full gap-3 rounded-xl border-black/15 bg-white text-[#111111] hover:bg-black/[0.03]"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1a6.7 6.7 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
                </svg>
              )}
              {isSignup ? "Cadastrar com Google" : "Entrar com Google"}
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-[#111111]/40">
              <span className="h-px flex-1 bg-black/10" />
              ou com e-mail
              <span className="h-px flex-1 bg-black/10" />
            </div>

            <form
              onSubmit={isSignup ? handleSignUp : handleSignIn}
              className="space-y-3.5"
            >
              {isSignup && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-[#111111]/70">
                    Nome completo
                  </Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]/40" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      className="h-11 rounded-xl border-black/10 pl-9 focus-visible:ring-[#C1121F]/30"
                      placeholder="Como podemos te chamar?"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-[#111111]/70">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]/40" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11 rounded-xl border-black/10 pl-9 focus-visible:ring-[#C1121F]/30"
                    placeholder="voce@academia.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-[#111111]/70">
                    Senha
                  </Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-medium text-[#C1121F] hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]/40" />
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isSignup ? PASSWORD_MIN_LENGTH : 6}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="h-11 rounded-xl border-black/10 pl-9 focus-visible:ring-[#C1121F]/30"
                    placeholder={isSignup ? `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` : "••••••••"}
                  />
                </div>
                {isSignup && <PasswordStrength password={password} className="pt-1" />}
              </div>

              <Button
                type="submit"
                disabled={loading || googleLoading}
                className="h-11 w-full rounded-xl bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/20 hover:bg-[#a30f1a]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSignup ? "Criar conta grátis" : "Entrar"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-[#111111]/60">
              {isSignup ? (
                <>
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-semibold text-[#C1121F] hover:underline"
                  >
                    Entrar
                  </button>
                </>
              ) : (
                <>
                  Ainda não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold text-[#C1121F] hover:underline"
                  >
                    Cadastre-se
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#111111]/40">
            Ao continuar você concorda com nossos{" "}
            <Link to="/terms" className="underline hover:text-[#111111]/70">Termos</Link>
            {" "}e{" "}
            <Link to="/privacy" className="underline hover:text-[#111111]/70">Privacidade</Link>.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
