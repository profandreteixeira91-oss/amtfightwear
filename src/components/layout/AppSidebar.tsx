import { Link, useRouterState } from "@tanstack/react-router";
import { useIsOwner } from "@/lib/auth/owner-only";
import amtLogo from "@/assets/amt-logo.jpg";
import {
  LayoutDashboard,
  Settings,
  User,
  Users,
  ScrollText,
  Brain,
  Package,
  FileText,
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
  TrendingUp,
  Store,
  ShoppingCart,
  Download as DownloadIcon,
  Truck,
  Box,
  Image as ImageIcon,
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
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/users", icon: Users },
  { title: "Logs", url: "/logs", icon: ScrollText },
] as const;

const growthItems = [
  { title: "Inteligência Comercial", url: "/growth/intelligence", icon: Brain },
  { title: "Clientes", url: "/growth/customers", icon: UserSquare2 },
  { title: "Mercado", url: "/growth/market", icon: Globe2 },
  { title: "CRM", url: "/growth/crm", icon: Handshake },
  { title: "KPIs", url: "/growth/kpis", icon: Gauge },
  { title: "Insights IA", url: "/growth/insights", icon: Sparkles },
] as const;

const marketItems = [
  { title: "Painel MarketEngine", url: "/admin/marketing", icon: Rocket },
  { title: "IA Content Hub", url: "/admin/marketing/inteligencia", icon: Wand2 },
  { title: "CRM & E-mail", url: "/admin/crm", icon: Mail },
  { title: "Analytics Catálogo", url: "/admin/marketing/kpis", icon: BarChart4 },
  { title: "Pesquisa de Mercado", url: "/admin/marketing/mercado", icon: DollarSign },
  { title: "Conexões e APIs", url: "/admin/conexoes", icon: Plug },
] as const;

const scraperItems = [
  { title: "Dashboard", url: "/admin/prospect", icon: LayoutDashboard },
  { title: "Leads", url: "/admin/leads", icon: Users },
  { title: "Potenciais Clientes", url: "/admin/leads/qualificados", icon: Sparkles },
  { title: "Pipeline", url: "/admin/leads/pipeline", icon: Handshake },
  { title: "Nova Busca", url: "/admin/leads/busca", icon: Radar },
  { title: "Configurações", url: "/admin/leads/configuracoes", icon: Wrench },
  { title: "Logs", url: "/admin/leads/logs", icon: ListChecks },
] as const;


const instagramItems = [
  { title: "Dashboard", url: "/admin/instagram", icon: LineChart },
  { title: "Conta Conectada", url: "/admin/instagram/conta", icon: Instagram },
  { title: "Inbox", url: "/admin/instagram/inbox", icon: Inbox },
  { title: "CRM Instagram", url: "/admin/instagram/crm", icon: Handshake },
  { title: "Comentários", url: "/admin/instagram/comentarios", icon: MessageCircle },
  { title: "Automações", url: "/admin/instagram/automacoes", icon: Zap },
  { title: "Administração", url: "/admin/instagram/admin", icon: Shield },
] as const;

const adsItems = [
 { title: "Dashboard", url: "/admin/anuncios", icon: LayoutDashboard },
 { title: "Nova Campanha IA", url: "/admin/anuncios/nova", icon: Sparkles },
 { title: "Campanhas", url: "/admin/anuncios/campanhas", icon: Rocket },
  { title: "Otimização IA", url: "/admin/anuncios/otimizacao", icon: Zap },
  { title: "Escala IA", url: "/admin/anuncios/escala", icon: TrendingUp },
  { title: "Alertas", url: "/admin/anuncios/alertas", icon: Radar },
 { title: "Criativos", url: "/admin/anuncios/criativos", icon: Wand2 },
 { title: "Copies", url: "/admin/anuncios/copies", icon: MessageSquare },
 { title: "Conexão Meta Ads", url: "/admin/anuncios/conexoes", icon: Plug },
] as const;

const storeItems = [
  { title: "Painel da Loja", url: "/admin/loja", icon: Store },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
  { title: "Orçamentos", url: "/admin/orcamentos", icon: FileText },
  { title: "Envio (Melhor Envio)", url: "/admin/envio", icon: Truck },
  { title: "Pacotes (dimensões)", url: "/admin/produtos/pacotes", icon: Box },
  { title: "Imagens dos produtos", url: "/admin/produtos/imagens", icon: ImageIcon },
  { title: "Importar catálogo", url: "/admin/produtos/importar", icon: DownloadIcon },
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
  const { isOwner } = useIsOwner();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-3 px-2 py-2">
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

        {isOwner && (
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
        )}

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
          <SidebarGroupLabel>Tráfego Pago IA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adsItems.map((item) => (
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
          <SidebarGroupLabel>Loja Virtual</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {storeItems.map((item) => (
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
