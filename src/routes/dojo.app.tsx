import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Award,
  ClipboardList,
  FileBadge,
  Wallet,
  Building2,
  ScrollText,
  QrCode,
  Plug,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  UserCircle,
  CalendarDays,
  Trophy,
  Film,
  Smartphone,
  CreditCard,
  Megaphone,
  ShoppingBag,
  UsersRound,
  HeartHandshake,
  ShoppingCart,


} from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DojoLogo } from "@/components/dojo/DojoLogo";
import { TrialBadge } from "@/components/dojo/TrialBadge";
import { UnsavedChangesProvider } from "@/components/common/UnsavedChangesGuard";
import { DojoPermissionsProvider, useDojoPermissions } from "@/components/dojo/DojoPermissionsProvider";
import { findModuleForPath } from "@/lib/dojo/permissions";

export const Route = createFileRoute("/dojo/app")({
  head: () => ({ meta: [{ title: "Painel — AMT Dojo Manager" }] }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/dojo/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: DojoLayout,
});

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const nav: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/dojo/app", label: "Painel", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Academia",
    items: [
      { to: "/dojo/app/students", label: "Alunos", icon: Users },
      { to: "/dojo/app/schedule", label: "Agenda", icon: CalendarDays },
      { to: "/dojo/app/checkin", label: "Check-in", icon: QrCode },
      { to: "/dojo/app/graduations", label: "Graduações", icon: Award },
      { to: "/dojo/app/belts", label: "Modalidades e Faixas", icon: Award },
      { to: "/dojo/app/evaluations", label: "Avaliações", icon: ClipboardList },
      { to: "/dojo/app/certificates", label: "Certificados", icon: FileBadge },
      { to: "/dojo/app/competitions", label: "Competições", icon: Trophy },
      { to: "/dojo/app/announcements", label: "Quadro de Avisos", icon: Megaphone },
      { to: "/dojo/app/videos", label: "Vídeos", icon: Film },
    ],
  },
  {
    label: "Loja",
    items: [
      { to: "/dojo/app/store", label: "AMT Store", icon: ShoppingBag },
    ],
  },
  {
    label: "Cobrança avulsa",
    items: [
      { to: "/dojo/app/sales", label: "Vendas", icon: ShoppingCart },
    ],
  },
  {
    label: "Recorrência & Financeiro",
    items: [
      { to: "/dojo/app/plans", label: "Planos", icon: ScrollText },
      { to: "/dojo/app/recurring", label: "Mensalidades", icon: Wallet },
      { to: "/dojo/app/finance", label: "Financeiro", icon: Wallet },
      { to: "/dojo/app/integrations", label: "AMT Pay", icon: CreditCard },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/dojo/app/team", label: "Equipe", icon: UsersRound },
      { to: "/dojo/app/corporate-benefits", label: "Benefícios Corporativos", icon: HeartHandshake },
      { to: "/dojo/app/units", label: "Unidades", icon: Building2 },
    ],
  },
  {
    label: "App do Aluno",
    items: [
      { to: "/dojo/app/student-app-qr", label: "QR do App", icon: Smartphone },
    ],
  },
];

const routeTitles: Array<{ match: (p: string) => boolean; title: string; subtitle?: string }> = [
  { match: (p) => p === "/dojo/app", title: "Painel", subtitle: "Visão geral do dojo" },
  { match: (p) => p.startsWith("/dojo/app/students"), title: "Alunos", subtitle: "Gestão de matrículas e histórico" },
  { match: (p) => p.startsWith("/dojo/app/schedule"), title: "Agenda", subtitle: "Turmas, horários e ocupação" },
  { match: (p) => p.startsWith("/dojo/app/checkin"), title: "Check-in", subtitle: "Presenças e frequência" },
  { match: (p) => p.startsWith("/dojo/app/graduations"), title: "Graduações", subtitle: "Nova graduação e certificados" },
  { match: (p) => p.startsWith("/dojo/app/evaluations"), title: "Avaliações", subtitle: "Provas teóricas e práticas" },
  { match: (p) => p.startsWith("/dojo/app/certificates"), title: "Certificados", subtitle: "Modelos e emissões" },
  { match: (p) => p.startsWith("/dojo/app/competitions"), title: "Competições", subtitle: "Calendário, atletas e histórico" },
  { match: (p) => p.startsWith("/dojo/app/videos"), title: "Vídeos", subtitle: "Biblioteca de conteúdos da academia" },
  { match: (p) => p.startsWith("/dojo/app/sales"), title: "Vendas", subtitle: "Cobrança avulsa (uma vez) — produtos, taxas e serviços" },
  { match: (p) => p.startsWith("/dojo/app/plans"), title: "Planos", subtitle: "Modelos de mensalidade (recorrência)" },
  { match: (p) => p.startsWith("/dojo/app/recurring"), title: "Mensalidades", subtitle: "Cobranças recorrentes por aluno — vencimento definido pelo dono" },
  { match: (p) => p.startsWith("/dojo/app/finance"), title: "Financeiro", subtitle: "Recebimentos, contas a receber e a pagar" },
  { match: (p) => p.startsWith("/dojo/app/team"), title: "Equipe", subtitle: "Colaboradores, folha e escalas" },
  { match: (p) => p.startsWith("/dojo/app/corporate-benefits"), title: "Benefícios Corporativos", subtitle: "Gympass, TotalPass e beneficiários" },
  { match: (p) => p.startsWith("/dojo/app/units"), title: "Unidades", subtitle: "Dojos e polos" },
  
  { match: (p) => p.startsWith("/dojo/app/subscription"), title: "Assinatura AMT", subtitle: "Plano mensal do sistema" },
  { match: (p) => p.startsWith("/dojo/app/integrations"), title: "Carteira", subtitle: "Central financeira · AMT Pay" },
  { match: (p) => p.startsWith("/dojo/app/student-app-qr"), title: "QR do App do Aluno", subtitle: "Imprima e distribua para os alunos" },
];

function DojoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Força tema claro em todo o Dojo Manager (inclusive popups/dialogs portados fora do escopo .dojo-theme)
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const prevColorScheme = root.style.colorScheme;
    const forceLight = () => {
      if (root.classList.contains("dark")) root.classList.remove("dark");
      root.style.colorScheme = "light";
    };
    forceLight();
    const observer = new MutationObserver(forceLight);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (hadDark) root.classList.add("dark");
      root.style.colorScheme = prevColorScheme;
    };
  }, []);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/dojo";
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/") || pathname.startsWith(to + "?") || pathname === to;

  const header = routeTitles.find((r) => r.match(pathname)) ?? { title: "Dojo Manager", subtitle: "" };
  const initial = (email?.[0] ?? "D").toUpperCase();

  return (
    <div className="dojo-theme min-h-screen">
      <SidebarProvider>
        <DojoPermissionsProvider>
          <DojoLayoutInner
            pathname={pathname}
            email={email}
            initial={initial}
            header={header}
            onLogout={handleLogout}
            isActive={isActive}
          />
        </DojoPermissionsProvider>
      </SidebarProvider>
    </div>
  );
}

function DojoLayoutInner({
  pathname,
  email,
  initial,
  header,
  onLogout,
  isActive,
}: {
  pathname: string;
  email: string | null;
  initial: string;
  header: { title: string; subtitle?: string };
  onLogout: () => void;
  isActive: (to: string, exact?: boolean) => boolean;
}) {
  const { can, isOwner, loading } = useDojoPermissions();
  const currentModule = findModuleForPath(pathname);
  const blocked = !loading && !isOwner && currentModule ? !can(currentModule.key, "read") : false;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-[color:var(--dojo-border)]">
        <SidebarHeader className="border-b border-[color:var(--dojo-border)]/60">
          <Link to="/dojo" className="flex items-center gap-2 px-2 py-1.5">
            <DojoLogo className="h-10 w-auto shrink-0" />
            <span className="sr-only">AMT Dojo Manager</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {nav.map((group) => {
            const visible = group.items.filter((item) => {
              const mod = findModuleForPath(item.to);
              if (!mod) return true;
              return can(mod.key, "read");
            });
            if (visible.length === 0) return null;
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visible.map((item) => {
                      const active = isActive(item.to, item.exact);
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={item.label}
                            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90 data-[active=true]:font-semibold"
                          >
                            <Link to={item.to}>
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="border-t border-[color:var(--dojo-border)]/60">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {initial}
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="text-xs font-medium truncate">{email ?? "Instrutor"}</div>
              <div className="text-[10px] text-muted-foreground">Conta ativa</div>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-[color:var(--dojo-surface)]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[color:var(--dojo-border)] bg-white/85 backdrop-blur-md px-3 md:px-6 shadow-[0_1px_0_0_oklch(0.92_0.006_250)]">
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base md:text-lg font-bold tracking-tight leading-tight truncate">
              {header.title}
            </h1>
            {header.subtitle && (
              <p className="text-[11px] md:text-xs text-muted-foreground leading-tight truncate">
                {header.subtitle}
              </p>
            )}
          </div>
          <TrialBadge />
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar aluno, plano, unidade…"
                className="h-9 w-64 rounded-lg border border-[color:var(--dojo-border)] bg-[color:var(--dojo-surface-2)] pl-8 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <button
              title="Notificações"
              className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--dojo-border)] bg-white text-muted-foreground hover:text-foreground hover:border-[color:var(--dojo-border-strong)] transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-[color:var(--dojo-border)] bg-white px-2 py-1.5 hover:border-[color:var(--dojo-border-strong)] hover:shadow-sm transition-all">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {initial}
                </div>
                <span className="hidden sm:inline max-w-[160px] truncate text-sm font-medium">
                  {email ?? "Conta"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{email ?? "Conta"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dojo/app/account">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Minha conta
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-w-0 max-w-full overflow-x-hidden p-4 md:p-6">
          <UnsavedChangesProvider>
            {blocked ? (
              <div className="mx-auto mt-16 max-w-md rounded-xl border border-[color:var(--dojo-border)] bg-white p-8 text-center shadow-sm">
                <div className="text-2xl font-bold mb-2">Sem permissão</div>
                <p className="text-sm text-muted-foreground">
                  Você não tem acesso ao módulo <b>{currentModule?.label}</b>. Fale com o administrador do dojo para liberar.
                </p>
              </div>
            ) : (
              <Outlet />
            )}
          </UnsavedChangesProvider>
        </main>
      </SidebarInset>
    </>
  );
}
