import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CalendarDays,
  ClipboardList,
  Eye,
  LayoutDashboard,
  LogOut,
  Megaphone,
  QrCode,
  ShieldAlert,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { staffSupabase as supabase } from "@/lib/dojo/staff-auth/staff-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { visibleStaffModules, type StaffModule } from "@/lib/dojo/staff-modules";
import { useStaff } from "@/components/dojo/staff/staff-context";

const ICONS: Record<StaffModule["icon"], React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  students: Users,
  schedule: CalendarDays,
  checkin: QrCode,
  graduations: Award,
  evaluations: ClipboardList,
  announcements: Megaphone,
  competitions: Trophy,
};

export function StaffShell({ children }: { children: ReactNode }) {
  const staff = useStaff();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // A lista é calculada a partir do mapa efetivo recebido da sessão.
  // O helper também aplica defaults de cargo para registros vazios.
  const modules = visibleStaffModules(staff.permissions, (staff as any).role);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/dojo/staff/auth", replace: true });
  };

  const isActive = (to: string) => (to === "/dojo/staff" ? pathname === to : pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5">
          {staff.academy?.logo_url ? (
            <img
              src={staff.academy.logo_url}
              alt={staff.academy.trade_name ?? "Logotipo do dojo"}
              className="h-9 w-9 rounded-md bg-white/10 object-contain"
            />
          ) : (
            <DojoLogo className="h-9 w-auto" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {staff.academy?.trade_name ?? staff.academy?.legal_name ?? "Portal da Equipe"}
            </div>
            <div className="truncate text-[11px] opacity-80">
              {staff.full_name ?? staff.email} · Portal da Equipe
            </div>
          </div>
          <Link to="/dojo/staff/profile" aria-label="Meu perfil">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15">
              <UserCircle className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sair do portal"
            className="text-primary-foreground hover:bg-white/15"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-4 px-3 py-4 pb-24 md:pb-6">
        <nav className="hidden w-56 shrink-0 md:block" aria-label="Navegação do professor">
          <ul className="space-y-1">
            {modules.map((m) => {
              const Icon = ICONS[m.icon];
              return (
                <li key={m.key}>
                  <Link
                    to={m.to}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive(m.to)
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Navegação mobile — professor usa o sistema durante a aula */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden"
        aria-label="Navegação do professor"
      >
        <ul className="flex overflow-x-auto">
          {modules.map((m) => {
            const Icon = ICONS[m.icon];
            return (
              <li key={m.key} className="flex-1">
                <Link
                  to={m.to}
                  className={cn(
                    "flex min-w-[68px] flex-col items-center gap-0.5 px-2 py-2 text-[10px]",
                    isActive(m.to) ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{m.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function StaffPageHeader({
  title,
  subtitle,
  readOnly,
  action,
}: {
  title: string;
  subtitle?: string;
  readOnly?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {readOnly && (
          <Badge variant="secondary" className="gap-1">
            <Eye className="h-3 w-3" /> Somente leitura
          </Badge>
        )}
        {action}
      </div>
    </div>
  );
}

export function StaffNoAccess({ label }: { label?: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 p-8 text-center">
      <ShieldAlert className="h-8 w-8 text-muted-foreground" />
      <div className="text-sm font-medium">Você não possui permissão para acessar este recurso.</div>
      <p className="max-w-sm text-xs text-muted-foreground">
        {label ? `O módulo "${label}" não foi liberado para a sua conta.` : "Solicite a liberação ao dono do dojo."}
      </p>
      <Link to="/dojo/staff">
        <Button variant="outline" size="sm" className="mt-2">
          Voltar ao início
        </Button>
      </Link>
    </Card>
  );
}

export function StaffEmpty({ message }: { message: string }) {
  return <Card className="p-8 text-center text-sm text-muted-foreground">{message}</Card>;
}
