import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/student/BottomNav";
import { StudentThemeProvider } from "@/components/student/StudentThemeProvider";
import { getMyBranding, getMyStudent } from "@/lib/student/student.functions";
import { getStudentAppConfig } from "@/lib/student-app/config.functions";
import { DEFAULT_CONFIG } from "@/lib/student-app/schema";
import { Bell, LogOut } from "lucide-react";

export const Route = createFileRoute("/app/_student")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/app/login", search: { redirect: location.href } as never });
  },
  component: StudentShell,
});

function StudentShell() {
  const navigate = useNavigate();
  const brandingFn = useServerFn(getMyBranding);
  const studentFn = useServerFn(getMyStudent);
  const configFn = useServerFn(getStudentAppConfig);
  const { data: branding } = useQuery({ queryKey: ["student", "branding"], queryFn: () => brandingFn({}) });
  const { data: student } = useQuery({ queryKey: ["student", "me"], queryFn: () => studentFn({}) });
  const { data: cfgData } = useQuery({
    queryKey: ["student", "app-config"],
    queryFn: () => configFn({}),
    staleTime: 30_000,
  });
  const config = cfgData?.config ?? DEFAULT_CONFIG;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/app/login", replace: true });
  }

  const appName = config.appearance.app_name || branding?.trade_name || "Portal do Aluno";
  const logo = config.appearance.logo_url || branding?.logo_url;

  return (
    <StudentThemeProvider branding={branding} appearance={config.appearance}>
      <header
        className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {logo ? (
              <img src={logo} alt={appName} className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-lg" style={{ background: "var(--sa-primary, #dc2626)" }} />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight" style={{ color: "var(--sa-title)" }}>
                {appName}
              </div>
              <div className="truncate text-[11px] text-neutral-500">
                Olá, {student?.full_name?.split(" ")[0] ?? "aluno"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {config.features.news !== false && (
              <Link
                to="/app/notifications"
                className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={signOut}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <BottomNav items={config.bottom_nav} features={config.features} />
    </StudentThemeProvider>
  );
}
