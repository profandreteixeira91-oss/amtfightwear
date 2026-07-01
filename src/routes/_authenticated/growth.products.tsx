import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, TrendingUp, DollarSign, Boxes } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/growth/products")({
  head: () => ({ meta: [{ title: "Produtos — AMT Growth" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: growthService.products,
    refetchInterval: 30_000,
  });

  const items = (data ?? []).filter((p) => {
    if (!q.trim()) return true;
    const n = q.toLowerCase();
    return p.name.toLowerCase().includes(n) || (p.sku ?? "").toLowerCase().includes(n) || (p.category ?? "").toLowerCase().includes(n);
  });

  const totalSku = data?.length ?? 0;
  const totalStock = (data ?? []).reduce((a, p) => a + p.stock, 0);
  const avgPrice = totalSku ? (data ?? []).reduce((a, p) => a + Number(p.price), 0) / totalSku : 0;
  const margin = totalSku
    ? (data ?? []).reduce((a, p) => a + (Number(p.price) - Number(p.cost)), 0) / totalSku
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Gestão do catálogo AMT Fight Wear com margens e estoque."
      />

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="SKUs" value={intFmt(totalSku)} icon={Package} loading={isLoading} index={0} />
            <StatCard label="Estoque total" value={intFmt(totalStock)} icon={Boxes} loading={isLoading} index={1} />
            <StatCard label="Preço médio" value={brl(avgPrice)} icon={DollarSign} loading={isLoading} index={2} />
            <StatCard label="Margem média" value={brl(margin)} icon={TrendingUp} loading={isLoading} index={3} />
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Catálogo</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, SKU ou categoria" className="pl-9" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-6">
                    <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Cadastre produtos para começar a análise." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="hidden md:table-cell">SKU</TableHead>
                          <TableHead className="hidden md:table-cell">Categoria</TableHead>
                          <TableHead className="text-right">Preço</TableHead>
                          <TableHead className="text-right">Estoque</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.sku ?? "—"}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.category ?? "—"}</TableCell>
                            <TableCell className="text-right">{brl(Number(p.price))}</TableCell>
                            <TableCell className="text-right">{intFmt(p.stock)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                            </TableCell>
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
