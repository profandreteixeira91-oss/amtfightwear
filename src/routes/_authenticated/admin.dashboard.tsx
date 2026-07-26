import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, BarChart3, MessageCircle, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { logsService } from "@/services/logsService";
import { profileService } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AMT Growth Engine" },
      { name: "description", content: "Visão geral da operação da AMT Fight Wear." },
    ],
  }),
  component: DashboardPage,
});

type KpiIcon = typeof BarChart3;

function DashboardPage() {
  const logsQuery = useQuery({
    queryKey: ["dashboard", "recent-logs"],
    queryFn: () => logsService.list(6),
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", "user-count"],
    queryFn: () => profileService.listAll(),
  });

  const kpisQuery = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
      const [leads, leadsNew, convs, posts] = await Promise.all([
        supabase.from("prospect_companies").select("id", { count: "exact", head: true }),
        supabase.from("prospect_companies").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
        supabase.from("ig_conversations").select("id", { count: "exact", head: true }),
        supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      return {
        leads: leads.count ?? 0,
        leadsNew: leadsNew.count ?? 0,
        convs: convs.count ?? 0,
        posts: posts.count ?? 0,
      };
    },
  });

  const kpis: Array<{ label: string; value: number; hint: string; icon: KpiIcon }> = [
    { label: "Leads captados", value: kpisQuery.data?.leads ?? 0, hint: `+${kpisQuery.data?.leadsNew ?? 0} nas últimas 24h`, icon: BarChart3 },
    { label: "Conversas Instagram", value: kpisQuery.data?.convs ?? 0, hint: "Inbox sincronizada", icon: MessageCircle },
    { label: "Posts publicados", value: kpisQuery.data?.posts ?? 0, hint: "Via piloto automático", icon: Activity },
    { label: "Usuários com acesso", value: usersQuery.data?.length ?? 0, hint: "Time da AMT", icon: Users },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Panorama operacional da AMT Fight Wear em tempo real."
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
                {kpisQuery.isLoading ? (
                  <Skeleton className="mt-3 h-8 w-24" />
                ) : (
                  <div className="mt-3 text-2xl font-bold tracking-tight">
                    {kpi.value.toLocaleString("pt-BR")}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">{kpi.hint}</div>
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
