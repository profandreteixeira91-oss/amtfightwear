import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDollarSign,
  Eye,
  Radio,
  Sparkles,
  TrendingUp,
  Users2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PageShell } from "@/components/common/PageShell";
import { AdminPushCard } from "@/components/store/AdminPushCard";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListDojoAccounts,
  adminGetDojoLandingStats,
  type DojoAccountRow,
} from "@/lib/store/dojo-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/saas")({
  head: () => ({
    meta: [
      { title: "Dojo Manager — Painel Admin" },
      {
        name: "description",
        content:
          "Assinaturas, contas de donos de dojo e visitas da landing do AMT Dojo Manager em tempo real.",
      },
    ],
  }),
  component: StoreDojoManagerAdminPage,
});

function fmtBRL(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}
function fmtInt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString("pt-BR");
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type StatusFilter = "all" | "trial" | "active" | "pending" | "cancelled" | "none";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  trial: { label: "Em trial", variant: "secondary" },
  authorized: { label: "Pago", variant: "default" },
  active: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "outline" },
  paused: { label: "Pausada", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  none: { label: "Sem assinatura", variant: "outline" },
};

function statusBadge(status: string | null) {
  const key = status ?? "none";
  const meta = STATUS_META[key] ?? { label: key, variant: "outline" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function normalizeStatus(s: string | null): StatusFilter | "other" {
  if (!s) return "none";
  if (s === "trial") return "trial";
  if (s === "authorized" || s === "active") return "active";
  if (s === "pending") return "pending";
  if (s === "cancelled" || s === "paused") return "cancelled";
  if (s === "none") return "none";
  return "other";
}

const REFRESH_MS = 15_000;

function StoreDojoManagerAdminPage() {
  const fetchAccounts = useServerFn(adminListDojoAccounts);
  const fetchStats = useServerFn(adminGetDojoLandingStats);
  const qc = useQueryClient();

  const accountsQ = useQuery({
    queryKey: ["admin", "dojo-accounts"],
    queryFn: () => fetchAccounts(),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  });
  const statsQ = useQuery({
    queryKey: ["admin", "dojo-landing-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  // Live push: refetch instantly when new visits / subscription changes hit the DB.
  useEffect(() => {
    const ch = supabase
      .channel("admin-dojo-manager-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "store_visits" },
        () => qc.invalidateQueries({ queryKey: ["admin", "dojo-landing-stats"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_subscriptions" },
        () => qc.invalidateQueries({ queryKey: ["admin", "dojo-accounts"] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dojo_academy_profile" },
        () => qc.invalidateQueries({ queryKey: ["admin", "dojo-accounts"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dojo_users" },
        () => qc.invalidateQueries({ queryKey: ["admin", "dojo-accounts"] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => qc.invalidateQueries({ queryKey: ["admin", "dojo-accounts"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const accounts = (accountsQ.data ?? []) as DojoAccountRow[];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== "all" && normalizeStatus(a.sub_status) !== statusFilter) return false;
      if (!term) return true;
      return [a.email, a.full_name, a.trade_name, a.legal_name, a.city, a.state, a.slug]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [accounts, q, statusFilter]);

  const kpis = useMemo(() => {
    const total = accounts.length;
    let trial = 0,
      paid = 0,
      pending = 0,
      cancelled = 0,
      none = 0,
      mrr = 0;
    for (const a of accounts) {
      const n = normalizeStatus(a.sub_status);
      if (n === "trial") trial++;
      else if (n === "active") {
        paid++;
        mrr += Number(a.sub_plan_amount ?? 0);
      } else if (n === "pending") pending++;
      else if (n === "cancelled") cancelled++;
      else if (n === "none") none++;
    }
    const conv = total > 0 ? (paid / total) * 100 : 0;
    return { total, trial, paid, pending, cancelled, none, mrr, conv };
  }, [accounts]);

  const stats = statsQ.data;

  const recentAccounts = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [accounts],
  );

  const lastUpdated = useMemo(() => {
    const ts = Math.max(accountsQ.dataUpdatedAt ?? 0, statsQ.dataUpdatedAt ?? 0);
    return ts ? new Date(ts) : null;
  }, [accountsQ.dataUpdatedAt, statsQ.dataUpdatedAt]);

  const anyLoading = accountsQ.isFetching || statsQ.isFetching;

  return (
    <PageShell
      eyebrow="Admin"
      title="AMT Dojo Manager"
      description="Contas de donos de dojo, status das assinaturas e visitas da landing page."
    >
      {/* Hero live bar */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,oklch(0.20_0.05_25),oklch(0.08_0.02_25))] p-5 text-primary-foreground shadow-[0_20px_60px_-30px_oklch(0.56_0.235_27/0.6)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <div className="text-sm font-medium tracking-wide">
              <span className="uppercase text-emerald-300/90">Ao vivo</span>
              <span className="mx-2 text-white/30">·</span>
              <span className="text-white/80">
                Última atualização{" "}
                {lastUpdated ? fmtTime(lastUpdated) : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Radio className={`h-3.5 w-3.5 ${anyLoading ? "animate-pulse text-emerald-300" : ""}`} />
            <span>Atualiza a cada 15s + push realtime</span>
          </div>
        </div>
      </div>

      {/* Instalação PWA + notificações push admin */}
      <div className="mb-6">
        <AdminPushCard />
      </div>

      {/* KPIs premium */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Building2 className="h-4 w-4" />}
          label="Contas de donos"
          value={accountsQ.isLoading ? "…" : fmtInt(kpis.total)}
          hint="Academias cadastradas no sistema"
          tone="primary"
        />
        <KpiCard
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="Assinaturas pagas"
          value={accountsQ.isLoading ? "…" : fmtInt(kpis.paid)}
          hint={`MRR estimado ${fmtBRL(kpis.mrr)} · Conv. ${kpis.conv.toFixed(1)}%`}
          tone="success"
        />
        <KpiCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Em trial"
          value={accountsQ.isLoading ? "…" : fmtInt(kpis.trial)}
          hint={`Pendentes ${kpis.pending} · Cancel. ${kpis.cancelled} · Sem ${kpis.none}`}
          tone="warning"
        />
        <KpiCard
          icon={<Eye className="h-4 w-4" />}
          label="Visitas /dojo (30d)"
          value={statsQ.isLoading ? "…" : fmtInt(stats?.pageviews.month)}
          hint={`Únicos 30d ${fmtInt(stats?.visitors.month)} · 7d ${fmtInt(stats?.visitors.week)} · 24h ${fmtInt(stats?.visitors.day)}`}
          tone="accent"
        />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <div className="-mx-1 overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="accounts">Contas & Assinaturas</TabsTrigger>
            <TabsTrigger value="visits">Visitas da landing</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Tráfego da landing /dojo</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Pageviews e visitantes únicos — últimos 30 dias
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="h-72">
                {statsQ.isLoading || !stats ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="uqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.72 0.16 155)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="oklch(0.72 0.16 155)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pv"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#pvGrad)"
                        name="Pageviews"
                      />
                      <Area
                        type="monotone"
                        dataKey="uniq"
                        stroke="oklch(0.72 0.16 155)"
                        strokeWidth={2}
                        fill="url(#uqGrad)"
                        name="Únicos"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mix de assinaturas</CardTitle>
                <p className="text-xs text-muted-foreground">Distribuição atual das contas</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <MixBar label="Pagas" value={kpis.paid} total={kpis.total || 1} color="oklch(0.72 0.16 155)" />
                <MixBar label="Em trial" value={kpis.trial} total={kpis.total || 1} color="hsl(var(--primary))" />
                <MixBar label="Pendentes" value={kpis.pending} total={kpis.total || 1} color="oklch(0.75 0.16 75)" />
                <MixBar label="Canceladas" value={kpis.cancelled} total={kpis.total || 1} color="oklch(0.65 0.02 20)" />
                <MixBar label="Sem assinatura" value={kpis.none} total={kpis.total || 1} color="oklch(0.55 0.02 20)" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Últimos cadastros</CardTitle>
                <Users2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                {accountsQ.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentAccounts.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Sem contas ainda.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentAccounts.map((a) => (
                      <li key={a.owner_id} className="flex items-center justify-between py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {a.trade_name || a.legal_name || a.full_name || a.email || "—"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {a.email || "—"}
                            {a.city ? ` · ${a.city}${a.state ? "/" + a.state : ""}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusBadge(a.sub_status)}
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(a.created_at)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Principais origens (30d)</CardTitle>
                <p className="text-xs text-muted-foreground">De onde vem o tráfego para /dojo</p>
              </CardHeader>
              <CardContent className="pt-0">
                {statsQ.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (stats?.referrers ?? []).length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Sem dados de origem no período.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {(stats?.referrers ?? []).slice(0, 6).map((r) => {
                      const max = Math.max(...(stats?.referrers ?? []).map((x) => x.count), 1);
                      const pct = (r.count / max) * 100;
                      return (
                        <li key={r.host}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="truncate font-medium">{r.host}</span>
                            <span className="text-muted-foreground">{fmtInt(r.count)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accounts */}
        <TabsContent value="accounts" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Donos de dojo cadastrados</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Buscar por nome, e-mail, cidade…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="sm:w-72"
                />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="sm:w-56">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="trial">Em trial</SelectItem>
                    <SelectItem value="active">Pagas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="cancelled">Canceladas / pausadas</SelectItem>
                    <SelectItem value="none">Sem assinatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {accountsQ.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma conta encontrada com os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academia</TableHead>
                        <TableHead>Dono</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Trial até</TableHead>
                        <TableHead>Próx. cobrança</TableHead>
                        <TableHead className="text-right">Alunos</TableHead>
                        <TableHead className="text-right">Filiais</TableHead>
                        <TableHead>Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((a) => (
                        <TableRow key={a.owner_id}>
                          <TableCell>
                            <div className="font-medium">
                              {a.trade_name || a.legal_name || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {[a.city, a.state].filter(Boolean).join(" / ") || "—"}
                              {a.slug ? ` · /${a.slug}` : ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{a.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.email || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {a.whatsapp || a.phone || ""}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(a.sub_status)}</TableCell>
                          <TableCell>{fmtBRL(a.sub_plan_amount)}</TableCell>
                          <TableCell>{fmtDate(a.sub_trial_ends_at)}</TableCell>
                          <TableCell>{fmtDate(a.sub_current_period_end)}</TableCell>
                          <TableCell className="text-right">{a.students_count}</TableCell>
                          <TableCell className="text-right">{a.units_count}</TableCell>
                          <TableCell>{fmtDate(a.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visits */}
        <TabsContent value="visits" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["24h", stats?.pageviews.day, stats?.visitors.day],
                ["7 dias", stats?.pageviews.week, stats?.visitors.week],
                ["30 dias", stats?.pageviews.month, stats?.visitors.month],
              ] as const
            ).map(([label, pv, u]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {statsQ.isLoading ? "…" : fmtInt(pv)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Visitantes únicos: {fmtInt(u)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Visitas em /dojo (últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {statsQ.isLoading || !stats ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.series} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pvGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pv"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#pvGrad2)"
                      name="Pageviews"
                    />
                    <Area
                      type="monotone"
                      dataKey="uniq"
                      stroke="oklch(0.72 0.16 155)"
                      strokeWidth={2}
                      fillOpacity={0}
                      name="Únicos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Principais origens (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {statsQ.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (stats?.referrers ?? []).length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Sem dados de origem no período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-right">Visitas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stats?.referrers ?? []).map((r) => (
                        <TableRow key={r.host}>
                          <TableCell className="max-w-[240px] truncate">{r.host}</TableCell>
                          <TableCell className="text-right">{fmtInt(r.count)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "primary" | "success" | "warning" | "accent";
}) {
  const toneStyles: Record<string, { bg: string; ring: string; icon: string }> = {
    primary: {
      bg: "bg-[linear-gradient(140deg,oklch(0.98_0.01_25)_0%,oklch(0.94_0.03_25)_100%)] dark:bg-[linear-gradient(140deg,oklch(0.16_0.04_25)_0%,oklch(0.10_0.02_25)_100%)]",
      ring: "ring-primary/20",
      icon: "bg-primary/10 text-primary",
    },
    success: {
      bg: "bg-[linear-gradient(140deg,oklch(0.97_0.03_155)_0%,oklch(0.92_0.06_155)_100%)] dark:bg-[linear-gradient(140deg,oklch(0.18_0.04_155)_0%,oklch(0.10_0.02_155)_100%)]",
      ring: "ring-emerald-500/20",
      icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    warning: {
      bg: "bg-[linear-gradient(140deg,oklch(0.97_0.04_75)_0%,oklch(0.92_0.08_75)_100%)] dark:bg-[linear-gradient(140deg,oklch(0.18_0.04_75)_0%,oklch(0.10_0.02_75)_100%)]",
      ring: "ring-amber-500/20",
      icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    accent: {
      bg: "bg-[linear-gradient(140deg,oklch(0.97_0.02_250)_0%,oklch(0.92_0.05_250)_100%)] dark:bg-[linear-gradient(140deg,oklch(0.18_0.04_250)_0%,oklch(0.10_0.02_250)_100%)]",
      ring: "ring-sky-500/20",
      icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
  };
  const s = toneStyles[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/60 p-5 ring-1 ${s.ring} ${s.bg} transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.icon}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function MixBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {fmtInt(value)} <span className="opacity-60">· {pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
