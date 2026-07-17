import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
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
    label: "Loja",
    items: [
      { title: "Painel da Loja", url: "/store", icon: Store },
      { title: "Produtos", url: "/store/products", icon: Package },
      { title: "Pedidos", url: "/store/orders", icon: ShoppingCart },
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

  return (
    <div className="border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-md bg-primary ring-1 ring-primary/30">
            <img src={amtLogo} alt="AMT" className="h-full w-full object-cover" />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-bold tracking-tight">AMT Growth</div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Engine
            </div>
          </div>
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {groups.map((g) => (
            <DropdownMenu key={g.label}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1 whitespace-nowrap",
                    groupActive(g.items) && "bg-accent text-accent-foreground",
                  )}
                >
                  {g.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {g.items.map((item) => (
                  <DropdownMenuItem key={item.url} asChild>
                    <Link
                      to={item.url}
                      className={cn(
                        "flex items-center gap-2",
                        isActive(item.url) && "bg-accent font-medium",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>

        <div className="ml-auto lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-background lg:hidden">
          <div className="max-h-[70vh] overflow-y-auto p-3 space-y-4">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {g.items.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                        isActive(item.url) && "bg-accent font-medium",
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
