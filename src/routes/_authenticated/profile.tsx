import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { profileService, type Profile } from "@/services/profileService";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — AMT Growth Engine" },
      { name: "description", content: "Gerencie seus dados de perfil." },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().min(2, "Informe seu nome"),
  avatar_url: z.string().url("URL inválida").or(z.literal("")).optional(),
});
type Values = z.infer<typeof schema>;

function initialsOf(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "AM";
  return base.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", avatar_url: "" },
  });

  useEffect(() => {
    if (!user) return;
    profileService
      .getById(user.id)
      .then((p) => {
        setProfile(p);
        form.reset({ full_name: p?.full_name ?? "", avatar_url: p?.avatar_url ?? "" });
      })
      .catch(() => toast.error("Não foi possível carregar seu perfil"))
      .finally(() => setLoading(false));
  }, [user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    try {
      const updated = await profileService.update(user.id, {
        full_name: values.full_name,
        avatar_url: values.avatar_url || null,
      });
      setProfile(updated);
      toast.success("Perfil atualizado");
    } catch (err) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    }
  });

  const watchedAvatar = form.watch("avatar_url");
  const watchedName = form.watch("full_name");

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Perfil"
        description="Como você aparece dentro do AMT Growth Engine."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Prévia</CardTitle>
            <CardDescription>Como seu perfil é exibido no header.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Avatar className="h-24 w-24">
              <AvatarImage src={watchedAvatar || undefined} />
              <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                {initialsOf(watchedName, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="font-semibold">{watchedName || "Seu nome"}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
            <CardDescription>Atualize seus dados pessoais.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input id="full_name" {...form.register("full_name")} />
                  {form.formState.errors.full_name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.full_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">URL do avatar</Label>
                  <Input id="avatar_url" placeholder="https://..." {...form.register("avatar_url")} />
                  {form.formState.errors.avatar_url && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.avatar_url.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Cadastrado em{" "}
                    {profile ? new Date(profile.created_at).toLocaleDateString("pt-BR") : "-"}
                  </p>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar alterações
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
