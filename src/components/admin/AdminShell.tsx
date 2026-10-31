import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  Users,
  Building2,
  Sparkles,
  Rocket,
  TrendingUp,
  Instagram,
  Megaphone,
  Target,
  Search,
  Ruler,
  Calculator,
  UsersRound,
  UserCog,
  ShieldCheck,
  FileText,
  Settings,
  Boxes,
  Box,
  Landmark,
  ScanSearch,
  KanbanSquare,
  Command as CommandIcon,
  Star,
  StarOff,
  History,
  LifeBuoy,
  PanelsTopLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  Inbox,
  Factory,
  Zap,
  Wand2,
  AlertTriangle,
  Gauge,
  Globe,
  MessagesSquare,
  Plug,
  ScrollText,
  Images,
  Upload,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { useAuth } from "@/contexts/AuthContext";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Casca única da Central Administrativa AMT.
 *
 * Reúne todos os módulos administrativos do ecossistema
 * (AMT Fight Wear, AMT Dojo Manager e Growth) sob uma única sidebar,
 * topbar, breadcrumb, tema e guard de permissões.
 *
 * Camada 100% visual — nenhuma regra de negócio, rota ou permissão foi alterada.
 * A Central AMT é sempre clara: o tema escuro global não se aplica aqui.
 */
