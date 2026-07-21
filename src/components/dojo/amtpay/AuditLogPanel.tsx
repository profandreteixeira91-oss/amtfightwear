import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { listAuditLogs } from "@/lib/dojo/audit-logs.functions";

const statusColor: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  error: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function AuditLogPanel() {
  const listFn = useServerFn(listAuditLogs);
  const [filters, setFilters] = useState<{
    eventType?: string;
    entityType?: string;
    gateway?: string;
  }>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["amtpay", "audit", filters],
    queryFn: () => listFn({ data: filters }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auditoria financeira</CardTitle>
          <CardDescription>
            Registro imutável de cobranças, pagamentos, saques e webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Tipo de evento</Label>
            <Input
              placeholder="payment.received"
              value={filters.eventType ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, eventType: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Entidade</Label>
            <Input
              placeholder="billing, payment, withdrawal..."
              value={filters.entityType ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, entityType: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Gateway</Label>
            <Input
              placeholder="asaas"
              value={filters.gateway ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, gateway: e.target.value || undefined })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Nenhum evento registrado no período.
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((r: any) => (
                <details key={r.id} className="p-4 group">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={statusColor[r.status] ?? "bg-muted"}>
                        {r.status ?? "—"}
                      </Badge>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.event_type}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.entity_type ?? "—"} · {r.gateway ?? "—"} · {r.message ?? ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>
                  </summary>
                  <pre className="mt-3 text-xs bg-muted/40 rounded p-3 overflow-auto max-h-96">
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
