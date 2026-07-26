import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Instagram, Inbox, Users, TrendingUp, MessageCircle, Send, Bell, Trophy } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { getDashboardKpis } from "@/lib/ig-hub.functions";

export const Route = createFileRoute("/_authenticated/admin/instagram/")({
  component: InstagramDashboard,
});

function InstagramDashboard() {
  const fetchKpis = useServerFn(getDashboardKpis);
  const { data, isLoading } = useQuery({ queryKey: ["ig-kpis"], queryFn: () => fetchKpis() });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Instagram Hub"
        description="Central de relacionamento e prospecção via Instagram — conversas, leads e conversões em tempo real."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contas conectadas" value={data?.accounts ?? 0} icon={Instagram} loading={isLoading} index={0} />
        <StatCard label="Total de seguidores" value={data?.totalFollowers ?? 0} icon={Users} loading={isLoading} index={1} />
        <StatCard label="Conversas ativas" value={data?.activeConversations ?? 0} icon={Inbox} loading={isLoading} index={2} />
        <StatCard label="Novos leads (24h)" value={data?.newLeadsToday ?? 0} icon={TrendingUp} loading={isLoading} index={3} />
        <StatCard label="Mensagens pendentes" value={data?.pending ?? 0} icon={Bell} loading={isLoading} index={4} />
        <StatCard label="Enviadas (7d)" value={data?.sent7d ?? 0} icon={Send} loading={isLoading} index={5} />
        <StatCard label="Recebidas (7d)" value={data?.received7d ?? 0} icon={MessageCircle} loading={isLoading} index={6} />
        <StatCard label="Clientes originados IG" value={data?.customers ?? 0} icon={Trophy} loading={isLoading} index={7} />
      </div>
      <p className="text-sm text-muted-foreground">
        Total de leads originados do Instagram: <b>{data?.totalIgLeads ?? 0}</b>. Sincronização automática ocorre a cada hora
        (perfil, publicações, insights).
      </p>
    </motion.div>
  );
}
