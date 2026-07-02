import { Link, useRouterState } from "@tanstack/react-router";
import amtLogo from "@/assets/amt-logo.jpg";
import {
  LayoutDashboard,
  Settings,
  User,
  Users,
  ScrollText,
  Brain,
  Package,
  UserSquare2,
  Globe2,
  Handshake,
  Gauge,
  Sparkles,
  Radar,
  Wand2,
  Mail,
  BarChart4,
  Rocket,
  Plug,
  DollarSign,
  Bot,
  BookOpen,
  MessageSquare,
  Search,
  Map,
  Download,
  Zap,
  Wrench,
  ListChecks,
  Instagram,
  Inbox,
  MessageCircle,
  Shield,
  LineChart,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Usuários", url: "/users", icon: Users },
  { title: "Logs", url: "/logs", icon: ScrollText },
] as const;

const growthItems = [
  { title: "Inteligência Comercial", url: "/growth/intelligence", icon: Brain },
  { title: "Produtos", url: "/growth/products", icon: Package },
  { title: "Clientes", url: "/growth/customers", icon: UserSquare2 },
  { title: "Mercado", url: "/growth/market", icon: Globe2 },
  { title: "CRM", url: "/growth/crm", icon: Handshake },
  { title: "KPIs", url: "/growth/kpis", icon: Gauge },
  { title: "Insights IA", url: "/growth/insights", icon: Sparkles },
] as const;

const marketItems = [
  { title: "Painel MarketEngine", url: "/market/overview", icon: Rocket },
  { title: "IA Content Hub", url: "/market/content", icon: Wand2 },
  { title: "CRM & E-mail", url: "/market/crm", icon: Mail },
  { title: "Analytics Catálogo", url: "/market/catalog", icon: BarChart4 },
  { title: "Pesquisa de Mercado", url: "/market/pricing", icon: DollarSign },
  { title: "Conexões e APIs", url: "/market/connections", icon: Plug },
] as const;

const scraperItems = [
  { title: "Dashboard", url: "/prospect", icon: LayoutDashboard },
  { title: "Leads", url: "/prospect/leads", icon: Users },
  { title: "Pipeline", url: "/prospect/pipeline", icon: Handshake },
  { title: "Nova Busca", url: "/prospect/search", icon: Radar },
  { title: "Configurações", url: "/prospect/settings", icon: Wrench },
  { title: "Logs", url: "/prospect/logs", icon: ListChecks },
] as const;


const instagramItems = [
  { title: "Dashboard", url: "/instagram/dashboard", icon: LineChart },
  { title: "Conta Conectada", url: "/instagram/account", icon: Instagram },
  { title: "Inbox", url: "/instagram/inbox", icon: Inbox },
  { title: "CRM Instagram", url: "/instagram/crm", icon: Handshake },
  { title: "Comentários", url: "/instagram/comments", icon: MessageCircle },
  { title: "Automações", url: "/instagram/automations", icon: Zap },
  { title: "Administração", url: "/instagram/admin", icon: Shield },
] as const;

const accountItems = [
  { title: "Perfil", url: "/profile", icon: User },
  { title: "Configurações", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
                AMT Growth
              </div>
              <div className="truncate text-[11px] font-medium uppercase tracking-widest text-sidebar-foreground/60">
                Engine
              </div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Growth Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {growthItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>MarketEngine</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Prospect Engine</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {scraperItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          <SidebarGroupLabel>SalesBot IA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {salesItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Instagram Hub</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {instagramItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 text-[11px] uppercase tracking-widest text-sidebar-foreground/50">
            AMT Fight Wear
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
