import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import amtLogo from "@/assets/amt-logo.jpg";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — AMT Growth Engine" },
      { name: "description", content: "Acesse o cockpit interno da AMT Fight Wear." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type SignInValues = z.infer<typeof signInSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const rawRedirect = useSearch({ from: "/auth" }).redirect;
  // Only allow same-origin relative paths (prevents open-redirect phishing)
  const redirect =
    rawRedirect && /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : undefined;
  const [checking, setChecking] = useState(true);

  // Clientes da loja têm login exclusivo — nunca compartilham a tela do Growth Engine.
  const isStoreTarget = !!redirect && redirect.split("?")[0]!.startsWith("/loja");

  useEffect(() => {
    if (isStoreTarget) {
      navigate({
        to: "/loja/entrar",
        search: redirect ? { redirect } : {},
        replace: true,
      });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: redirect ?? "/dashboard", replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate, redirect, isStoreTarget]);


  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSignIn = signInForm.handleSubmit(async (values) => {
    const { error } = await authService.signInWithPassword(values.email, values.password);
    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta");
    navigate({ to: redirect ?? "/dashboard", replace: true });
  });

  const onForgotPassword = async () => {
    const email = signInForm.getValues("email").trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Informe seu e-mail", {
        description: "Digite o e-mail da conta no campo acima e clique novamente.",
      });
      return;
    }
    const { error } = await authService.resetPassword(email);
    if (error) {
      toast.error("Não foi possível enviar o e-mail", { description: error.message });
      return;
    }
    toast.success("E-mail enviado", {
      description: "Verifique sua caixa de entrada para redefinir a senha.",
    });
  };


  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen w-full lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(60%_50%_at_20%_10%,var(--color-primary)_0%,transparent_60%),radial-gradient(50%_50%_at_90%_90%,var(--color-primary)_0%,transparent_60%)]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/40">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">AMT Growth Engine</div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-sidebar-foreground/60">
              AMT Fight Wear
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md space-y-4"
        >
          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            Cockpit interno
          </div>
          <h1 className="text-4xl font-black leading-tight">
            Inteligência comercial e marketing, no ritmo do ringue.
          </h1>
          <p className="text-sm text-sidebar-foreground/70">
            Métricas, usuários e histórico de operação num único lugar. Preparado para receber
            módulos de IA em breve.
          </p>
        </motion.div>

        <div className="relative text-xs uppercase tracking-widest text-sidebar-foreground/50">
          © {new Date().getFullYear()} AMT Fight Wear
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/60 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Acessar plataforma</CardTitle>
              <CardDescription>
                Acesso restrito. Contas são criadas apenas internamente pelo administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-mail</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Senha</Label>
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <PasswordInput
                    id="signin-password"
                    autoComplete="current-password"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={signInForm.formState.isSubmitting}
                >
                  {signInForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
