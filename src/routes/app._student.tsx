import { createFileRoute, Outlet, redirect, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import * as Icons from "lucide-react";
import { studentSupabase as supabase } from "@/lib/student-auth/student-client";
import { BottomNav } from "@/components/student/BottomNav";
import { StudentThemeProvider } from "@/components/student/StudentThemeProvider";
import { getMyBranding, getMyStudent } from "@/lib/student/student.functions";
import { getMyAccessBlock } from "@/lib/student/access.functions";
import { toast } from "sonner";
import { getStudentAppConfig } from "@/lib/student-app/config.functions";
import { DEFAULT_CONFIG, type FeatureKey } from "@/lib/student-app/schema";
import { Bell, LogOut } from "lucide-react";
import { PushToggle } from "@/components/student/PushToggle";
import { PushActivationPrompt } from "@/components/student/PushActivationPrompt";
import { InstallReminderBanner } from "@/components/student/InstallReminderBanner";
import { StudentSplash } from "@/components/student/StudentSplash";
import { StudentSwitcher } from "@/components/student/StudentSwitcher";
import { attachPushRotationListener, getCurrentSubscription, subscriptionToPayload } from "@/lib/pwa/push-client";
import { subscribeMyPush } from "@/lib/student/push.functions";

export const Route = createFileRoute("/app/_student")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/app/login", search: { redirect: location.href } as never });
    const { data: studentId, error } = await supabase.rpc("get_my_student_id");
    if (error || !studentId) {
      await context.queryClient.cancelQueries({ queryKey: ["student"] });
      context.queryClient.removeQueries({ queryKey: ["student"] });
      await supabase.auth.signOut();
      throw redirect({ to: "/app/login", replace: true });
    }
  },
  component: StudentShell,
});

