import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrength, isPasswordStrong, PASSWORD_MIN_LENGTH } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — AMT Growth Engine" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`)
      .regex(/[a-z]/, "Inclua uma letra minúscula")
      .regex(/[A-Z]/, "Inclua uma letra maiúscula")
      .regex(/[0-9]/, "Inclua um número")
      .regex(/[^A-Za-z0-9]/, "Inclua um símbolo"),
    confirm: z.string().min(PASSWORD_MIN_LENGTH, `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
type Values = z.infer<typeof schema>;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a recovery token in the URL hash and
    // fires PASSWORD_RECOVERY once the session is established.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!isPasswordStrong(values.password)) {
      form.setError("password", { message: "Atenda a todos os requisitos abaixo." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada com sucesso");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  });

  const watchedPassword = form.watch("password");

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Redefinir senha</CardTitle>
          <CardDescription>
            {hasSession
              ? "Escolha uma nova senha para acessar sua conta."
              : "Link inválido ou expirado. Solicite um novo e-mail de recuperação."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" autoComplete="new-password" placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`} {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
                <PasswordStrength password={watchedPassword ?? ""} className="pt-1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
                {form.formState.errors.confirm && (
                  <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>
            </form>
          ) : (
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Voltar para o login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
