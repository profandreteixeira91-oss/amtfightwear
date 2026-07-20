import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import amtLogo from "@/assets/amt-logo.jpg";
import { getMyAcademyBranding } from "@/lib/dojo/academy-public.functions";
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
  MessageSquare,
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
  Image as ImageIcon,
  ChevronDown,
  Menu as MenuIcon,
  X,
  Megaphone,
  GraduationCap,
  CalendarDays,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const groups: { label: string; items: Item[] }[] = [
  {
    label: "Operações",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Usuários", url: "/users", icon: Users },
      { title: "Logs", url: "/logs", icon: ScrollText },
    ],
  },
  {
    label: "Growth",
    items: [
      { title: "Inteligência Comercial", url: "/growth/intelligence", icon: Brain },
      { title: "Clientes", url: "/growth/customers", icon: UserSquare2 },
      { title: "Mercado", url: "/growth/market", icon: Globe2 },
      { title: "CRM", url: "/growth/crm", icon: Handshake },
      { title: "KPIs", url: "/growth/kpis", icon: Gauge },
      { title: "Insights IA", url: "/growth/insights", icon: Sparkles },
    ],
  },
  {
    label: "MarketEngine",
    items: [
      { title: "Painel MarketEngine", url: "/market/overview", icon: Rocket },
      { title: "IA Content Hub", url: "/market/content", icon: Wand2 },
      { title: "CRM & E-mail", url: "/market/crm", icon: Mail },
      { title: "Analytics Catálogo", url: "/market/catalog", icon: BarChart4 },
      { title: "Pesquisa de Mercado", url: "/market/pricing", icon: DollarSign },
      { title: "Conexões e APIs", url: "/market/connections", icon: Plug },
    ],
  },
  {
    label: "Prospect",
    items: [
      { title: "Dashboard", url: "/prospect", icon: LayoutDashboard },
      { title: "Leads", url: "/prospect/leads", icon: Users },
      { title: "Potenciais Clientes", url: "/prospect/qualified", icon: Sparkles },
      { title: "Pipeline", url: "/prospect/pipeline", icon: Handshake },
      { title: "Nova Busca", url: "/prospect/search", icon: Radar },
      { title: "Configurações", url: "/prospect/settings", icon: Wrench },
      { title: "Logs", url: "/prospect/logs", icon: ListChecks },
    ],
  },
  {
    label: "Instagram",
    items: [
      { title: "Dashboard", url: "/instagram/dashboard", icon: LineChart },
      { title: "Conta Conectada", url: "/instagram/account", icon: Instagram },
      { title: "Inbox", url: "/instagram/inbox", icon: Inbox },
      { title: "CRM Instagram", url: "/instagram/crm", icon: Handshake },
      { title: "Comentários", url: "/instagram/comments", icon: MessageCircle },
      { title: "Automações", url: "/instagram/automations", icon: Zap },
      { title: "Administração", url: "/instagram/admin", icon: Shield },
    ],
  },
  {
    label: "Ads IA",
    items: [
      { title: "Dashboard", url: "/ads/dashboard", icon: LayoutDashboard },
      { title: "Nova Campanha IA", url: "/ads/new", icon: Sparkles },
      { title: "Campanhas", url: "/ads/campaigns", icon: Rocket },
      { title: "Otimização IA", url: "/ads/optimization", icon: Zap },
      { title: "Escala IA", url: "/ads/scale", icon: TrendingUp },
      { title: "Alertas", url: "/ads/alerts", icon: Radar },
      { title: "Criativos", url: "/ads/creatives", icon: Wand2 },
      { title: "Copies", url: "/ads/copies", icon: MessageSquare },
      { title: "Conexão Meta Ads", url: "/ads/connections", icon: Plug },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Alunos", url: "/dojo/app/students", icon: Users },
      { title: "Professores", url: "/dojo/app/units", icon: UserSquare2 },
      { title: "Turmas", url: "/dojo/app/schedule", icon: GraduationCap },
      { title: "Agenda", url: "/dojo/app/schedule", icon: CalendarDays },
      { title: "Quadro de Avisos", url: "/dojo/app/announcements", icon: Megaphone },
      { title: "Benefícios Corporativos", url: "/dojo/app/corporate-benefits", icon: Building2 },
      { title: "AMT Store", url: "/dojo/app/store", icon: Store },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Painel da Loja", url: "/store", icon: Store },
      { title: "Produtos", url: "/store/products", icon: Package },
      { title: "Pedidos", url: "/store/orders", icon: ShoppingCart },
      { title: "Chat da loja", url: "/store/chat", icon: MessageCircle },
      { title: "Clientes", url: "/store/customers", icon: UserSquare2 },
      { title: "Envio (Melhor Envio)", url: "/store/shipping", icon: Truck },
      { title: "Imagens dos produtos", url: "/store/imagens", icon: ImageIcon },
      { title: "Importar catálogo", url: "/store/import", icon: DownloadIcon },
    ],
  },
  {
    label: "Conta",
    items: [
      { title: "Perfil", url: "/profile", icon: User },
      { title: "Configurações", url: "/settings", icon: Settings },
    ],
  },
];