function StudentShell() {
  const navigate = useNavigate();
  const brandingFn = useServerFn(getMyBranding);
  const studentFn = useServerFn(getMyStudent);
  const configFn = useServerFn(getStudentAppConfig);
  const { data: branding } = useQuery({ queryKey: ["student", "branding"], queryFn: () => brandingFn({}) });
  const { data: student, isSuccess: studentLoaded, error: studentError } = useQuery({
    queryKey: ["student", "me"],
    queryFn: () => studentFn({}),
    refetchInterval: 15_000,
    retry: (count, err) => !isAccessDenied(err) && count < 2,
  });
  // Só erro explícito de acesso negado (aluno trancado/removido) derruba a sessão;
  // falhas transitórias (rede, 5xx, timeout) mantêm os dados atuais.
  const studentFailed = isAccessDenied(studentError);
  const { data: cfgData } = useQuery({
    queryKey: ["student", "app-config"],
    queryFn: () => configFn({}),
    staleTime: 30_000,
  });
  const config = cfgData?.config ?? DEFAULT_CONFIG;
  const queryClient = useQueryClient();
  const studentId = student?.id;

  // Aluno cancelado/excluído/trancado: força logout e volta para /app/login.
  useEffect(() => {
    if (!studentLoaded && !studentFailed) return;
    if (student && !studentFailed) return;
    (async () => {
      await queryClient.cancelQueries({ queryKey: ["student"] });
      queryClient.removeQueries({ queryKey: ["student"] });
      try {
        await supabase.auth.signOut();
      } catch { /* noop */ }
      navigate({ to: "/app/login", replace: true });
    })();
  }, [studentLoaded, studentFailed, student, navigate, queryClient]);

  // Regra do plano "Bloquear acesso após X dias do vencimento": mesmo com sessão
  // ativa, o aluno inadimplente é desconectado e volta para o login.
  const accessBlockFn = useServerFn(getMyAccessBlock);
  const { data: accessBlock } = useQuery({
    queryKey: ["student", "access-block"],
    queryFn: () => accessBlockFn(),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!accessBlock?.blocked) return;
    (async () => {
      toast.error("Acesso bloqueado", { description: accessBlock.message ?? undefined });
      try {
        await supabase.auth.signOut();
      } catch { /* noop */ }
      navigate({ to: "/app/login", replace: true });
    })();
  }, [accessBlock, navigate]);

  // Realtime: quando o aluno é adicionado/removido de uma turma, refresca agenda, home e ranking imediatamente.
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`student-enrollments-${studentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_class_students", filter: `student_id=eq.${studentId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["student", "agenda"] });
          queryClient.invalidateQueries({ queryKey: ["student", "home"] });
          queryClient.invalidateQueries({ queryKey: ["student", "ranking"] });
          queryClient.invalidateQueries({ queryKey: ["student", "me"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, queryClient]);

  // Push subscription hygiene (celular): re-upa a inscrição atual no servidor
  // ao abrir o app e escuta rotações do SW, garantindo que Android/iOS não
  // "percam" o registro após rotação de endpoint FCM/APNs.
  const subscribeFn = useServerFn(subscribeMyPush);
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getCurrentSubscription();
        if (!s || cancelled) return;
        await subscribeFn({ data: subscriptionToPayload(s) });
      } catch {
        /* noop */
      }
    })();
    attachPushRotationListener((payload) => {
      subscribeFn({ data: payload }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [studentId, subscribeFn]);


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/app/login", replace: true });
  }

  const appName = config.appearance.app_name || branding?.trade_name || "Portal do Aluno";
  const logo = config.appearance.logo_url || branding?.logo_url;

  if (studentFailed || !student) return <StudentSplash />;

  return (
    <StudentThemeProvider branding={branding} appearance={config.appearance}>
      <StudentSplash />
      <InstallReminderBanner />
      <div data-student-shell className="min-h-screen w-full max-w-full overflow-x-hidden">
      <header
        className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            {logo ? (
              <img
                src={logo}
                alt={branding?.trade_name || appName}
                className="h-10 w-10 shrink-0 rounded-xl object-contain bg-white ring-1 ring-black/5 shadow-sm p-0.5 sm:h-12 sm:w-12 md:h-14 md:w-14"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12 md:h-14 md:w-14" style={{ background: "var(--sa-primary, #dc2626)" }} />
            )}
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-sm font-bold leading-tight sm:text-base md:text-lg"
                style={{ color: "var(--sa-title)" }}
              >
                {branding?.trade_name || appName}
              </div>
              <div className="truncate text-[11px] text-neutral-500 sm:text-xs">
                {student?.full_name ?? "Aluno"}
              </div>
            </div>
          </div>


          {/* Desktop nav */}
          <DesktopNav items={config.bottom_nav} features={config.features} />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <StudentSwitcher currentName={student?.full_name} />
            {config.features.news !== false && (
              <Link
                to="/app/notifications"
                className="hidden h-9 w-9 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100 sm:grid"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
              </Link>
            )}
            <div className="hidden sm:block">
              <PushToggle />
            </div>
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

      <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
        <Outlet />
      </main>

      <div className="lg:hidden">
        <BottomNav items={config.bottom_nav} features={config.features} />
      </div>
      </div>
      <PushActivationPrompt />
    </StudentThemeProvider>
  );
}

const ROUTE_FEATURE: Record<string, FeatureKey> = {
  "/app/agenda": "agenda",
  "/app/checkin": "checkin",
  "/app/videos": "videos",
  "/app/graduations": "graduations",
  "/app/certificates": "certificates",
  "/app/finance": "finance",
  "/app/competitions": "competitions",
  "/app/profile": "profile",
  "/app/documents": "documents",
  "/app/notifications": "news",
  "/app/announcements": "announcements",
};

function iconFor(name: string) {
  const key = name
    .split(/[-_ ]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[key];
  return Comp ?? Icons.Circle;
}

function DesktopNav({ items, features }: { items: any[]; features: any }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const filtered = items.filter((it) => {
    if (it.route === "/app/home") return true;
    const f = ROUTE_FEATURE[it.route];
    return f ? features[f] !== false : true;
  });
  return (
    <nav className="hidden min-w-0 flex-1 justify-center lg:flex">
      <ul className="flex items-center gap-1">
        {filtered.map((it) => {
          const Icon = iconFor(it.icon);
          const active = pathname === it.route || (it.route !== "/app/home" && pathname.startsWith(it.route));
          return (
            <li key={it.id}>
              <Link
                to={it.route}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[color:var(--sa-primary,#dc2626)]/10 text-[color:var(--sa-primary,#dc2626)]"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
