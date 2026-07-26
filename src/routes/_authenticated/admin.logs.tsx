import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";

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
import { PageHeader } from "@/components/common/PageHeader";
import { logsService } from "@/services/logsService";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({
    meta: [
      { title: "Logs — AMT Growth Engine" },
      { name: "description", content: "Histórico de atividades do sistema." },
    ],
  }),
  component: LogsPage,
});

const levelVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  success: "default",
  warning: "outline",
  error: "destructive",
};

function LogsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsService.list(200),
  });

  const filtered = (data ?? []).filter((l) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      l.action.toLowerCase().includes(needle) ||
      (l.entity ?? "").toLowerCase().includes(needle) ||
      (l.entity_id ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Auditoria"
        title="Logs"
        description="Histórico completo de atividades registradas na plataforma."
      />

      <Card>
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <CardTitle className="min-w-0 truncate text-base">
            {isLoading ? "Carregando..." : `${filtered.length} evento(s)`}
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtrar por ação ou entidade"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nível</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead className="hidden md:table-cell">Entidade</TableHead>
                    <TableHead className="text-right">Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant={levelVariant[log.level] ?? "secondary"}>
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {log.entity
                            ? `${log.entity}${log.entity_id ? ` · ${log.entity_id}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        Nenhum evento registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
