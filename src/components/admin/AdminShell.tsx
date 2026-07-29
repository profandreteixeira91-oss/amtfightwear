import { Link, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  UserSquare2,
  MessageCircle,
  BellRing,
  Truck,
  Image as ImageIcon,
  Download as DownloadIcon,
  LifeBuoy,
  Users,
  Building2,
  Wallet,
  ScrollText,
  Sparkles,
  Rocket,
  TrendingUp,
  Instagram,
  Megaphone,
  Target,
  Search,
  Ruler,
  Calculator,
  BadgePercent,
  Award,
  CalendarDays,
  Trophy,
  Film,
  QrCode,
  Gavel,
  ClipboardList,
  FileBadge,
  CreditCard,
  Plug,
  UsersRound,
  Smartphone,
  Bell,
  HeartHandshake,
  ShoppingBag,
  UserCog,
  ShieldCheck,
  FileText,
  Settings,
  Boxes,
  Landmark,
  ScanSearch,
  KanbanSquare,
  Percent,
  Command,
} from "lucide-react";
import { OwnerOnly } from "@/lib/auth/owner-only";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

/**
 * Casca única da Central Administrativa AMT.
 *
 * Reúne todos os módulos administrativos do ecossistema
 * (AMT Fight Wear, AMT Dojo Manager e Growth) sob uma única sidebar,
 * header, breadcrumb, tema e guard de permissões.
 */
export function AdminShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <OwnerOnly>
      <SidebarProvider defaultOpen>
        <div className="admin-shell flex min-h-screen w-full bg-[radial-gradient(1200px_600px_at_0%_-10%,rgba(220,38,38,0.06),transparent_60%),radial-gradient(900px_500px_at_100%_0%,rgba(0,0,0,0.04),transparent_60%)] bg-neutral-50">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader title={title} />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </OwnerOnly>
  );
}

