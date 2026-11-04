import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import {
  LayoutDashboard,
  Store,
  Briefcase,
  KanbanSquare,
  MessagesSquare,
  Package,
  ShoppingCart,
  UserSquare2,
  MessageCircle,
  Truck,
  TrendingUp,
  Instagram,
  Megaphone,
  Search,
  Landmark,
  FileText,
  Settings,
  Boxes,
  Factory,
  Target,
  Sparkles,
  ChevronRight,
  LogOut,
  Bell,
  History,
  ExternalLink,
  Command as CommandIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { OwnerOnly } from "@/lib/auth/owner-only";
import { adminGetOpsInbox } from "@/lib/store/ops-inbox.functions";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";
import { useAuth } from "@/contexts/AuthContext";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
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
import { cn } from "@/lib/utils";
import amtLogo from "@/assets/amt-logo.jpg";

/**
 * Casca da Central da loja AMT Fight Wear.
 *
 * Sidebar vermelha (texto branco) com os módulos da loja; seções com várias
 * telas (Catálogo, Fiscal, Marketing, Configurações) mostram as subpáginas
 * como abas no topo do conteúdo, em vez de alongar o menu.
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
  useRedSidebarTheme();
  useRecordRecent();

  return (
    <OwnerOnly showLoading={!hideLayoutOnLoad} description={deniedDescription}>
      {({ loading }) => (
        <SidebarProvider defaultOpen>
          <div
            className={cn(
              "admin-shell flex min-h-dvh w-full overflow-hidden bg-neutral-50 text-foreground transition-opacity duration-300",
              loading && hideLayoutOnLoad ? "opacity-0" : "opacity-100",
            )}
          >
            <AdminSidebar />
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <AdminTopbar title={title} />
              <main className="admin-main relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
                <SectionTabs />
                <div className="mx-auto w-full max-w-[1600px] break-words p-4 animate-in fade-in duration-300 sm:p-6 lg:p-8">
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

type Tab = { title: string; url: string };
type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Subpáginas exibidas como abas no topo do conteúdo. */
  tabs?: Tab[];
  /** Tecla de atalho (F2…F6) que abre a página de qualquer tela do admin. */
  shortcut?: string;
};
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { title: "Início", url: "/admin", icon: LayoutDashboard },
      { title: "Analytics", url: "/admin/dashboard", icon: TrendingUp },
      { title: "Gestão da loja", url: "/admin/loja", icon: Store, shortcut: "F6" },
    ],
  },
  {
    label: "Vendas",
    items: [
      { title: "Central Comercial", url: "/admin/comercial", icon: Briefcase },
      { title: "WhatsApp", url: "/admin/whatsapp", icon: MessagesSquare },
      { title: "Pipeline", url: "/admin/crm", icon: KanbanSquare },
      { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart, shortcut: "F2" },
      { title: "Orçamentos", url: "/admin/orcamentos", icon: FileText, shortcut: "F3" },
      { title: "Produção", url: "/admin/producao", icon: Factory, shortcut: "F4" },
      { title: "Atendimento", url: "/admin/atendimento", icon: MessageCircle, shortcut: "F5" },
      { title: "Clientes", url: "/admin/clientes", icon: UserSquare2 },
      { title: "Atacado", url: "/admin/atacado", icon: Boxes },
      { title: "Envios", url: "/admin/envio", icon: Truck },
    ],
  },
  {
    label: "Catálogo",
    items: [
      {
        title: "Produtos",
        url: "/admin/produtos",
        icon: Package,
        tabs: [
          { title: "Produtos", url: "/admin/produtos" },
          { title: "Imagens", url: "/admin/produtos/imagens" },
          { title: "Importar", url: "/admin/produtos/importar" },
          { title: "Tabela de tamanhos", url: "/admin/produtos/tamanhos" },
          { title: "Pacotes", url: "/admin/produtos/pacotes" },
          { title: "Calculadora de faixas", url: "/admin/produtos/faixa-calc" },
        ],
      },
      {
        title: "Fiscal",
        url: "/admin/fiscal",
        icon: Landmark,
        tabs: [
          { title: "Fiscal e certificado", url: "/admin/fiscal" },
          { title: "Central de faturamento", url: "/admin/fiscal/pedidos" },
        ],
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        title: "Anúncios",
        url: "/admin/anuncios",
        icon: Megaphone,
        tabs: [
          { title: "Painel", url: "/admin/anuncios" },
          { title: "Nova campanha com IA", url: "/admin/anuncios/nova" },
          { title: "Campanhas IA", url: "/admin/anuncios/campanhas" },
          { title: "Gerenciador Meta", url: "/admin/ads" },
          { title: "Criativos", url: "/admin/anuncios/criativos" },
          { title: "Copies", url: "/admin/anuncios/copies" },
          { title: "Otimização", url: "/admin/anuncios/otimizacao" },
          { title: "Escala", url: "/admin/anuncios/escala" },
          { title: "Alertas", url: "/admin/anuncios/alertas" },
          { title: "Conexão Meta", url: "/admin/anuncios/conexoes" },
        ],
      },
      {
        title: "Marketing",
        url: "/admin/marketing/painel",
        icon: Sparkles,
        tabs: [
          { title: "Painel", url: "/admin/marketing/painel" },
          { title: "Insights IA", url: "/admin/marketing" },
          { title: "Inteligência comercial", url: "/admin/marketing/inteligencia" },
          { title: "KPIs", url: "/admin/marketing/kpis" },
          { title: "Mercado", url: "/admin/marketing/mercado" },
          { title: "Preços", url: "/admin/marketing/precos" },
          { title: "Conteúdo IA", url: "/admin/marketing/conteudo" },
          { title: "Catálogo", url: "/admin/marketing/catalogo" },
        ],
      },
      {
        title: "Instagram",
        url: "/admin/instagram",
        icon: Instagram,
        tabs: [
          { title: "Visão geral", url: "/admin/instagram" },
          { title: "Inbox", url: "/admin/instagram/inbox" },
          { title: "CRM", url: "/admin/instagram/crm" },
          { title: "Comentários", url: "/admin/instagram/comentarios" },
          { title: "Automações", url: "/admin/instagram/automacoes" },
          { title: "Conta", url: "/admin/instagram/conta" },
          { title: "Webhook e logs", url: "/admin/instagram/admin" },
        ],
      },
      {
        title: "Prospecção",
        url: "/admin/leads",
        icon: Target,
        tabs: [
          { title: "Leads", url: "/admin/leads" },
          { title: "Pipeline", url: "/admin/leads/pipeline" },
          { title: "Central de prospecção", url: "/admin/prospect" },
          { title: "Radar", url: "/admin/leads/busca" },
          { title: "Qualificados", url: "/admin/leads/qualificados" },
          { title: "Segmentos", url: "/admin/leads/macro" },
          { title: "Logs", url: "/admin/leads/logs" },
          { title: "Configurações", url: "/admin/leads/configuracoes" },
        ],
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        title: "Configurações",
        url: "/admin/configuracoes",
        icon: Settings,
        tabs: [
          { title: "Ajustes", url: "/admin/configuracoes" },
          { title: "Equipe", url: "/admin/usuarios" },
          { title: "Conexões e APIs", url: "/admin/conexoes" },
          { title: "Notificações", url: "/admin/notificacoes" },
          { title: "Logs e segurança", url: "/admin/logs" },
          { title: "Meu perfil", url: "/admin/perfil" },
        ],
      },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items.map((item) => ({ ...item, group: g.label })));

/** F2 Pedidos · F3 Orçamentos · F4 Produção · F5 Atendimento · F6 Gestão da loja. */
const SHORTCUTS = new Map(ALL_ITEMS.flatMap((i) => (i.shortcut ? [[i.shortcut, i] as const] : [])));

/**
 * Atalhos de teclado do admin. Substituem o padrão do navegador nessas teclas
 * (F5 não recarrega a página no admin). Com uma janela aberta (orçamento, pedido…)
 * não troca de tela, para não perder o que está sendo preenchido.
 */
function useAdminShortcuts() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const item = SHORTCUTS.get(e.key);
      if (!item || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      e.preventDefault();
      if (e.repeat) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
        toast.info("Feche a janela aberta antes de trocar de tela.");
        return;
      }
      void navigate({ to: item.url });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}

