import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  adminListDojoAccounts,
  adminGetDojoLandingStats,
  type DojoAccountRow,
} from "@/lib/store/dojo-admin.functions";

export const Route = createFileRoute("/_authenticated/store/dojo-manager")({
  head: () => ({
    meta: [
      { title: "Dojo Manager — Painel Admin" },
      {
        name: "description",
        content:
          "Assinaturas, contas de donos de dojo e visitas da landing do AMT Dojo Manager.",
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
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
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

function StoreDojoManagerAdminPage() {
  const fetchAccounts = useServerFn(adminListDojoAccounts);
  const fetchStats = useServerFn(adminGetDojoLandingStats);

  const accountsQ = useQuery({
    queryKey: ["admin", "dojo-accounts"],
    queryFn: () => fetchAccounts(),
  });
  const statsQ = useQuery({
    queryKey: ["admin", "dojo-landing-stats"],
    queryFn: () => fetchStats(),
  });

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
    return { total, trial, paid, pending, cancelled, none, mrr };
  }, [accounts]);

  const stats = statsQ.data;

  return (
    <PageShell
      eyebrow="Admin"
      title="AMT Dojo Manager"
      description="Contas de donos de dojo, status das assinaturas e visitas da landing page."
    >
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Contas de donos
            </div>
            <div className="mt-2 text-2xl font-bold">
              {accountsQ.isLoading ? "…" : kpis.total.toLocaleString("pt-BR")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Apenas donos de dojo (com academia cadastrada)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Assinaturas pagas
            </div>
            <div className="mt-2 text-2xl font-bold">
              {accountsQ.isLoading ? "…" : kpis.paid.toLocaleString("pt-BR")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              MRR estimado: {fmtBRL(kpis.mrr)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Em trial
            </div>
            <div className="mt-2 text-2xl font-bold">
              {accountsQ.isLoading ? "…" : kpis.trial.toLocaleString("pt-BR")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Pendentes: {kpis.pending} · Canceladas: {kpis.cancelled} · Sem: {kpis.none}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Visitas /dojo (30d)
            </div>
            <div className="mt-2 text-2xl font-bold">
              {statsQ.isLoading ? "…" : (stats?.pageviews.month ?? 0).toLocaleString("pt-BR")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Únicos 30d: {(stats?.visitors.month ?? 0).toLocaleString("pt-BR")} · 7d:{" "}
              {(stats?.visitors.week ?? 0).toLocaleString("pt-BR")} · 24h:{" "}
              {(stats?.visitors.day ?? 0).toLocaleString("pt-BR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="mt-6">
        <TabsList>
          <TabsTrigger value="accounts">Contas & Assinaturas</TabsTrigger>
          <TabsTrigger value="visits">Visitas da landing</TabsTrigger>
        </TabsList>

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
                    {statsQ.isLoading ? "…" : (pv ?? 0).toLocaleString("pt-BR")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Visitantes únicos: {(u ?? 0).toLocaleString("pt-BR")}
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
                  <AreaChart data={stats.series}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="pv"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      name="Pageviews"
                    />
                    <Area
                      type="monotone"
                      dataKey="uniq"
                      stroke="hsl(var(--accent-foreground))"
                      fill="hsl(var(--accent-foreground))"
                      fillOpacity={0.15}
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
                        <TableCell>{r.host}</TableCell>
                        <TableCell className="text-right">
                          {r.count.toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
