import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBadge,
  Film,
  Gavel,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Megaphone,
  QrCode,
  ScrollText,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Trophy,
  UserCircle,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyTeamPermissions } from "@/lib/dojo/team.functions";
import { PERMISSION_MODULES, canAccess } from "@/lib/dojo/permissions";
import { DojoLogo } from "@/components/dojo/DojoLogo";

export const Route = createFileRoute("/dojo/staff")({
  head: () => ({
    meta: [
      { title: "Portal da Equipe — AMT Dojo Manager" },
      {
        name: "description",
        content:
          "Área exclusiva de professores e equipe do dojo, com acesso apenas aos módulos liberados pelo dono da academia.",
      },
      { property: "og:title", content: "Portal da Equipe — AMT Dojo Manager" },
      {
        property: "og:description",
        content: "Acesso exclusivo para professores e equipe, conforme as permissões definidas pelo dono do dojo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/dojo/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: StaffPortal,
});

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  students: Users,
  schedule: CalendarDays,
  checkin: QrCode,
  graduations: Award,
  belts: Award,
  evaluations: ClipboardList,
  certificates: FileBadge,
  competitions: Trophy,
  announcements: Megaphone,
  videos: Film,
  store: ShoppingBag,
  sales: ShoppingCart,
  team: UsersRound,
  plans: ScrollText,
  finance: Wallet,
  corporate_benefits: HeartHandshake,
  units: Building2,
  amtpay: CreditCard,
  student_app: Smartphone,
  system_users: UserCircle,
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  teacher: "Professor",
  instructor: "Instrutor",
  receptionist: "Recepção",
  finance: "Financeiro",
};

function StaffPortal() {
  const navigate = useNavigate();
  const permsFn = useServerFn(getMyTeamPermissions);
  const q = useQuery({
    queryKey: ["dojo-staff-portal-permissions"],
    queryFn: () => permsFn(),
    staleTime: 60_000,
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/dojo/auth", replace: true });
  }

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
      </div>
    );
  }

  const isOwner = q.data?.isOwner ?? false;
  const permissions = q.data?.permissions ?? null;
  const member = q.data?.member ?? null;

  const allowed = PERMISSION_MODULES.filter((m) => (isOwner ? true : canAccess(permissions, m.key, "read")));
  const firstName = (member?.full_name ?? "").split(" ")[0] || "Equipe";

  return (
    <div className="dojo-theme min-h-screen w-full bg-neutral-50 pb-16 text-[#111111]">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <DojoLogo className="h-8 w-auto" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Portal da Equipe</p>
            <p className="truncate text-[11px] text-neutral-500">
              {member?.role ? (ROLE_LABEL[member.role] ?? member.role) : isOwner ? "Dono do dojo" : "Colaborador"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sair"
            className="rounded-full border border-neutral-200 p-2 text-neutral-600 transition hover:bg-neutral-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <section className="rounded-2xl bg-gradient-to-br from-[#C1121F] to-[#7f0a14] p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wider text-white/70">Bem-vindo(a)</p>
          <h1 className="mt-1 text-xl font-bold">{firstName}</h1>
          <p className="mt-2 text-sm text-white/85">
            Você tem acesso a {allowed.length} {allowed.length === 1 ? "módulo" : "módulos"} liberados pelo dono do dojo.
          </p>
        </section>

        {allowed.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed bg-white p-8 text-center">
            <LifeBuoy className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-3 text-sm font-semibold">Nenhum módulo liberado</p>
            <p className="mt-1 text-sm text-neutral-500">
              O dono do dojo ainda não liberou permissões para o seu acesso. Solicite a liberação na aba
              Equipe → Permissões.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allowed.map((m) => {
              const Icon = MODULE_ICONS[m.key] ?? ClipboardList;
              const level = isOwner ? "write" : (permissions?.[m.key] ?? "read");
              return (
                <Link
                  key={m.key}
                  to={m.routes[0]}
                  className="group flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C1121F]/40 hover:shadow-md"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#C1121F]/10 text-[#C1121F]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{m.label}</span>
                  <span className="text-[11px] leading-snug text-neutral-500">{m.description}</span>
                  <span className="mt-auto text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                    {level === "write" ? "Acesso total" : "Somente leitura"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/dojo/app/support"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-100"
          >
            <LifeBuoy className="h-4 w-4" /> Suporte
          </Link>
          <Link
            to="/dojo/app/notifications"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-neutral-100"
          >
            <Bell className="h-4 w-4" /> App & Notificações
          </Link>
          {isOwner ? (
            <Link
              to="/dojo/app"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C1121F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a30f1a]"
            >
              <LayoutDashboard className="h-4 w-4" /> Abrir painel completo
            </Link>
          ) : null}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur">
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          <li className="flex-1">
            <Link
              to="/dojo/staff"
              className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-[#C1121F]"
            >
              <GraduationCap className="h-5 w-5" /> Início
            </Link>
          </li>
          {allowed.slice(0, 3).map((m) => {
            const Icon = MODULE_ICONS[m.key] ?? ClipboardList;
            return (
              <li key={m.key} className="flex-1">
                <Link
                  to={m.routes[0]}
                  className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-neutral-500"
                >
                  <Icon className="h-5 w-5" /> {m.label.split(" ")[0]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