const matches = (pathname: string, url: string) =>
  url === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname === url || pathname.startsWith(`${url}/`);

/** Item (e aba) mais específicos que correspondem à URL atual. */
function findActive(pathname: string) {
  let best: { item: (typeof ALL_ITEMS)[number]; tab?: Tab; len: number } | null = null;
  for (const item of ALL_ITEMS) {
    for (const t of item.tabs ?? [{ title: item.title, url: item.url }]) {
      if (matches(pathname, t.url) && (!best || t.url.length > best.len)) {
        best = { item, tab: item.tabs ? t : undefined, len: t.url.length };
      }
    }
  }
  return best;
}

/** Pendências por item de menu (mesma consulta/cache do card "Precisa de ação" do Início). */
function useNavBadges(): Record<string, number> {
  const getInbox = useServerFn(adminGetOpsInbox);
  const { data } = useQuery({
    queryKey: ["admin", "central", "ops-inbox"],
    queryFn: () => getInbox(),
    refetchInterval: ADMIN_REFRESH.live,
    retry: false,
  });
  if (!data) return {};
  return {
    "/admin/pedidos": data.orders.toShip,
    "/admin/orcamentos": data.quotes.sent,
    "/admin/producao": data.production.late,
    "/admin/atendimento": data.chats.human,
    "/admin/whatsapp": data.chats.whatsappUnread,
  };
}