export function AdminShell({
  title,
  children,
  hideLayoutOnLoad = false,
  deniedDescription,
}: {
  title?: string;
  children: React.ReactNode;
  hideLayoutOnLoad?: boolean;
  /** Mensagem exibida quando a conta não tem permissão de acesso. */
  deniedDescription?: string;
}) {
  useForceLightTheme();

  return (
    <OwnerOnly showLoading={!hideLayoutOnLoad} description={deniedDescription}>
      {({ loading }) => (
        <SidebarProvider defaultOpen>
          <div className={cn(
            "admin-shell admin-surface flex min-h-dvh w-full overflow-hidden bg-background text-foreground transition-opacity duration-300",
            (loading && hideLayoutOnLoad) ? "opacity-0" : "opacity-100"
          )}>
            <AdminSidebar />
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <AdminTopbar title={title} />
              <main className="admin-main relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 transition-all duration-500 ease-in-out sm:p-6 lg:p-8">
                <div className="w-full break-words animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      )}
    </OwnerOnly>
  );
}

/* ------------------------------ Navegação ------------------------------- */

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = { label: string; items: NavItem[] };

/**
 * Mapa único de navegação da Central AMT.
 * As URLs permanecem apontando para as rotas atuais (compatibilidade total).
 * Cada URL aparece uma única vez e toda página administrativa (exceto telas de
 * detalhe e as subpáginas do Gerenciador de Anúncios, que tem menu próprio)
 * tem uma entrada aqui.
 */
const NAV: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { title: "Início", url: "/admin", icon: LayoutDashboard },
      { title: "Analytics Global", url: "/admin/dashboard", icon: TrendingUp },
    ],
  },
  {
    label: "Loja AMT Fight Wear",
    items: [
      { title: "Gestão da Loja", url: "/admin/loja", icon: Store },
      { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
      { title: "Orçamentos", url: "/admin/orcamentos", icon: FileText },
      { title: "Fila de produção", url: "/admin/producao", icon: Factory },
      { title: "Clientes da Loja", url: "/admin/clientes", icon: UserSquare2 },
      { title: "Atacado", url: "/admin/atacado", icon: Boxes },
      { title: "Logística / Envio", url: "/admin/envio", icon: Truck },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", url: "/admin/produtos", icon: Package },
      { title: "Imagens de produtos", url: "/admin/produtos/imagens", icon: Images },
      { title: "Importar catálogo", url: "/admin/produtos/importar", icon: Upload },
      { title: "Tabela de tamanhos", url: "/admin/produtos/tamanhos", icon: Ruler },
      { title: "Pacotes (dimensões)", url: "/admin/produtos/pacotes", icon: Box },
      { title: "Calc. de Faixas", url: "/admin/produtos/faixa-calc", icon: Calculator },
    ],
  },
  {
    label: "Fiscal",
    items: [
      { title: "Fiscal & Certificado", url: "/admin/fiscal", icon: Landmark },
      { title: "Central de Faturamento", url: "/admin/fiscal/pedidos", icon: Receipt },
    ],
  },
  {
    label: "Dojo Manager (SaaS)",
    items: [
      { title: "Assinaturas & Faturas", url: "/admin/dojo", icon: Building2 },
      { title: "Donos de Dojo", url: "/admin/clientes-growth", icon: UsersRound },
      { title: "Suporte Dojo Manager", url: "/admin/saas/suporte", icon: LifeBuoy },
      { title: "Notificações Global", url: "/admin/notificacoes", icon: BellRing },
    ],
  },
  {
    label: "Growth Engine",
    items: [
      { title: "Leads (Inbox)", url: "/admin/leads", icon: Target },
      { title: "Pipeline", url: "/admin/leads/pipeline", icon: KanbanSquare },
      { title: "Central de Prospecção", url: "/admin/prospect", icon: Globe },
      { title: "Prospects (Radar)", url: "/admin/leads/busca", icon: ScanSearch },
      { title: "Qualificados", url: "/admin/leads/qualificados", icon: Sparkles },
      { title: "Macro / Segmentos", url: "/admin/leads/macro", icon: TrendingUp },
      { title: "CRM Unificado", url: "/admin/crm", icon: Users },
      { title: "Atendimento", url: "/admin/atendimento", icon: MessageCircle },
      { title: "Logs de automação", url: "/admin/leads/logs", icon: ScrollText },
      { title: "Config. da prospecção", url: "/admin/leads/configuracoes", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Anúncios",
    items: [
      { title: "Ads Dashboard", url: "/admin/anuncios", icon: Megaphone },
      { title: "Nova campanha com IA", url: "/admin/anuncios/nova", icon: Wand2 },
      { title: "Campanhas IA", url: "/admin/anuncios/campanhas", icon: Rocket },
      { title: "Gerenciador de Anúncios", url: "/admin/ads", icon: Target },
      { title: "Criativos", url: "/admin/anuncios/criativos", icon: ImageIcon },
      { title: "Biblioteca de Copies", url: "/admin/anuncios/copies", icon: FileText },
      { title: "Otimização contínua", url: "/admin/anuncios/otimizacao", icon: Gauge },
      { title: "Escala", url: "/admin/anuncios/escala", icon: TrendingUp },
      { title: "Alertas", url: "/admin/anuncios/alertas", icon: AlertTriangle },
      { title: "Conexão Meta Ads", url: "/admin/anuncios/conexoes", icon: Plug },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Painel de marketing", url: "/admin/marketing/painel", icon: LayoutDashboard },
      { title: "Insights IA", url: "/admin/marketing", icon: Sparkles },
      { title: "Inteligência comercial", url: "/admin/marketing/inteligencia", icon: CommandIcon },
      { title: "KPIs de marketing", url: "/admin/marketing/kpis", icon: TrendingUp },
      { title: "Mercado", url: "/admin/marketing/mercado", icon: Globe },
      { title: "Pesquisa de preços", url: "/admin/marketing/precos", icon: Calculator },
      { title: "Conteúdo com IA", url: "/admin/marketing/conteudo", icon: Wand2 },
      { title: "CRM & E-mail", url: "/admin/marketing/crm-email", icon: Inbox },
      { title: "Analytics do catálogo", url: "/admin/marketing/catalogo", icon: Package },
    ],
  },
  {
    label: "Instagram",
    items: [
      { title: "Visão geral", url: "/admin/instagram", icon: LayoutDashboard },
      { title: "Inbox", url: "/admin/instagram/inbox", icon: Instagram },
      { title: "CRM do Instagram", url: "/admin/instagram/crm", icon: Users },
      { title: "Comentários e Menções", url: "/admin/instagram/comentarios", icon: MessagesSquare },
      { title: "Automações", url: "/admin/instagram/automacoes", icon: Sparkles },
      { title: "Conta do Instagram", url: "/admin/instagram/conta", icon: UserSquare2 },
      { title: "Webhook e logs", url: "/admin/instagram/admin", icon: ScrollText },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Usuários / Equipe", url: "/admin/usuarios", icon: UserCog },
      { title: "Conexões e APIs", url: "/admin/conexoes", icon: Plug },
      { title: "Logs & Segurança", url: "/admin/logs", icon: ShieldCheck },
      { title: "Ajustes do Sistema", url: "/admin/configuracoes", icon: Settings },
      { title: "Meu Perfil", url: "/admin/perfil", icon: UserSquare2 },
    ],
  },
];

const FLAT_NAV = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

/** Atalhos para as telas mais usadas (levam à página do módulo). */
const QUICK_ACTIONS: NavItem[] = [
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
  { title: "Orçamentos", url: "/admin/orcamentos", icon: FileText },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Leads", url: "/admin/leads", icon: Target },
  { title: "Nova campanha com IA", url: "/admin/anuncios/nova", icon: Wand2 },
];

/** Item de menu mais específico que corresponde à URL atual. */
function findActive(pathname: string) {
  return FLAT_NAV.filter(
    (i) => pathname === i.url || pathname.startsWith(`${i.url}/`),
  ).sort((a, b) => b.url.length - a.url.length)[0];
}

/* --------------------------- Favoritos / Recentes ------------------------ */

const FAV_KEY = "amt-admin-favorites";
const RECENT_KEY = "amt-admin-recents";
const CLOSED_GROUPS_KEY = "amt-admin-closed-groups";

function useLocalList(key: string, limit = 8) {
  const [list, setList] = React.useState<string[]>([]);
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setList(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, [key]);
  const persist = React.useCallback(
    (next: string[]) => {
      const capped = next.slice(0, limit);
      setList(capped);
      try {
        window.localStorage.setItem(key, JSON.stringify(capped));
      } catch {
        /* ignore */
      }
    },
    [key, limit],
  );
  return [list, persist] as const;
}

/* --------------------------------- Topbar -------------------------------- */

function AdminTopbar({ title }: { title?: string }) {
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
      <header className="admin-topbar sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <SidebarTrigger className="h-10 w-10 text-muted-foreground transition-colors hover:text-primary" />
        <div className="mx-1 hidden h-6 w-px bg-border/60 md:block" />

        <nav
          aria-label="Trilha de navegação"
          className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex"
        >
          {crumbs.map((c, i, arr) => (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-border" />}
              {i === arr.length - 1 ? (
                <span className="truncate font-medium text-foreground">{c.label}</span>
              ) : c.href ? (
                <Link to={c.href} className="truncate transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {title ? (
          <span className="truncate text-sm font-medium text-foreground md:hidden">{title}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-full pl-3 pr-2 text-xs font-normal text-muted-foreground shadow-sm transition-all hover:text-foreground lg:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Ir para um módulo</span>
            <kbd className="ml-4 inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              <CommandIcon className="h-3 w-3" />K
            </kbd>
          </Button>
          <IconAction
            icon={Search}
            label="Buscar"
            onClick={() => setOpen(true)}
            className="lg:hidden"
          />

          <QuickCreateMenu />

          <IconAction icon={Inbox} label="Atendimento" to="/admin/atendimento" />
          <IconAction icon={Bell} label="Notificações" to="/admin/notificacoes" />
          <IconAction icon={LifeBuoy} label="Suporte Dojo Manager" to="/admin/saas/suporte" />

          <EnvironmentBadge />
          <ProfileMenu />
        </div>
      </header>
      <AdminGlobalSearch open={open} onOpenChange={setOpen} />
    </>
  );
}

function IconAction({
  icon: Icon,
  label,
  to,
  onClick,
  dot,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  onClick?: () => void;
  dot?: boolean;
  className?: string;
}) {
  const { isMobile, setOpen } = useSidebar();

  const handleClick = () => {
    if (onClick) onClick();
    if (isMobile && setOpen) setOpen(false);
  };

  const inner = (
    <span className="relative grid h-10 w-10 place-items-center transition-transform hover:scale-105 active:scale-95">
      <Icon className="h-[18px] w-[18px]" />
      {dot ? (
        <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-primary ring-2 ring-background" />
      ) : null}
    </span>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Link
            to={to}
            aria-label={label}
            onClick={handleClick}
            className={cn(
              "rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              !className?.includes("lg:hidden") && "hidden sm:inline-flex",
              className,
            )}
          >
            {inner}
          </Link>
        ) : (
          <button
            type="button"
            aria-label={label}
            onClick={handleClick}
            className={cn(
              "rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              className,
            )}
          >
            {inner}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function QuickCreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-9 gap-1.5 rounded-xl px-3 text-xs shadow-sm transition-transform active:scale-[0.97]"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Atalhos</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Ir para
        </DropdownMenuLabel>
        {QUICK_ACTIONS.map((a) => (
          <DropdownMenuItem key={a.title} asChild>
            <Link to={a.url} className="flex items-center gap-2">
              <a.icon className="h-4 w-4 text-muted-foreground" />
              {a.title}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EnvironmentBadge() {
  const [env, setEnv] = React.useState<"preview" | "produção">("produção");
  React.useEffect(() => {
    const host = window.location.hostname;
    setEnv(host.includes("localhost") || host.includes("preview") ? "preview" : "produção");
  }, []);
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset xl:inline-flex",
        env === "preview"
          ? "bg-amber-500/10 text-amber-700 ring-amber-500/20"
          : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {env}
    </span>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const email = user?.email ?? null;
  const initials =
    (fullName ?? email ?? "AMT")
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "AMT";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Sessão encerrada");
      navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Não foi possível encerrar a sessão");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Perfil e conta"
          className="ml-1 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03]"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold">{fullName ?? "Central AMT"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {email ?? "Administração do ecossistema"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/admin/perfil" className="flex items-center gap-2">
            <UserSquare2 className="h-4 w-4 text-muted-foreground" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Ajustes do sistema
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dojo/app" className="flex items-center gap-2">
            <PanelsTopLeft className="h-4 w-4 text-muted-foreground" /> Ir para o Dojo Manager
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="flex items-center gap-2">
          <LogOut className="h-4 w-4 text-muted-foreground" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildBreadcrumbs(pathname: string): Array<{ label: string; href?: string }> {
  const active = findActive(pathname);
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Central AMT", href: "/admin" },
  ];
  if (active && active.url !== "/admin") {
    // O grupo é só um rótulo: não existe página própria para ele.
    crumbs.push({ label: active.group });
    crumbs.push({ label: active.title, href: active.url });
  }
  return crumbs;
}

/* ----------------------------- Busca global ------------------------------ */

function AdminGlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [recents] = useLocalList(RECENT_KEY);
  const [favorites] = useLocalList(FAV_KEY);

  const go = (url: string) => {
    onOpenChange(false);
    navigate({ to: url });
  };

  const byUrl = (url: string) => FLAT_NAV.find((i) => i.url === url);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar módulos e páginas da Central AMT…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        {favorites.length ? (
          <CommandGroup heading="Favoritos">
            {favorites.map(byUrl).map((item) =>
              item ? (
                <CommandItem
                  key={`fav-${item.url}`}
                  value={`favorito ${item.title}`}
                  onSelect={() => go(item.url)}
                >
                  <Star className="mr-2 h-4 w-4 text-amber-500" />
                  {item.title}
                </CommandItem>
              ) : null,
            )}
          </CommandGroup>
        ) : null}
        {recents.length ? (
          <CommandGroup heading="Recentes">
            {recents.map(byUrl).map((item) =>
              item ? (
                <CommandItem
                  key={`rec-${item.url}`}
                  value={`recente ${item.title}`}
                  onSelect={() => go(item.url)}
                >
                  <History className="mr-2 h-4 w-4 text-muted-foreground" />
                  {item.title}
                </CommandItem>
              ) : null,
            )}
          </CommandGroup>
        ) : null}
        {NAV.map((group, gi) => (
          <React.Fragment key={group.label}>
            {(gi > 0 || favorites.length || recents.length) && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={`${group.label}-${item.url}`}
                  value={`${group.label} ${item.title} ${item.url}`}
                  onSelect={() => go(item.url)}
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground/70">{item.url}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/* --------------------------------- Sidebar -------------------------------- */

function AdminSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [favorites, setFavorites] = useLocalList(FAV_KEY, 6);
  const [recents, setRecents] = useLocalList(RECENT_KEY, 5);
  // Grupos recolhidos pelo usuário (os demais ficam abertos).
  const [closedGroups, setClosedGroups] = useLocalList(CLOSED_GROUPS_KEY, NAV.length);
  const activeItem = findActive(pathname);

  // Destaca só o item mais específico (ex.: /admin/fiscal/pedidos não acende /admin/fiscal).
  const isActive = (url: string) => activeItem?.url === url;

  // Histórico de módulos visitados (apenas visual)
  React.useEffect(() => {
    if (!activeItem) return;
    setRecents([activeItem.url, ...recents.filter((u) => u !== activeItem.url)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleFavorite = (url: string) =>
    setFavorites(
      favorites.includes(url) ? favorites.filter((u) => u !== url) : [url, ...favorites],
    );

  const isGroupOpen = (label: string) =>
    activeItem?.group === label || !closedGroups.includes(label);
  const setGroupOpen = (label: string, open: boolean) =>
    setClosedGroups(open ? closedGroups.filter((g) => g !== label) : [...closedGroups, label]);

  const renderItem = (item: NavItem & { group?: string }, keyPrefix = "") => {
    const active = isActive(item.url);
    const fav = favorites.includes(item.url);
    return (
      <SidebarMenuItem key={keyPrefix + item.url} className="group/item relative">
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className={cn(
            "h-9 w-full rounded-xl transition-all duration-200",
            active
              ? "bg-primary/10 font-bold text-primary shadow-sm hover:bg-primary/15"
              : "text-foreground/80 hover:bg-muted hover:text-foreground",
          )}
        >
          <Link
            to={item.url}
            preload="intent"
            onClick={() => {
              if (isMobile) setOpen(false);
            }}
            className="flex items-center gap-2.5"
          >
            <item.icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
                active ? "text-primary" : "text-foreground/60 group-hover:text-foreground",
              )}
            />
            {!collapsed && <span className="truncate text-sm tracking-tight">{item.title}</span>}
          </Link>
        </SidebarMenuButton>
        {!collapsed ? (
          <button
            type="button"
            aria-label={fav ? `Remover ${item.title} dos favoritos` : `Favoritar ${item.title}`}
            onClick={() => toggleFavorite(item.url)}
            className={cn(
              "absolute right-1.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-amber-500 group-hover/item:grid",
              fav && "grid text-amber-500",
            )}
          >
            {fav ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="admin-sidebar border-r" data-admin="true">
      <SidebarHeader className="border-b bg-background/50 p-3 backdrop-blur-sm">
        <Link to="/admin" className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-opacity hover:opacity-80">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-black uppercase tracking-tight text-foreground">
                Central AMT
              </span>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground/80">
                Administração Global
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-background px-2 py-2">
        {favorites.length && !collapsed ? (
          <SidebarGroup className="px-0">
            <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Favoritos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favorites
                  .map((u) => FLAT_NAV.find((i) => i.url === u))
                  .filter(Boolean)
                  .map((i) => renderItem(i as NavItem, "fav-"))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {recents.length > 1 && !collapsed ? (
          <SidebarGroup className="px-0">
            <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Recentes
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recents
                  .slice(0, 3)
                  .map((u) => FLAT_NAV.find((i) => i.url === u))
                  .filter(Boolean)
                  .map((i) => renderItem(i as NavItem, "rec-"))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {NAV.map((group, gi) => {
          // Recolhida, a sidebar mostra só ícones: todos os grupos ficam visíveis.
          if (collapsed) {
            return (
              <SidebarGroup key={group.label} className="px-0">
                {gi > 0 ? <div className="mx-2 my-1.5 h-px bg-border/40" /> : null}
                <SidebarGroupContent>
                  <SidebarMenu>{group.items.map((item) => renderItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }
          const open = isGroupOpen(group.label);
          return (
            <Collapsible
              key={group.label}
              open={open}
              onOpenChange={(v) => setGroupOpen(group.label, v)}
            >
              <SidebarGroup className="px-0 py-1">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-lg px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 hover:bg-muted hover:text-foreground">
                    <span className="truncate">{group.label}</span>
                    <span className="ml-auto text-[10px] font-semibold tracking-normal text-muted-foreground/50">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !open && "-rotate-90")}
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>{group.items.map((item) => renderItem(item))}</SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t bg-background/50 p-2 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={collapsed ? "Ir para o Dojo Manager" : undefined}
              className="h-9 rounded-xl"
            >
              <Link
                to="/dojo/app"
                className="flex items-center gap-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                <PanelsTopLeft className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Ir para o Dojo Manager</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
