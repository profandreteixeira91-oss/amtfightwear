import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { checkTeamMemberGate, getMyTeamPermissions } from "@/lib/dojo/team.functions";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/dojo/staff/auth")({
  validateSearch: searchSchema,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal da Equipe — Acesso restrito" },
      {
        name: "description",
        content:
          "Login exclusivo para professores e equipe do dojo. As contas são criadas somente pelo dono da academia.",
      },
      { property: "og:title", content: "Portal da Equipe — Acesso restrito" },
      {
        property: "og:description",
        content: "Acesso restrito a colaboradores cadastrados pelo dono do dojo no módulo Equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffAuthPage,
});

type AccessCheck =
  | { ok: true; destination: string }
  | { ok: false; message: string; description: string };

/**
 * Contrato de acesso ao Portal da Equipe:
 * - conta de aluno  -> negada (usa o App do Aluno)
 * - vínculo pendente/inativo em dojo_team_members -> negada
 * - dono de dojo -> redirecionado para o painel completo
 * - membro de equipe ativo -> /dojo/staff
 */
async function checkStaffAccess(userId: string, email: string | null | undefined): Promise<AccessCheck> {
  const normalized = email?.trim().toLowerCase() ?? null;

  const [{ data: studentByUser }, studentByEmail] = await Promise.all([
    supabase.from("dojo_students").select("id").eq("user_id", userId).limit(1),
    normalized
      ? supabase.from("dojo_students").select("id").eq("email", normalized).limit(1)
      : Promise.resolve({ data: null as { id: string }[] | null }),
  ]);
  if ((studentByUser?.length ?? 0) > 0 || (studentByEmail.data?.length ?? 0) > 0) {
    return {
      ok: false,
      message: "Acesso negado",
      description: "Este e-mail pertence a um aluno. Use o App do Aluno.",
    };
  }

  const gate = await checkTeamMemberGate();
  if (gate.blocked) {
    return {
      ok: false,
      message: "Acesso pendente",
      description:
        gate.reason === "inactive"
          ? "Seu acesso foi desativado. Fale com o dono do dojo."
          : "Seu login precisa ser criado pelo dono do dojo no módulo Equipe.",
    };
  }

  const perms = await getMyTeamPermissions();
  if (perms?.isOwner) {
    return { ok: true, destination: "/dojo/app" };
  }
  if (!perms?.member) {
    return {
      ok: false,
      message: "Vínculo não encontrado",
      description:
        "Nenhum cadastro de equipe está vinculado a este e-mail. Peça ao dono do dojo para criar seu acesso em Equipe → Permissões.",
    };
  }
  return { ok: true, destination: "/dojo/staff" };
}

function StaffAuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const go = async (userId: string, userEmail: string | null | undefined) => {
    const result = await checkStaffAccess(userId, userEmail);
    if (!result.ok) {
      await supabase.auth.signOut();
      setChecking(false);
      setLoading(false);
      toast.error(result.message, { description: result.description });
      return;
    }
    const requested = search.redirect;
    const target = requested?.startsWith("/dojo/") && !requested.startsWith("/dojo/staff/auth")
      ? requested
      : result.destination;
    window.location.assign(target);
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) void go(data.user.id, data.user.email);
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.redirect]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Falha ao entrar", { description: error?.message ?? "Credenciais inválidas." });
      return;
    }
    await go(data.user.id, data.user.email);
  };

  const handleForgotPassword = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Informe seu e-mail no campo acima.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um e-mail para redefinir a senha.");
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" aria-label="Verificando sessão" />
      </div>
    );
  }

  return (
    <div className="dojo-theme grid min-h-screen place-items-center bg-neutral-50 px-4 py-10 text-[#111111]">
      <main className="w-full max-w-md">
        <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <DojoLogo className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Portal da Equipe</h1>
              <p className="text-xs text-neutral-500">Acesso restrito a professores e colaboradores</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-[#C1121F]/5 p-3 text-[12px] text-neutral-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C1121F]" />
            <p>
              Não é possível criar conta aqui. Os logins da equipe são criados exclusivamente pelo dono do dojo em
              <span className="font-medium"> Equipe → Permissões</span>.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">E-mail cadastrado pelo dojo</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professor@dojo.com.br"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <PasswordInput
                  id="staff-password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#C1121F] hover:bg-[#a30f1a]">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar no Portal da Equipe
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-center text-xs">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="font-medium text-[#C1121F] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2"
            >
              Esqueci minha senha
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/dojo/auth", search: {} })}
              className="text-neutral-500 hover:text-neutral-700"
            >
              Sou dono do dojo — entrar no painel completo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
