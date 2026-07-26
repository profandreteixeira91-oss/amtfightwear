import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { AMTPayActivationForm } from "@/components/dojo/amtpay/AMTPayActivationForm";
import { getMyOnboardingState } from "@/lib/dojo/onboarding.functions";

export const Route = createFileRoute("/dojo/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuração inicial — AMT Dojo Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/dojo/auth" });
    return { user: data.user };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const state = await getMyOnboardingState();
        if (state.completed) {
          navigate({ to: "/dojo/app" });
          return;
        }
      } catch {
        // ignore, form still renders
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/dojo";
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#111]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <DojoLogo className="h-8 w-auto" />
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Configure seu dojo em uma etapa
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-black/60">
            Precisamos destes dados para liberar o sistema e ativar o AMT Pay (processamento de pagamentos via AMT Pay).
          </p>
        </div>

        <AMTPayActivationForm
          showIntro
          onCompleted={() => navigate({ to: "/dojo/app" })}
        />
      </main>
    </div>
  );
}
