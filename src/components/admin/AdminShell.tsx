import { Link, useRouterState } from "@tanstack/react-router";
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
  GraduationCap,
  LifeBuoy,
  Users,
  Building2,
  Wallet,
  ScrollText,
  Sparkles,
  Rocket,
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
import { cn } from "@/lib/utils";

/**
 * Casca única da Central Administrativa AMT.
 *
 * Ponto único para editar sidebar, header, tema e permissões de toda a
 * área administrativa do ecossistema (AMT Fight Wear + AMT Dojo Manager
 * cross-tenant + Growth). Reutilizada por `/admin/*` e futuramente por
 * `/store/*` para unificar chrome e guard.
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
            <header className="sticky top-14 z-30 flex h-12 items-center gap-2 border-b border-neutral-200 bg-white/80 px-3 backdrop-blur-sm">
              <SidebarTrigger className="text-neutral-600" />
              <div className="ml-1 h-5 w-px bg-neutral-200" />
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                  Central AMT
                </span>
                {title ? (
                  <span className="truncate text-sm font-medium text-neutral-800">
                    {title}
                  </span>
                ) : null}
              </div>
            </header>
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </OwnerOnly>
  );
}

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Ecossistema",
    items: [{ title: "Visão geral", url: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "AMT Fight Wear",
    items: [
      { title: "Painel da Loja", url: "/store", icon: Store },
      { title: "Produtos", url: "/store/products", icon: Package },
      { title: "Pedidos", url: "/store/orders", icon: ShoppingCart },
      { title: "Clientes", url: "/store/customers", icon: UserSquare2 },
      { title: "Chat da loja", url: "/store/chat", icon: MessageCircle },
      { title: "Notificações", url: "/store/notifications", icon: BellRing },
      { title: "Envio", url: "/store/shipping", icon: Truck },
      { title: "Imagens", url: "/store/imagens", icon: ImageIcon },
      { title: "Importar", url: "/store/import", icon: DownloadIcon },
    ],
  },
  {
    label: "AMT Dojo Manager (SaaS)",
    items: [
      { title: "Dojos / Tenants", url: "/store/dojo-manager", icon: Building2 },
      { title: "Suporte", url: "/store/dojo-support", icon: LifeBuoy },
      { title: "AMT Pay", url: "/admin/dojo/payouts", icon: Wallet },
      { title: "Assinaturas", url: "/admin/dojo/subscriptions", icon: ScrollText },
    ],
  },
  {
    label: "Growth",
    items: [
      { title: "Inteligência", url: "/growth/intelligence", icon: Sparkles },
      { title: "Marketing Engine", url: "/growth/insights", icon: Rocket },
      { title: "CRM", url: "/growth/crm", icon: Users },
      { title: "KPIs", url: "/growth/kpis", icon: LayoutDashboard },
    ],
  },
  {
    label: "Formação",
    items: [
      { title: "Portal Aluno", url: "/dojo/portal", icon: GraduationCap },
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
        {NAV.map((group) => {
          const groupOpen = group.items.some((i) => isActive(i.url));
          return (
            <SidebarGroup key={group.label} defaultOpen={groupOpen}>
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
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
