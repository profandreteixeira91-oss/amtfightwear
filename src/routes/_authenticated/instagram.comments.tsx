import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listComments } from "@/lib/ig-hub.functions";

export const Route = createFileRoute("/_authenticated/instagram/comments")({
  component: IgComments,
});

function IgComments() {
  const fn = useServerFn(listComments);
  const { data, isLoading } = useQuery({ queryKey: ["ig-comments"], queryFn: () => fn() });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Comentários e Menções"
        description="Comentários recebidos nas publicações — recebidos em tempo real via webhook oficial."
      />
      <SectionCard>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nenhum comentário registrado ainda. Certifique-se de que o webhook está ativo no Meta App.
          </div>
        ) : (
          <div className="divide-y">
            {(data ?? []).map((c) => (
              <div key={c.id} className="flex items-start gap-3 py-3">
                <MessageCircle className="mt-1 h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">@{c.from_username ?? "—"}</div>
                  <div className="text-sm">{c.text ?? "—"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                    {c.replied ? <Badge variant="outline" className="ml-2">Respondido</Badge> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
