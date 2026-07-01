import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { UserSquare2, Search, Users, TrendingUp, ShoppingBag } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { growthService } from "@/services/growthService";
import { brl, intFmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/growth/customers")({
  head: () => ({ meta: [{ title: "Clientes — AMT Growth" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: growthService.customers,
    refetchInterval: 30_000,
  });

  const items = (data ?? []).filter((c) => {
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    return c.full_name.toLowerCase().includes(n) || (c.email ?? "").toLowerCase().includes(n) || (c.city ?? "").toLowerCase().includes(n);
  });

  const total = data?.length ?? 0;
  const revenue = (data ?? []).reduce((a, c) => a + Number(c.total_spent), 0);
  const avgOrders = total ? (data ?? []).reduce((a, c) => a + c.orders_count, 0) / total : 0;
  const ltv = total ? revenue / total : 0;

  return (
    <>
      <PageHeader eyebrow="Base ativa" title="Clientes" description="Segmentação e comportamento de compra da base AMT." />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Clientes" value={intFmt(total)} icon={Users} loading={isLoading} index={0} />
            <StatCard label="Receita da base" value={brl(revenue)} icon={TrendingUp} loading={isLoading} index={1} />
            <StatCard label="LTV médio" value={brl(ltv)} icon={UserSquare2} loading={isLoading} index={2} />
            <StatCard label="Pedidos / cliente" value={avgOrders.toFixed(1)} icon={ShoppingBag} loading={isLoading} index={3} />
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Base de clientes</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" className="pl-9" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-6">
                    <EmptyState icon={UserSquare2} title="Nenhum cliente ainda" description="Os clientes aparecerão aqui conforme forem adicionados." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden md:table-cell">Contato</TableHead>
                          <TableHead className="hidden md:table-cell">Cidade</TableHead>
                          <TableHead>Segmento</TableHead>
                          <TableHead className="text-right">Pedidos</TableHead>
                          <TableHead className="text-right">Total gasto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.full_name}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {c.email ?? c.phone ?? "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {[c.city, c.state].filter(Boolean).join(" / ") || "—"}
                            </TableCell>
                            <TableCell><Badge variant="secondary">{c.segment}</Badge></TableCell>
                            <TableCell className="text-right">{intFmt(c.orders_count)}</TableCell>
                            <TableCell className="text-right font-semibold">{brl(Number(c.total_spent))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </>
  );
}
