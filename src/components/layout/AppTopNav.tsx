import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import amtLogoAsset from "@/assets/amt-logo.png.asset.json";
const amtLogo = amtLogoAsset.url;
import { getMyAcademyBranding } from "@/lib/dojo/academy-public.functions";
import { useIsOwner } from "@/lib/auth/owner-only";
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
  LifeBuoy,
  CalendarDays,
  Building2,
  BellRing,
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
    label: "Pessoas",
    items: [
      { title: "Alunos", url: "/dojo/app/students", icon: Users },
      { title: "Equipe", url: "/dojo/app/team", icon: UserSquare2 },
    ],
  },
  {
    label: "Rotina",
    items: [
      { title: "Turmas", url: "/dojo/app/schedule", icon: GraduationCap },
      { title: "Agenda", url: "/dojo/app/schedule", icon: CalendarDays },
      { title: "Planos de Aula", url: "/dojo/app/lesson-plans", icon: ScrollText },
      { title: "Quadro de Avisos", url: "/dojo/app/announcements", icon: Megaphone },
    ],
  },

  {
    label: "Estrutura",
    items: [
      { title: "Unidades", url: "/dojo/app/units", icon: Building2 },
      { title: "Benefícios Corporativos", url: "/dojo/app/corporate-benefits", icon: Handshake },
    ],
  },
  {
    label: "Comercial",
    items: [
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
      { title: "AMT Dojo Manager", url: "/store/dojo-manager", icon: GraduationCap },
      { title: "Suporte Dojo", url: "/store/dojo-support", icon: LifeBuoy },
      { title: "Notificações", url: "/store/notifications", icon: BellRing },

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
  const inDojo = pathname === "/dojo" || pathname.startsWith("/dojo/");

  const brandingFn = useServerFn(getMyAcademyBranding);
  const { data: dojo } = useQuery({
    queryKey: ["admin", "academy-branding"],
    queryFn: () => brandingFn({}),
    staleTime: 60_000,
    enabled: !inStore,
  });
  const dojoName = !inStore ? (dojo?.trade_name || dojo?.legal_name) : undefined;
  const dojoLogo = !inStore ? dojo?.logo_url : undefined;

  // Grupos exclusivos do Dojo Manager — só aparecem dentro de /dojo.
  const dojoOnlyLabels = new Set(["Pessoas", "Rotina", "Estrutura", "Comercial"]);
  const { isOwner } = useIsOwner();
  const ownerOnlyLabels = new Set(["Growth"]);
  const visibleGroups = (inDojo
    ? groups
    : groups.filter((g) => !dojoOnlyLabels.has(g.label))
  ).filter((g) => isOwner || !ownerOnlyLabels.has(g.label));

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl",
        inDojo
          ? "border-red-800/70 bg-red-700 text-white supports-[backdrop-filter]:bg-red-700/90"
          : "border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/60",
      )}
    >
      <div className={cn("flex items-center gap-2 px-3 sm:px-4", inDojo ? "h-16" : "h-14")}>
        <Link to={inStore ? "/store" : "/dashboard"} className="group flex items-center gap-3 shrink-0">
          <div
            className={cn(
              "relative grid place-items-center overflow-hidden transition-transform group-hover:scale-[1.05]",
              inDojo
                ? (dojoLogo
                    ? "h-14 w-14 rounded-xl bg-white ring-2 ring-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_10px_30px_-6px_rgba(0,0,0,0.45)]"
                    : "h-14 w-40 rounded-xl bg-white ring-2 ring-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_10px_30px_-6px_rgba(0,0,0,0.45)]")
                : "h-9 w-9 rounded-lg bg-gradient-to-br from-primary/90 to-primary shadow-lg shadow-primary/20 ring-1 ring-primary/40",
            )}
          >
            <img
              src={dojoLogo || amtLogo}
              alt={dojoName || "AMT"}
              className={cn("h-full w-full object-contain", inDojo ? "p-1.5" : "p-1.5")}
            />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="hidden min-w-0 leading-tight sm:block">
            <div className={cn("text-sm font-bold tracking-tight", !inDojo && "text-foreground")}>
              {inStore ? "AMT Fight Wear" : (dojoName || "AMT Growth")}
            </div>
            <div className={cn("text-[10px] font-medium uppercase tracking-[0.18em]", inDojo ? "text-white/70" : "text-muted-foreground")}>
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
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className={cn(
              "rounded-full",
              inDojo && "text-white hover:bg-white/10 hover:text-white",
            )}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className={cn(
            "border-t backdrop-blur lg:hidden",
            inDojo
              ? "border-red-800/70 bg-red-700 text-white supports-[backdrop-filter]:bg-red-700/95"
              : "border-border/60 bg-background/95",
          )}
        >
          <div className="max-h-[75vh] space-y-4 overflow-y-auto p-3">
            {visibleGroups.map((g) => (
              <div key={g.label}>
                <div
                  className={cn(
                    "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]",
                    inDojo ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {g.label}
                </div>
                <div className="grid grid-cols-1 gap-1 xs:grid-cols-2 sm:grid-cols-2">
                  {g.items.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm leading-tight transition-colors",
                          inDojo
                            ? cn(
                                "text-white/90 hover:bg-white/10 hover:text-white",
                                active && "border-white/40 bg-white/15 font-semibold text-white",
                              )
                            : cn(
                                "hover:bg-accent",
                                active && "border-primary/30 bg-primary/10 font-medium text-primary",
                              ),
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

