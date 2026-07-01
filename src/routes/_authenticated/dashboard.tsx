import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { logsService } from "@/services/logsService";
import { profileService } from "@/services/profileService";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AMT Growth Engine" },
      { name: "description", content: "Visão geral da operação da AMT Fight Wear." },
    ],
  }),
  component: DashboardPage,
});

type Kpi = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: typeof BarChart3;
};

const kpis: Kpi[] = [
  { label: "Receita (30d)", value: "R$ 128.940", delta: "+12,4%", positive: true, icon: BarChart3 },
  { label: "Pedidos", value: "1.284", delta: "+8,1%", positive: true, icon: ShoppingBag },
  { label: "Clientes ativos", value: "312", delta: "+3,2%", positive: true, icon: Users },
  { label: "Ticket médio", value: "R$ 189,00", delta: "-1,1%", positive: false, icon: Activity },
];

function DashboardPage() {
  const logsQuery = useQuery({
    queryKey: ["dashboard", "recent-logs"],
    queryFn: () => logsService.list(6),
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", "user-count"],
    queryFn: () => profileService.listAll(),
  });

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Panorama da operação da AMT Fight Wear. Módulos de IA chegam em breve."
        actions={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            IA em breve
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {kpi.label}
                  </div>
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <kpi.icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold tracking-tight">{kpi.value}</div>
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                    kpi.positive ? "text-emerald-500" : "text-destructive"
                  }`}
                >
                  <ArrowUpRight className={`h-3 w-3 ${kpi.positive ? "" : "rotate-90"}`} />
                  {kpi.delta}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Atividade recente</CardTitle>
            <Badge variant="outline" className="font-normal">
              {logsQuery.data?.length ?? 0} eventos
            </Badge>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logsQuery.data && logsQuery.data.length > 0 ? (
              <ul className="divide-y divide-border">
                {logsQuery.data.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                        log.level === "error"
                          ? "bg-destructive"
                          : log.level === "warning"
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{log.action}</div>
                      {log.entity && (
                        <div className="truncate text-xs text-muted-foreground">
                          {log.entity}
                          {log.entity_id ? ` · ${log.entity_id}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma atividade registrada ainda.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time</CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold">{usersQuery.data?.length ?? 0}</div>
                <div className="text-xs text-muted-foreground">usuário(s) com acesso</div>
              </>
            )}
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Integrações</span>
                <Badge variant="secondary">Em breve</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Módulo IA</span>
                <Badge variant="secondary">Em breve</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
