import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListStoreCustomers } from "@/lib/store/customers.functions";
import { PageShell } from "@/components/common/PageShell";

export const Route = createFileRoute("/_authenticated/store/customers")({
  head: () => ({
    meta: [
      { title: "Clientes da Loja — AMT" },
      { name: "description", content: "Clientes cadastrados na loja AMT." },
    ],
  }),
  component: StoreCustomersPage,
});

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function StoreCustomersPage() {
  const fetchCustomers = useServerFn(adminListStoreCustomers);
  const { data, isLoading } = useQuery({
    queryKey: ["store", "customers"],
    queryFn: () => fetchCustomers(),
  });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((c) =>
      [c.full_name, c.email, c.phone, c.document, c.city, c.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data, q]);

  const totals = useMemo(() => {
    const list = data ?? [];
    return {
      customers: list.length,
      buyers: list.filter((c) => c.paid_count > 0).length,
      revenue: list.reduce((s, c) => s + Number(c.total_spent ?? 0), 0),
    };
  }, [data]);

  return (
    <PageShell
      eyebrow="Loja"
      title="Clientes"
      description="Todos os clientes que criaram conta e navegaram na loja."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total de clientes</div>
            <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : totals.customers.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Compradores</div>
            <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : totals.buyers.toLocaleString("pt-BR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Receita paga</div>
            <div className="mt-2 text-2xl font-bold">{isLoading ? "…" : fmtBRL(totals.revenue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-base">
            {isLoading ? "Carregando..." : `${rows.length} cliente(s)`}
          </CardTitle>
          <Input
            placeholder="Buscar por nome, e-mail, telefone, cidade..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden lg:table-cell">Localidade</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Total pago</TableHead>
                  <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.full_name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{c.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-xs">{c.phone}</div>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {[c.city, c.state].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">{c.orders_count}</div>
                      {c.paid_count > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{c.paid_count} pagos</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmtBRL(Number(c.total_spent ?? 0))}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
