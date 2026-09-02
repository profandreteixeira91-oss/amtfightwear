import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { staffSupabase as supabase } from "@/lib/dojo/staff-auth/staff-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import {
  getStaffPortalBrand,
  getStaffSession,
  type StaffPortalBrand,
} from "@/lib/dojo/staff-portal.functions";

const searchSchema = z.object({
  dojo: z.string().optional(),
  redirect: z.string().optional(),
});

const DOJO_STORAGE_KEY = "amt-staff-portal-dojo";

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

function StaffAuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const brandFn = useServerFn(getStaffPortalBrand);
  const sessionFn = useServerFn(getStaffSession);

  const [dojoRef, setDojoRef] = useState<string | null>(search.dojo ?? null);
  const [brand, setBrand] = useState<StaffPortalBrand | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Resolve o dojo pai a partir do ID/slug da URL (ou do último acesso local).
  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(DOJO_STORAGE_KEY) : null;
    const ref = search.dojo ?? stored ?? null;
    setDojoRef(ref);
    if (!ref) return;
    if (search.dojo && typeof window !== "undefined") {
      window.localStorage.setItem(DOJO_STORAGE_KEY, search.dojo);
    }
    let cancelled = false;
    brandFn({ data: { dojo: ref } })
      .then((res) => {
        if (!cancelled) setBrand(res);
      })
      .catch(() => {
        if (!cancelled) setBrand(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.dojo]);

  const goToPortal = () => {
    const requested = search.redirect;
    const target =
      requested?.startsWith("/dojo/staff") && !requested.startsWith("/dojo/staff/auth")
        ? requested
        : "/dojo/staff";
    window.location.assign(target);
  };

  // Sessão existente só é aproveitada quando é, de fato, uma conta de equipe.
  // Contas de dono do dojo nunca são redirecionadas para o painel a partir daqui.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        setChecking(false);
        return;
      }
      try {
        const session = await sessionFn();
        if (cancelled) return;
        if (session) {
          goToPortal();
          return;
        }
      } catch {
        /* segue para o formulário */
      }
      setChecking(false);
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

    let session = null as Awaited<ReturnType<typeof sessionFn>>;
    try {
      session = await sessionFn();
    } catch {
      session = null;
    }

    if (!session) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Acesso restrito à equipe", {
        description:
          "Esta conta não está cadastrada como equipe. O login precisa ser criado pelo dono do dojo em Equipe → Permissões.",
      });
      return;
    }

    if (brand && session.owner_id !== brand.owner_id) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Dojo incorreto", {
        description: "Sua conta de equipe pertence a outra academia. Use o link do seu dojo.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(DOJO_STORAGE_KEY, session.owner_id);
    }
    goToPortal();
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

  const dojoName = brand?.trade_name || brand?.legal_name || null;
  const dojoLocation = [brand?.city, brand?.state].filter(Boolean).join(" / ");
  const primary = brand?.brand_primary || "#C1121F";

  return (
    <div className="dojo-theme grid min-h-screen place-items-center bg-neutral-50 px-4 py-10 text-[#111111]">
      <main className="w-full max-w-md">
        <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3">
            {brand?.logo_url ? (
              <img
                src={brand.logo_url}
                alt={`Logotipo de ${dojoName ?? "dojo"}`}
                className="h-11 w-11 rounded-xl border border-neutral-200 object-contain"
              />
            ) : (
              <DojoLogo className="h-8 w-auto" />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">
                {dojoName ?? "Portal da Equipe"}
              </h1>
              <p className="truncate text-xs text-neutral-500">
                {dojoName ? `Portal da Equipe${dojoLocation ? ` · ${dojoLocation}` : ""}` : "Acesso restrito a professores e colaboradores"}
              </p>
            </div>
          </div>

          <div
            className="mt-5 flex items-start gap-2 rounded-2xl p-3 text-[12px] text-neutral-600"
            style={{ backgroundColor: `${primary}0D` }}
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: primary }} />
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white"
              style={{ backgroundColor: primary }}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Entrar no Portal da Equipe
            </Button>
          </form>

          {dojoRef && !brand ? (
            <p className="mt-3 text-center text-[11px] text-neutral-400">
              Não localizamos a identidade deste dojo. Confirme o link enviado pela academia.
            </p>
          ) : null}

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
