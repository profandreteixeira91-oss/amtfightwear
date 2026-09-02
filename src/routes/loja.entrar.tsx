import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import amtLogo from "@/assets/amt-logo.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/loja/entrar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar na sua conta — AMT Fight Wear" },
      {
        name: "description",
        content:
          "Acesse sua conta AMT Fight Wear para acompanhar pedidos, endereços e finalizar suas compras de kimonos, faixas e rashguards.",
      },
      { property: "og:title", content: "Entrar na sua conta — AMT Fight Wear" },
      {
        property: "og:description",
        content: "Login exclusivo dos clientes da loja AMT Fight Wear.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StoreAuthPage,
});

const signInSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
type SignInValues = z.infer<typeof signInSchema>;

const signUpSchema = z.object({
  full_name: z.string().min(3, "Informe seu nome completo"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
type SignUpValues = z.infer<typeof signUpSchema>;

/** Apenas caminhos relativos da loja são aceitos (evita open-redirect e vazamento para o painel). */
function safeStoreRedirect(raw: string | undefined): string {
  if (!raw) return "/loja/conta";
  if (!/^\/(?!\/)/.test(raw)) return "/loja/conta";
  const path = raw.split("?")[0] ?? "";
  return path.startsWith("/loja") ? raw : "/loja/conta";
}

function StoreAuthPage() {
  const navigate = useNavigate();
  const rawRedirect = useSearch({ from: "/loja/entrar" }).redirect;
  const redirect = safeStoreRedirect(rawRedirect);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace(redirect);
      } else {
        setChecking(false);
      }
    });
  }, [redirect]);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const onSignIn = signInForm.handleSubmit(async (values) => {
    const { error } = await authService.signInWithPassword(values.email, values.password);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    window.location.replace(redirect);
  });

  const onSignUp = signUpForm.handleSubmit(async (values) => {
    const { data, error } = await authService.signUpWithPassword(
      values.email,
      values.password,
      values.full_name,
    );
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Confirme seu e-mail", {
        description: "Enviamos um link de confirmação para concluir seu cadastro.",
      });
      return;
    }
    toast.success("Conta criada!");
    window.location.replace(redirect);
  });

  const onForgotPassword = async () => {
    const email = signInForm.getValues("email").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Informe seu e-mail", {
        description: "Digite o e-mail da sua conta no campo acima e clique novamente.",
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
      <div className="relative hidden overflow-hidden bg-card text-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(60%_50%_at_20%_10%,var(--color-primary)_0%,transparent_60%),radial-gradient(50%_50%_at_90%_90%,var(--color-primary)_0%,transparent_60%)]" />
        <Link to="/loja" className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-md ring-1 ring-primary/40">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight">AMT FIGHT WEAR</div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Loja oficial
            </div>
          </div>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md space-y-5"
        >
          <h1 className="text-4xl font-black leading-tight">
            Sua conta de cliente AMT Fight Wear.
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe pedidos, salve endereços e finalize suas compras com mais rapidez.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-primary" /> Rastreamento dos seus pedidos
            </li>
            <li className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" /> Personalizações salvas no perfil
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" /> Checkout seguro
            </li>
          </ul>
        </motion.div>

        <div className="relative text-xs uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} AMT Fight Wear
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/60 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Área do cliente</CardTitle>
              <CardDescription>
                Entre ou crie sua conta para comprar na loja AMT Fight Wear.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={onSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="store-signin-email">E-mail</Label>
                      <Input
                        id="store-signin-email"
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
                        <Label htmlFor="store-signin-password">Senha</Label>
                        <button
                          type="button"
                          onClick={onForgotPassword}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <PasswordInput
                        id="store-signin-password"
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

                <TabsContent value="signup">
                  <form onSubmit={onSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="store-signup-name">Nome completo</Label>
                      <Input
                        id="store-signup-name"
                        autoComplete="name"
                        {...signUpForm.register("full_name")}
                      />
                      {signUpForm.formState.errors.full_name && (
                        <p className="text-xs text-destructive">
                          {signUpForm.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="store-signup-email">E-mail</Label>
                      <Input
                        id="store-signup-email"
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
                      <Label htmlFor="store-signup-password">Senha</Label>
                      <PasswordInput
                        id="store-signup-password"
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
                      Criar minha conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                <Link to="/loja" className="hover:text-primary hover:underline">
                  Voltar para a loja
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
