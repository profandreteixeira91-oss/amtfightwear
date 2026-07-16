import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Flame, Loader2 } from "lucide-react";
import amtLogo from "@/assets/amt-logo.jpg";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(2, "Informe seu nome"),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const rawRedirect = useSearch({ from: "/auth" }).redirect;
  // Only allow same-origin relative paths (prevents open-redirect phishing)
  const redirect =
    rawRedirect && /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : undefined;
  const [checking, setChecking] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: redirect ?? "/dashboard", replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate, redirect]);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
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

  const onSignUp = signUpForm.handleSubmit(async (values) => {
    const { error } = await authService.signUpWithPassword(values.email, values.password, values.fullName);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    toast.success("Conta criada", { description: "Confirme seu e-mail para continuar." });
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

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (result.error) {
        toast.error("Falha ao entrar com Google", { description: String(result.error) });
        return;
      }
      if (!result.redirected) {
        navigate({ to: redirect ?? "/dashboard", replace: true });
      }
    } finally {
      setGoogleLoading(false);
    }
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
              <CardDescription>Entre com sua conta ou crie uma nova.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
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
                      <Label htmlFor="signin-password">Senha</Label>
                      <Input
                        id="signin-password"
                        type="password"
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
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={onSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome completo</Label>
                      <Input id="signup-name" autoComplete="name" {...signUpForm.register("fullName")} />
                      {signUpForm.formState.errors.fullName && (
                        <p className="text-xs text-destructive">
                          {signUpForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">E-mail</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        {...signUpForm.register("email")}
                      />
                      {signUpForm.formState.errors.email && (
                        <p className="text-xs text-destructive">
                          {signUpForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        {...signUpForm.register("password")}
                      />
                      {signUpForm.formState.errors.password && (
                        <p className="text-xs text-destructive">
                          {signUpForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signUpForm.formState.isSubmitting}
                    >
                      {signUpForm.formState.isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-6">
                <Separator />
                <span className="absolute inset-0 -top-2 mx-auto w-fit bg-card px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  ou
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={onGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.25 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
                    />
                  </svg>
                )}
                Continuar com Google
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
