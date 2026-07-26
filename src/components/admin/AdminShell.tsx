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
        <div className="flex min-h-[calc(100vh-56px)] w-full bg-neutral-50">
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
      <header className="sticky top-14 z-30 flex h-12 items-center gap-2 border-b border-neutral-200 bg-white/80 px-3 backdrop-blur-sm">
        <SidebarTrigger className="text-neutral-600" />
        <div className="ml-1 h-5 w-px bg-neutral-200" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Central AMT
          </span>
          <nav className="hidden min-w-0 items-center gap-1 text-sm text-neutral-500 md:flex">
            {crumbs.map((c, i) => (
              <React.Fragment key={c.href + i}>
                {i > 0 && <span className="text-neutral-300">/</span>}
                {i === crumbs.length - 1 ? (
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
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-full border-neutral-200 bg-white text-xs text-neutral-500 hover:text-neutral-800 md:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar no ecossistema
            <kbd className="ml-2 hidden items-center gap-0.5 rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-[10px] text-neutral-500 lg:inline-flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="md:hidden h-8 w-8"
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
    label: "Dashboard",
    items: [
      { title: "Visão geral", url: "/admin", icon: LayoutDashboard },
      { title: "Analytics", url: "/dashboard", icon: TrendingUp },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "Leads", url: "/prospect/leads", icon: Target },
      { title: "Leads qualificados", url: "/prospect/qualified", icon: BadgePercent },
      { title: "Pipeline", url: "/prospect/pipeline", icon: KanbanSquare },
      { title: "Busca de prospects", url: "/prospect/search", icon: ScanSearch },
      { title: "Macro / segmentos", url: "/prospect/macro", icon: TrendingUp },
      { title: "CRM", url: "/growth/crm", icon: Users },
      { title: "Clientes (Loja)", url: "/store/customers", icon: UserSquare2 },
      { title: "Clientes (Growth)", url: "/growth/customers", icon: UserSquare2 },
      { title: "Atendimento / Chat", url: "/store/chat", icon: MessageCircle },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Instagram — Dashboard", url: "/instagram/dashboard", icon: Instagram },
      { title: "Instagram — Inbox", url: "/instagram/inbox", icon: MessageCircle },
      { title: "Instagram — Comentários", url: "/instagram/comments", icon: MessageCircle },
      { title: "Instagram — Automações", url: "/instagram/automations", icon: Sparkles },
      { title: "Instagram — CRM", url: "/instagram/crm", icon: Users },
      { title: "Instagram — Conta", url: "/instagram/account", icon: UserCog },
      { title: "Anúncios — Dashboard", url: "/ads/dashboard", icon: Megaphone },
      { title: "Campanhas", url: "/ads/campaigns", icon: Megaphone },
      { title: "Criativos", url: "/ads/creatives", icon: ImageIcon },
      { title: "Copies", url: "/ads/copies", icon: FileText },
      { title: "Otimização", url: "/ads/optimization", icon: Sparkles },
      { title: "Escala", url: "/ads/scale", icon: Rocket },
      { title: "Conexões", url: "/ads/connections", icon: Plug },
      { title: "Insights (Growth)", url: "/growth/insights", icon: Rocket },
      { title: "Inteligência", url: "/growth/intelligence", icon: Sparkles },
      { title: "Mercado", url: "/growth/market", icon: TrendingUp },
      { title: "KPIs", url: "/growth/kpis", icon: LayoutDashboard },
    ],
  },
  {
    label: "Vendas — AMT Fight Wear",
    items: [
      { title: "Painel da Loja", url: "/store", icon: Store },
      { title: "Pedidos", url: "/store/orders", icon: ShoppingCart },
      { title: "Produtos", url: "/store/products", icon: Package },
      { title: "Imagens de produtos", url: "/store/imagens", icon: ImageIcon },
      { title: "Importar produtos", url: "/store/import", icon: DownloadIcon },
      { title: "Tamanhos", url: "/store/sizes", icon: Ruler },
      { title: "Calculadora de faixas", url: "/store/faixa-calc", icon: Calculator },
      { title: "Atacado", url: "/store/wholesale", icon: Boxes },
      { title: "Envio", url: "/store/shipping", icon: Truck },
      { title: "Notificações", url: "/store/notifications", icon: BellRing },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro (Dojo)", url: "/dojo/app/finance", icon: Wallet },
      { title: "Vendas avulsas", url: "/dojo/app/sales", icon: ShoppingCart },
      { title: "AMT Pay", url: "/dojo/app/integrations", icon: CreditCard },
      { title: "Planos / mensalidades", url: "/dojo/app/plans", icon: ScrollText },
    ],
  },
  {
    label: "AMT Dojo Manager",
    items: [
      { title: "Painel do Dojo", url: "/dojo/app", icon: LayoutDashboard },
      { title: "Alunos", url: "/dojo/app/students", icon: Users },
      { title: "Equipe", url: "/dojo/app/team", icon: UsersRound },
      { title: "Agenda", url: "/dojo/app/schedule", icon: CalendarDays },
      { title: "Check-in", url: "/dojo/app/checkin", icon: QrCode },
      { title: "Ranking", url: "/dojo/app/ranking", icon: Trophy },
      { title: "Comunicados", url: "/dojo/app/announcements", icon: Megaphone },
      { title: "Modalidades e Faixas", url: "/dojo/app/belts", icon: Award },
      { title: "Planos de Aula", url: "/dojo/app/lesson-plans", icon: ClipboardList },
      { title: "Graduações", url: "/dojo/app/graduations", icon: Award },
      { title: "Avaliações", url: "/dojo/app/evaluations", icon: ClipboardList },
      { title: "Certificados", url: "/dojo/app/certificates", icon: FileBadge },
      { title: "Vídeos", url: "/dojo/app/videos", icon: Film },
      { title: "Competições", url: "/dojo/app/competitions", icon: Trophy },
      { title: "Central de Contratos", url: "/dojo/app/contracts", icon: Gavel },
      { title: "AMT Store (Dojo)", url: "/dojo/app/store", icon: ShoppingBag },
      { title: "Unidades e Filiais", url: "/dojo/app/units", icon: Building2 },
      { title: "Benefícios Corporativos", url: "/dojo/app/corporate-benefits", icon: HeartHandshake },
      { title: "QR do App do Aluno", url: "/dojo/app/student-app-qr", icon: Smartphone },
      { title: "App & Notificações", url: "/dojo/app/notifications", icon: Bell },
      { title: "Suporte", url: "/dojo/app/support", icon: LifeBuoy },
      { title: "Conta / assinatura", url: "/dojo/app/account", icon: Landmark },
    ],
  },
  {
    label: "SaaS — Dojos (cross-tenant)",
    items: [
      { title: "Dojos / Tenants", url: "/store/dojo-manager", icon: Building2 },
      { title: "Suporte SaaS", url: "/store/dojo-support", icon: LifeBuoy },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Usuários", url: "/users", icon: UserCog },
      { title: "Logs / auditoria", url: "/logs", icon: ShieldCheck },
      { title: "Configurações", url: "/settings", icon: Settings },
      { title: "Perfil", url: "/profile", icon: UserSquare2 },
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
