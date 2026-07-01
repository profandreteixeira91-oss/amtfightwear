import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { MessageSquare, Globe, MessageCircle, Instagram } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listSalesConversations } from "@/lib/sales.functions";

export const Route = createFileRoute("/_authenticated/sales/conversations")({
  component: SalesConversationsPage,
});

const channelIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe,
  whatsapp: MessageCircle,
  instagram: Instagram,
};

function SalesConversationsPage() {
  const list = useServerFn(listSalesConversations);
  const { data, isLoading } = useQuery({
    queryKey: ["sales-conversations"],
    queryFn: () => list(),
    refetchInterval: 20_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversas do SalesBot"
        description="Inbox unificado do agente de vendas: web, WhatsApp e Instagram."
      />
      <SectionCard title="Últimas conversas">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Nenhuma conversa ainda"
            description="Assim que o widget for embarcado no site ou os canais forem conectados, as conversas aparecerão aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((c, idx) => {
              const Icon = channelIcon[c.channel] ?? Globe;
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Link
                    to="/sales/conversations/$id"
                    params={{ id: c.id }}
                    className="flex items-center gap-3 py-3 hover:bg-accent/40 px-2 rounded-md transition"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {c.customer_name || c.customer_email || c.external_id}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {c.channel}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.customer_email || c.customer_phone || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.last_message_at
                        ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })
                        : "—"}
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