export function AppTopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const groupActive = (items: Item[]) => items.some((i) => isActive(i.url));

  // /store é um sistema independente do Dojo Manager — não exibir nada de dojo aqui.
  const inStore = pathname === "/store" || pathname.startsWith("/store/");

  const brandingFn = useServerFn(getMyAcademyBranding);
  const { data: dojo } = useQuery({
    queryKey: ["admin", "academy-branding"],
    queryFn: () => brandingFn({}),
    staleTime: 60_000,
    enabled: !inStore,
  });
  const dojoName = !inStore ? (dojo?.trade_name || dojo?.legal_name) : undefined;
  const dojoLogo = !inStore ? dojo?.logo_url : undefined;

  const visibleGroups = inStore
    ? groups.filter((g) => g.label !== "Gestão")
    : groups;

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Link to={inStore ? "/store" : "/dashboard"} className="group flex items-center gap-2.5 shrink-0">
          <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-primary ring-1 ring-primary/40 shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_30%,transparent),0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_50%,transparent)] transition-transform group-hover:scale-[1.03]">
            <img src={dojoLogo || amtLogo} alt={dojoName || "AMT"} className="h-full w-full object-cover" />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-bold tracking-tight truncate max-w-[220px]">
              {inStore ? "AMT Fight Wear" : (dojoName || "AMT Growth")}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {inStore ? "Loja" : (dojoName ? "Dojo Manager" : "Engine")}
            </div>
          </div>
        </Link>


        <nav className="ml-4 hidden flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
          {visibleGroups.map((g) => {
            const active = groupActive(g.items);
            return (
              <DropdownMenu key={g.label}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative h-9 gap-1 whitespace-nowrap rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                      active && "bg-accent text-foreground shadow-sm",
                    )}
                  >
                    {g.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform data-[state=open]:rotate-180" />
                    {active && (
                      <span className="pointer-events-none absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={10}
                  className="w-60 rounded-xl border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur"
                >
                  {g.items.map((item) => (
                    <DropdownMenuItem key={item.url} asChild>
                      <Link
                        to={item.url}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          isActive(item.url)
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-foreground/80 hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-7 w-7 place-items-center rounded-md border border-border/60 bg-background/60 text-muted-foreground",
                            isActive(item.url) && "border-primary/30 bg-primary/10 text-primary",
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        <div className="ml-auto lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-full"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur lg:hidden">
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-3">
            {visibleGroups.map((g) => (
              <div key={g.label}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {g.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {g.items.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                        isActive(item.url) &&
                          "border-primary/30 bg-primary/10 font-medium text-primary",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

