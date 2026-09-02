/**
 * Layout do Portal do Professor.
 *
 * Ambiente independente: autenticação própria (`dojo_staff_accounts`),
 * navegação própria, sessão própria. Não reutiliza o layout do dono do dojo.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getStaffSession } from "@/lib/dojo/staff-portal.functions";
import { StaffProvider } from "@/components/dojo/staff/staff-context";
import { StaffShell } from "@/components/dojo/staff/StaffShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dojo/staff/_portal")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/dojo/staff/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: StaffPortalLayout,
});

function StaffPortalLayout() {
  const sessionFn = useServerFn(getStaffSession);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["staff-session"],
    queryFn: () => sessionFn(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-sm space-y-3 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <div className="text-sm font-semibold">Acesso da equipe indisponível</div>
          <p className="text-xs text-muted-foreground">
            Sua conta não está ativa como equipe deste dojo. Se o seu acesso foi desativado, procure o dono da academia.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/dojo/staff/auth");
            }}
          >
            Sair
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <StaffProvider value={data}>
      <StaffShell>
        <Outlet />
      </StaffShell>
    </StaffProvider>
  );
}
