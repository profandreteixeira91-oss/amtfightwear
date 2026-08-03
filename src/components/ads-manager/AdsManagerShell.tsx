import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  CalendarRange,
  Crosshair,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  History,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RANGE_PRESETS, useAdsManager } from "./AdsManagerContext";
import { amListAccounts } from "@/lib/ads/ads-manager.functions";
import { brl } from "@/lib/format";
import { NewCampaignDialog } from "./NewCampaignDialog";

const NAV: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin/ads", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/ads/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/admin/ads/conjuntos", label: "Conjuntos de anúncios", icon: Boxes },
  { to: "/admin/ads/anuncios", label: "Anúncios", icon: Sparkles },
  { to: "/admin/ads/publicos", label: "Públicos", icon: Users },
  { to: "/admin/ads/criativos", label: "Criativos", icon: Target },
  { to: "/admin/ads/midias", label: "Biblioteca de mídias", icon: ImageIcon },
  { to: "/admin/ads/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/ads/pixel", label: "Pixel", icon: Crosshair },
  { to: "/admin/ads/historico", label: "Histórico", icon: History },
  { to: "/admin/ads/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/ads/ia-agent", label: "Tráfego IA", icon: Bot },
];

export function AdsManagerShell({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { accountId, setAccountId, preset, setPreset, range, search, setSearch, refresh } =
    useAdsManager();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [newOpen, setNewOpen] = useState(false);

  const listAccounts = useServerFn(amListAccounts);
  const { data: accounts } = useQuery({
    queryKey: ["ads-manager", "accounts"],
    queryFn: () => listAccounts(),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const active = accounts?.find((a) => a.id === (accountId ?? accounts?.[0]?.id));

  const handleRefresh = () => {
    refresh();
    void qc.invalidateQueries({ queryKey: ["ads-manager"] });
  };

  return (
    <div className="min-w-0">
      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Sub-navegação */}
        <nav aria-label="Gerenciador de anúncios" className="min-w-0">
          <div className="rounded-xl border border-border/60 bg-card/60 p-2 backdrop-blur-sm lg:sticky lg:top-4">
            <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Gerenciador
            </div>
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {NAV.map((item) => {
                const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <li key={item.to} className="shrink-0 lg:shrink">
                    <Link
                      to={item.to as "/admin/ads"}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="min-w-0">
          {/* Barra superior */}
          <div className="mb-4 rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={active?.id ?? ""}
                onValueChange={(v) => setAccountId(v)}
              >
                <SelectTrigger className="h-9 w-full min-w-0 sm:w-[240px]">
                  <SelectValue placeholder="Conta de anúncios" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="h-9 w-full min-w-0 sm:w-[180px]">
                  <CalendarRange className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, ID ou objetivo"
                  className="h-9 pl-8"
                  aria-label="Pesquisa instantânea"
                />
              </div>

              <Button variant="outline" size="sm" className="h-9" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar Meta
              </Button>
              <Button size="sm" className="h-9" onClick={() => setNewOpen(true)}>
                <Megaphone className="mr-2 h-4 w-4" />
                Nova campanha
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="gap-1 font-mono text-[10px]">
                {active?.id ?? "conta não carregada"}
              </Badge>
              {active ? (
                <>
                  <span>·</span>
                  <span>{active.currency}</span>
                  <span>·</span>
                  <span>{active.timezone}</span>
                  <span>·</span>
                  <span>Investimento total {brl(active.spent)}</span>
                </>
              ) : null}
              <span>·</span>
              <span>
                {range.since} → {range.until}
              </span>
            </div>
          </div>

          {children}
        </div>
      </div>

      <NewCampaignDialog open={newOpen} onOpenChange={setNewOpen} accountId={active?.id ?? null} />
    </div>
  );
}
