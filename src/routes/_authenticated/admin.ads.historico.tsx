import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { amListAuditLog } from "@/lib/ads/ads-manager.functions";

export const Route = createFileRoute("/_authenticated/admin/ads/historico")({
  component: HistoryPage,
});

function HistoryPage() {
  const list = useServerFn(amListAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["ads-manager", "audit"],
    queryFn: () => list(),
    retry: false,
  });

  return (
    <Card className="min-w-0 overflow-hidden border-border/60 bg-card/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">Quando</th>
              <th className="px-3 py-2.5 font-semibold">Ação</th>
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-4 py-2.5 font-semibold">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td colSpan={4} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : !data?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <History className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 font-semibold">Nenhuma alteração registrada ainda</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Toda ação feita neste gerenciador fica registrada aqui.
                  </p>
                </td>
              </tr>
            ) : (
              data.map((log) => (
                <tr key={log.id} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                    {new Date(log.created_at as string).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px]">
                      {String(log.action).replace(/^ads\./, "")}
                    </Badge>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                    {log.entity_id ?? "—"}
                  </td>
                  <td className="max-w-[380px] truncate px-4 py-2.5 text-xs text-muted-foreground">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