/* --------------------- Tema da sidebar / recentes ------------------------ */

/** O vermelho da sidebar vale só enquanto o admin está aberto (cobre também a versão mobile, num portal). */
function useRedSidebarTheme() {
  React.useEffect(() => {
    document.body.classList.add("admin-red-sidebar");
    return () => document.body.classList.remove("admin-red-sidebar");
  }, []);
}

const RECENT_KEY = "amt-admin-recents";

function readRecents(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function useRecordRecent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  React.useEffect(() => {
    const active = findActive(pathname);
    if (!active) return;
    const url = active.tab?.url ?? active.item.url;
    try {
      const next = [url, ...readRecents().filter((u) => u !== url)].slice(0, 6);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [pathname]);
}

/* --------------------------------- Sidebar -------------------------------- */

function AdminSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useNavBadges();
  const activeUrl = findActive(pathname)?.item.url;
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pb-2 pt-4">
        <Link
          to="/admin"
          onClick={() => isMobile && setOpenMobile(false)}
          className="flex items-center gap-3 rounded-xl px-1.5 py-1 text-white"
        >
          <img src={amtLogo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/25" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-bold tracking-tight">AMT Fight Wear</div>
              <div className="text-[11px] text-white/65">Central da loja</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 pb-4">
        {NAV.map((group) => (
          <SidebarGroup key={group.label} className="px-0 py-1.5">
            <SidebarGroupLabel className="h-7 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = activeUrl === item.url;
                  const count = badges[item.url] ?? 0;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={`${item.title}${count ? ` · ${count} pendente(s)` : ""}${item.shortcut ? ` (${item.shortcut})` : ""}`}
                        className={cn(
                          "h-10 rounded-xl px-2.5 text-[13.5px] font-medium text-white/85 transition-colors",
                          "hover:bg-white/10 hover:text-white",
                          "data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:shadow-sm",
                        )}
                      >
                        <Link to={item.url} onClick={() => isMobile && setOpenMobile(false)}>
                          <span className="relative">
                            <item.icon className="h-[18px] w-[18px]" />
                            {count > 0 && collapsed && (
                              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-300 ring-2 ring-[var(--sidebar)]" />
                            )}
                          </span>
                          <span className="truncate">{item.title}</span>
                          {!collapsed && (count > 0 || item.shortcut) && (
                            <span className="ml-auto flex items-center gap-1.5">
                              {count > 0 && (
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                                    active ? "bg-primary text-white" : "bg-white/20 text-white",
                                  )}
                                >
                                  {count > 99 ? "99+" : count}
                                </span>
                              )}
                              {item.shortcut && (
                                <kbd
                                  className={cn(
                                    "rounded border px-1 font-sans text-[10px] font-semibold leading-4",
                                    active ? "border-primary/30 text-primary/80" : "border-white/25 text-white/60",
                                  )}
                                >
                                  {item.shortcut}
                                </kbd>
                              )}
                            </span>
                          )}
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

      <SidebarFooter className="gap-1 border-t border-white/15 p-2">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Abrir a loja"
              className="h-10 rounded-xl px-2.5 text-[13px] text-white/85 hover:bg-white/10 hover:text-white"
            >
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="h-[18px] w-[18px]" />
                <span>Ver loja</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isMobile && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip={collapsed ? "Expandir menu" : "Recolher menu"}
                className="h-10 rounded-xl px-2.5 text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
              >
                {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
                <span>Recolher menu</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/* ------------------------------ Abas da seção ----------------------------- */

function SectionTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = findActive(pathname);
  const tabs = active?.item.tabs;
  if (!tabs || tabs.length < 2) return null;

  return (
    <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav
        aria-label={`Seções de ${active.item.title}`}
        className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 [scrollbar-width:none]"
      >
        {tabs.map((t) => {
          const on = active.tab?.url === t.url;
          return (
            <Link
              key={t.url}
              to={t.url}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3 py-3 text-[13px] font-medium transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                on ? "text-foreground after:bg-primary" : "text-muted-foreground after:bg-transparent hover:text-foreground",
              )}
            >
              {t.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* --------------------------------- Topbar -------------------------------- */

function AdminTopbar({ title }: { title?: string }) {
  const [open, setOpen] = React.useState(false);
  useAdminShortcuts();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = findActive(pathname);

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

  const crumbs: Array<{ label: string; href?: string }> = [{ label: "Central", href: "/admin" }];
  if (active && active.item.url !== "/admin") {
    crumbs.push({ label: active.item.group });
    crumbs.push({ label: active.item.title, href: active.item.url });
    if (active.tab && active.tab.url !== active.item.url) crumbs.push({ label: active.tab.title });
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:px-6">
        <SidebarTrigger className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground md:hidden" />

        <nav aria-label="Trilha de navegação" className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex">
          {crumbs.map((c, i, arr) => (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" />}
              {i === arr.length - 1 ? (
                <span className="truncate font-semibold text-foreground">{c.label}</span>
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
        <span className="truncate text-sm font-semibold md:hidden">{title ?? active?.item.title ?? "Central"}</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden h-9 w-64 items-center gap-2 rounded-full bg-neutral-100 px-3.5 text-xs text-muted-foreground transition-colors hover:bg-neutral-200/70 lg:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Ir para…</span>
            <kbd className="ml-auto inline-flex items-center gap-0.5 rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm ring-1 ring-neutral-200">
              <CommandIcon className="h-3 w-3" />K
            </kbd>
          </button>
          <TopbarIcon label="Buscar" onClick={() => setOpen(true)} className="lg:hidden">
            <Search className="h-[18px] w-[18px]" />
          </TopbarIcon>
          <TopbarIcon label="Notificações" to="/admin/notificacoes">
            <Bell className="h-[18px] w-[18px]" />
          </TopbarIcon>
          <ProfileMenu />
        </div>
      </header>
      <AdminCommand open={open} onOpenChange={setOpen} />
    </>
  );
}

function TopbarIcon({
  label,
  to,
  onClick,
  className,
  children,
}: {
  label: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    "grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground",
    className,
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Link to={to} aria-label={label} className={cls}>
            {children}
          </Link>
        ) : (
          <button type="button" aria-label={label} onClick={onClick} className={cls}>
            {children}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
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
          className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.04]"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold">{fullName ?? "Central da loja"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email ?? "AMT Fight Wear"}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/admin/perfil" className="flex items-center gap-2">
            <UserSquare2 className="h-4 w-4 text-muted-foreground" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" /> Ver loja
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="flex items-center gap-2">
          <LogOut className="h-4 w-4 text-muted-foreground" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ----------------------------- Busca (Ctrl+K) ----------------------------- */

function AdminCommand({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [recents, setRecents] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (open) setRecents(readRecents());
  }, [open]);

  const go = (url: string) => {
    onOpenChange(false);
    navigate({ to: url });
  };

  const titleOf = (url: string) => {
    for (const item of ALL_ITEMS) {
      if (item.url === url && !item.tabs) return item.title;
      const t = item.tabs?.find((x) => x.url === url);
      if (t) return t.url === item.url ? item.title : `${item.title} › ${t.title}`;
    }
    return null;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Ir para uma página da Central…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        {recents.length > 0 && (
          <CommandGroup heading="Recentes">
            {recents.map((url) => {
              const label = titleOf(url);
              return label ? (
                <CommandItem key={`rec-${url}`} value={`recente ${label}`} onSelect={() => go(url)}>
                  <History className="mr-2 h-4 w-4 text-muted-foreground" />
                  {label}
                </CommandItem>
              ) : null;
            })}
          </CommandGroup>
        )}
        {NAV.map((group) => (
          <React.Fragment key={group.label}>
            <CommandSeparator />
            <CommandGroup heading={group.label}>
              {group.items.flatMap((item) =>
                (item.tabs ?? [{ title: item.title, url: item.url }]).map((t) => (
                  <CommandItem
                    key={`${item.url}-${t.url}`}
                    value={`${group.label} ${item.title} ${t.title} ${t.url}`}
                    onSelect={() => go(t.url)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{item.tabs && t.url !== item.url ? `${item.title} › ${t.title}` : item.title}</span>
                  </CommandItem>
                )),
              )}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
