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
  GraduationCap,
  Plus,
  Moon,
  Sun,
  PanelsTopLeft,
  ChevronRight,
  LogOut,
  Bell,
  Inbox,
  Factory,
} from "lucide-react";
import { OwnerOnly } from "@/lib/auth/owner-only";
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
        <div className="admin-shell admin-surface flex min-h-dvh w-full overflow-hidden bg-background">
          <AdminSidebar />
          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <AdminTopbar title={title} />
            <main className="admin-main relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 transition-all duration-500 ease-in-out sm:p-8 lg:p-10">
              <div className="mx-auto w-full max-w-[1600px] break-words animate-in fade-in slide-in-from-bottom-2 duration-500">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
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
      { title: "Qualificados", url: "/admin/leads/qualificados", icon: Sparkles },
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
      { title: "Inteligência AI", url: "/admin/marketing/inteligencia", icon: CommandIcon },
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
      { title: "Pacotes (dimensões)", url: "/admin/produtos/pacotes", icon: Box },
      { title: "Fila de produção", url: "/admin/producao", icon: Factory },
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

const FLAT_NAV = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

const QUICK_ACTIONS: NavItem[] = [
  { title: "Novo pedido", url: "/admin/pedidos", icon: ShoppingCart },
  { title: "Novo orçamento", url: "/admin/orcamentos", icon: FileText },
  { title: "Novo produto", url: "/admin/produtos", icon: Package },
  { title: "Novo lead", url: "/admin/leads", icon: Target },
  { title: "Nova campanha", url: "/admin/anuncios", icon: Megaphone },
];

/* --------------------------- Favoritos / Recentes ------------------------ */

const FAV_KEY = "amt-admin-favorites";
const RECENT_KEY = "amt-admin-recents";

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
      <header className="admin-topbar sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md transition-all duration-300 sm:px-8">
        <SidebarTrigger className="h-10 w-10 text-muted-foreground transition-colors hover:text-primary" />
        <div className="mx-1 hidden h-6 w-px bg-border/60 md:block" />

        <nav
          aria-label="Trilha de navegação"
          className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex"
        >
          {crumbs.map((c, i, arr) => (
            <React.Fragment key={c.href + i}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-border" />}
              {i === arr.length - 1 ? (
                <span className="truncate font-medium text-foreground">{c.label}</span>
              ) : (
                <Link to={c.href} className="truncate transition-colors hover:text-foreground">
                  {c.label}
                </Link>
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
            <span>Buscar no ecossistema</span>
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

          <IconAction icon={Inbox} label="Mensagens" to="/admin/atendimento" />
          <IconAction icon={Bell} label="Notificações" to="/admin/notificacoes" dot />
          <IconAction icon={GraduationCap} label="Tutorial guiado" to="/dojo/app/tutorial" />
          <IconAction icon={LifeBuoy} label="Ajuda" to="/admin/configuracoes" />

          <ThemeToggle />
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
            className={cn(
              "rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              "hidden sm:inline-flex",
              className,
            )}
          >
            {inner}
          </Link>
        ) : (
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
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
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Criar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Acesso rápido
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

function ThemeToggle() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem("amt-admin-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };
  return (
    <IconAction
      icon={dark ? Sun : Moon}
      label={dark ? "Tema claro" : "Tema escuro"}
      onClick={toggle}
      className="hidden sm:inline-flex"
    />
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Perfil e conta"
          className="ml-1 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.03]"
        >
          AMT
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-semibold">Central AMT</p>
          <p className="text-xs font-normal text-muted-foreground">Administração do ecossistema</p>
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
        <DropdownMenuItem asChild>
          <Link to="/auth" className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-muted-foreground" /> Sair
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const active = FLAT_NAV.filter(
    (i) => pathname === i.url || pathname.startsWith(`${i.url}/`),
  ).sort((a, b) => b.url.length - a.url.length)[0];
  const crumbs: Array<{ label: string; href: string }> = [
    { label: "Central AMT", href: "/admin" },
  ];
  if (active) {
    crumbs.push({ label: active.group, href: active.url });
    if (active.url !== "/admin") crumbs.push({ label: active.title, href: active.url });
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
      <CommandInput placeholder="Buscar alunos, turmas, pedidos, módulos e relatórios…" />
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
  const hoverExpanded = React.useRef(false);

  const isActive = (url: string) =>
    url === "/admin"
      ? pathname === "/admin"
      : pathname === url || pathname.startsWith(`${url}/`);

  // Histórico de módulos visitados (apenas visual)
  React.useEffect(() => {
    const match = FLAT_NAV.filter(
      (i) => pathname === i.url || pathname.startsWith(`${i.url}/`),
    ).sort((a, b) => b.url.length - a.url.length)[0];
    if (!match) return;
    setRecents([match.url, ...recents.filter((u) => u !== match.url)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleFavorite = (url: string) =>
    setFavorites(
      favorites.includes(url) ? favorites.filter((u) => u !== url) : [url, ...favorites],
    );

  // Colapso inteligente: expande suavemente no hover quando recolhida
  const onEnter = () => {
    if (isMobile || state !== "collapsed") return;
    hoverExpanded.current = true;
    setOpen(true);
  };
  const onLeave = () => {
    if (isMobile || !hoverExpanded.current) return;
    hoverExpanded.current = false;
    setOpen(false);
  };

  const renderItem = (item: NavItem & { group?: string }, keyPrefix = "") => {
    const active = isActive(item.url);
    const fav = favorites.includes(item.url);
    return (
      <SidebarMenuItem key={keyPrefix + item.url} className="group/item relative">
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className="h-9 rounded-xl"
        >
          <Link
            to={item.url}
            preload="intent"
            onClick={() => {
              if (isMobile) setOpen(false);
            }}
            className={cn(
              "flex items-center gap-2.5 text-[13px] font-medium text-sidebar-foreground/85 transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active &&
                "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            {!collapsed && <span className="truncate">{item.title}</span>}
            {active && !collapsed ? (
              <span className="ml-auto h-4 w-1 shrink-0 rounded-full bg-primary" />
            ) : null}
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
    <Sidebar
      collapsible="icon"
      className="admin-sidebar border-r border-border"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <SidebarHeader className="border-b border-border/70 px-3 py-3">
        <Link to="/admin" className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
                Central AMT
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Ecossistema administrativo
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-2">
        {favorites.length && !collapsed ? (
          <SidebarGroup className="px-0">
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
            <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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

        {NAV.map((group, gi) => (
          <SidebarGroup key={group.label} className="px-0">
            {gi > 0 ? <div className="mx-2 my-1.5 h-px bg-border/70" /> : null}
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map((item) => renderItem(item))}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/70 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={collapsed ? "Tutorial guiado" : undefined}
              className="h-9 rounded-xl"
            >
              <Link
                to="/dojo/app/tutorial"
                className="flex items-center gap-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                <GraduationCap className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Tutorial guiado</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