function AdminHeader({ title }: { title?: string }) {
  const [open, setOpen] = React.useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumbs = buildBreadcrumbs(pathname);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-neutral-200/70 bg-white/70 px-4 backdrop-blur-xl">
        <SidebarTrigger className="text-neutral-600" />
        <div className="ml-1 h-5 w-px bg-neutral-200" />
        <Link to="/admin" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            Central AMT
          </span>
        </Link>
        <div className="ml-3 hidden h-5 w-px bg-neutral-200 md:block" />
        <nav className="hidden min-w-0 items-center gap-1.5 text-sm text-neutral-500 md:flex">
          {crumbs.slice(1).map((c, i, arr) => (
            <React.Fragment key={c.href + i}>
              {i > 0 && <span className="text-neutral-300">/</span>}
              {i === arr.length - 1 ? (
                <span className="truncate font-medium text-neutral-800">{c.label}</span>
              ) : (
                <Link to={c.href} className="truncate hover:text-neutral-800">
                  {c.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
        {title ? (
          <span className="truncate text-sm font-medium text-neutral-800 md:hidden">{title}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-full border-neutral-200 bg-white/80 pl-3 pr-2 text-xs text-neutral-500 shadow-sm hover:text-neutral-900 md:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Buscar no ecossistema</span>
            <kbd className="ml-3 inline-flex items-center gap-0.5 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-9 w-9 md:hidden"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <AdminGlobalSearch open={open} onOpenChange={setOpen} />
    </>
  );
}

function buildBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  // Achatar o path atual encontrando o item mais específico da NAV
  const flat = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  const active = flat
    .filter((i) => pathname === i.url || pathname.startsWith(`${i.url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0];
  const crumbs: Array<{ label: string; href: string }> = [
    { label: "Central AMT", href: "/admin" },
  ];
  if (active) {
    crumbs.push({ label: active.group, href: active.url });
    if (active.url !== "/admin") crumbs.push({ label: active.title, href: active.url });
  }
  return crumbs;
}

function AdminGlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const go = (url: string) => {
    onOpenChange(false);
    navigate({ to: url });
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar módulos, páginas e recursos…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        {NAV.map((group, gi) => (
          <React.Fragment key={group.label}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.url}
                  value={`${group.label} ${item.title} ${item.url}`}
                  onSelect={() => go(item.url)}
                >
                  <item.icon className="mr-2 h-4 w-4 text-neutral-500" />
                  <span>{item.title}</span>
                  <span className="ml-auto text-xs text-neutral-400">{item.url}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = { label: string; items: NavItem[] };

/**
 * Mapa único de navegação da Central AMT.
 * As URLs permanecem apontando para as rotas atuais (compatibilidade total);
 * a hierarquia visual e agrupamento seguem o modelo `/admin/*` proposto.
 */
const NAV: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { title: "Início", url: "/admin", icon: LayoutDashboard },
      { title: "Visão Geral SaaS", url: "/admin/dojo", icon: Building2 },
      { title: "Analytics Global", url: "/admin/dashboard", icon: TrendingUp },
    ],
  },
  {
    label: "Growth Engine",
    items: [
      { title: "Leads (Inbox)", url: "/admin/leads", icon: Target },
      { title: "Pipeline", url: "/admin/leads/pipeline", icon: KanbanSquare },
      { title: "Prospects (Radar)", url: "/admin/leads/busca", icon: ScanSearch },
      { title: "Qualificados", url: "/admin/leads/qualificados", icon: BadgePercent },
      { title: "Macro / Segmentos", url: "/admin/leads/macro", icon: TrendingUp },
      { title: "CRM Unificado", url: "/admin/crm", icon: Users },
      { title: "Atendimento", url: "/admin/atendimento", icon: MessageCircle },
    ],
  },
  {
    label: "Ads & Instagram",
    items: [
      { title: "Ads Dashboard", url: "/admin/anuncios", icon: Megaphone },
      { title: "Criativos & Copys", url: "/admin/anuncios/criativos", icon: ImageIcon },
      { title: "Automações", url: "/admin/instagram/automacoes", icon: Sparkles },
      { title: "IG Inbox / CRM", url: "/admin/instagram/inbox", icon: Instagram },
      { title: "Inteligência AI", url: "/admin/marketing/inteligencia", icon: Command },
      { title: "KPIs / Escala", url: "/admin/anuncios/escala", icon: Rocket },
    ],
  },
  {
    label: "AMT Fight Wear",
    items: [
      { title: "Gestão da Loja", url: "/admin/loja", icon: Store },
      { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
      { title: "Orçamentos", url: "/admin/orcamentos", icon: FileText },
      { title: "Catálogo", url: "/admin/produtos", icon: Package },
      { title: "Calc. de Faixas", url: "/admin/produtos/faixa-calc", icon: Calculator },
      { title: "Atacado", url: "/admin/atacado", icon: Boxes },
      { title: "Logística / Envio", url: "/admin/envio", icon: Truck },
      { title: "Config. Fiscal", url: "/admin/produtos/tamanhos", icon: Ruler },
    ],
  },
  {
    label: "Gestão SaaS",
    items: [
      { title: "Donos de Dojos", url: "/admin/clientes-growth", icon: UsersRound },
      { title: "Base de Clientes", url: "/admin/clientes", icon: UserSquare2 },
      { title: "Assinaturas / Financeiro", url: "/admin/dojo", icon: Landmark },
      { title: "Notificações Global", url: "/admin/notificacoes", icon: BellRing },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Usuários / Equipe", url: "/admin/usuarios", icon: UserCog },
      { title: "Logs & Segurança", url: "/admin/logs", icon: ShieldCheck },
      { title: "Ajustes do Sistema", url: "/admin/configuracoes", icon: Settings },
      { title: "Meu Perfil", url: "/admin/perfil", icon: UserSquare2 },
    ],
  },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/admin"
      ? pathname === "/admin"
      : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 bg-white">
      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={collapsed ? item.title : undefined}
                      >
                        <Link
                          to={item.url}
                          preload="intent"
                          className={cn(
                            "flex items-center gap-2 text-sm text-neutral-700 hover:bg-neutral-100",
                            active && "bg-red-50 text-red-700 hover:bg-red-50",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-red-600" : "text-neutral-500",
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.title}</span>}
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
    </Sidebar>
  );
}
