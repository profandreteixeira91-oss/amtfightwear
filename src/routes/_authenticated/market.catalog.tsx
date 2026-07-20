import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart4, Package, AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/market/catalog")({
  head: () => ({ meta: [{ title: "AMT MarketEngine — Analytics Catálogo" }] }),
  component: CatalogPage,
});

async function fetchCatalog() {
  const { data, error } = await supabase.from("products").select("*").order("price", { ascending: false });
  if (error) throw error;
  return data as {
    id: string; name: string; category: string | null; price: number; stock: number; image_url: string | null;
  }[];
}

function CatalogPage() {
  const { data: products, isLoading } = useQuery({ queryKey: ["catalog"], queryFn: fetchCatalog, refetchInterval: 60_000 });

  const total = products?.length ?? 0;
  const avgPrice = total ? (products!.reduce((s, p) => s + Number(p.price), 0) / total) : 0;
  const lowStock = (products ?? []).filter((p) => (p.stock ?? 0) > 0 && p.stock < 5);
  const byCategory = new Map<string, number>();
  (products ?? []).forEach((p) => byCategory.set(p.category ?? "Outros", (byCategory.get(p.category ?? "Outros") ?? 0) + 1));
  const cats = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <PageShell
        eyebrow="MarketEngine"
        title="Analytics Catálogo"
        description="Métricas reais do catálogo AMT Fight Wear sincronizado com amtfightwear.com.br."
      >

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
          <>
            <StatCard label="Produtos no catálogo" value={String(total)} icon={Package} />
            <StatCard label="Ticket médio" value={brl(avgPrice)} icon={BarChart4} />
            <StatCard label="SKUs com estoque baixo" value={String(lowStock.length)} icon={AlertTriangle} />
          </PageShell>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Distribuição por categoria" className="lg:col-span-2">
          {isLoading ? <Skeleton className="h-64" /> : cats.length === 0 ? (
            <EmptyState title="Nenhum produto no catálogo" />
          ) : (
            <div className="space-y-2">
              {cats.map(([cat, count]) => {
                const pct = (count / total) * 100;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{cat}</span><span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Estoque baixo" delay={0.1}>
          {isLoading ? <Skeleton className="h-64" /> : lowStock.length === 0 ? (
            <EmptyState title="Todos os SKUs OK" description="Nenhum produto com estoque abaixo de 5." />
          ) : (
            <div className="space-y-2 text-sm">
              {lowStock.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate">{p.name}</div>
                  <Badge variant="destructive">{p.stock}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard title="Top produtos por preço">
          {isLoading ? <Skeleton className="h-64" /> : (products?.length ?? 0) === 0 ? (
            <EmptyState title="Sem produtos" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead></TableRow></TableHeader>
                <TableBody>
                  {products!.slice(0, 15).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.category ?? "—"}</Badge></TableCell>
                      <TableCell>{brl(Number(p.price))}</TableCell>
                      <TableCell>{p.stock ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
