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

export const Route = createFileRoute("/dojo/app")({
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
      { to: "/dojo/app/checkin", label: "Check-in", icon: QrCode },
      { to: "/dojo/app/graduations", label: "Graduações", icon: Award },
      { to: "/dojo/app/evaluations", label: "Avaliações", icon: ClipboardList },
      { to: "/dojo/app/certificates", label: "Certificados", icon: FileBadge },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/dojo/app/plans", label: "Planos", icon: ScrollText },
      { to: "/dojo/app/finance", label: "Financeiro", icon: Wallet },
      { to: "/dojo/app/units", label: "Unidades", icon: Building2 },
      { to: "/dojo/app/integrations", label: "Integrações", icon: Plug },
    ],
  },
];

const routeTitles: Array<{ match: (p: string) => boolean; title: string; subtitle?: string }> = [
  { match: (p) => p === "/dojo/app", title: "Painel", subtitle: "Visão geral do dojo" },
  { match: (p) => p.startsWith("/dojo/app/students"), title: "Alunos", subtitle: "Gestão de matrículas e histórico" },
  { match: (p) => p.startsWith("/dojo/app/checkin"), title: "Check-in", subtitle: "Presenças e frequência" },
  { match: (p) => p.startsWith("/dojo/app/graduations"), title: "Graduações", subtitle: "Nova graduação e certificados" },
  { match: (p) => p.startsWith("/dojo/app/evaluations"), title: "Avaliações", subtitle: "Provas teóricas e práticas" },
  { match: (p) => p.startsWith("/dojo/app/certificates"), title: "Certificados", subtitle: "Modelos e emissões" },
  { match: (p) => p.startsWith("/dojo/app/plans"), title: "Planos", subtitle: "Mensalidades e contratos" },
  { match: (p) => p.startsWith("/dojo/app/finance"), title: "Financeiro", subtitle: "Recebimentos e a receber" },
  { match: (p) => p.startsWith("/dojo/app/units"), title: "Unidades", subtitle: "Dojos e polos" },
  { match: (p) => p.startsWith("/dojo/app/integrations"), title: "Integrações", subtitle: "Gympass, TotalPass, WhatsApp" },
];

function DojoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
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
        <Sidebar collapsible="icon" className="border-r border-[color:var(--dojo-border)]">
          <SidebarHeader className="border-b border-[color:var(--dojo-border)]/60">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-black">
                A
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="font-display text-sm font-bold tracking-tight leading-tight">AMT Dojo</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Manager</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {nav.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
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
            ))}
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
                onClick={handleLogout}
                title="Sair"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-[color:var(--dojo-surface)]">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[color:var(--dojo-border)] bg-background/80 backdrop-blur px-3 md:px-6">
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
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar aluno, plano, unidade…"
                  className="h-9 w-64 rounded-md border border-[color:var(--dojo-border)] bg-white pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                title="Notificações"
                className="grid h-9 w-9 place-items-center rounded-md border border-[color:var(--dojo-border)] bg-white text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md border border-[color:var(--dojo-border)] bg-white px-2 py-1.5 hover:bg-muted transition-colors">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background text-xs font-bold">
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
