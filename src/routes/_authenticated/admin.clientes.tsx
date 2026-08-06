import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListStoreCustomers, adminGetCustomerDetails, type StoreCustomer } from "@/lib/store/customers.functions";
import { PageShell } from "@/components/common/PageShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, MessageCircle, ShoppingCart, User, Mail, Phone, MapPin, Calendar, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes da Loja — AMT" },
      { name: "description", content: "Gerenciamento completo de clientes, histórico e carrinhos." },
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      eyebrow="AMT Fight Wear"
      title="Clientes da Loja"
      description="Consumidores que realizaram pedidos ou cadastros diretamente no site da loja (E-commerce)."
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
            placeholder="Buscar por nome, e-mail, telefone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Origem</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Abandonos</TableHead>
                    <TableHead className="text-right">Total pago</TableHead>
                    <TableHead className="w-10"></TableHead>
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
                    <TableRow 
                      key={c.id} 
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => setSelectedId(c.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{c.full_name || "Lead do Chat"}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px] font-medium uppercase">
                          {c.type === "registered" ? "Cadastrado" : c.type === "lead" ? "Chat/Lead" : "Visitante"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold">{c.orders_count}</div>
                        {c.paid_count > 0 && (
                          <span className="text-[10px] text-emerald-600 font-bold">{c.paid_count} pagos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.abandoned_carts_count > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{c.abandoned_carts_count}</Badge>
                        ) : "0"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtBRL(Number(c.total_spent ?? 0))}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDetailsDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </PageShell>
  );
}

function CustomerDetailsDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const fetchDetails = useServerFn(adminGetCustomerDetails);
  const { data, isLoading } = useQuery({
    queryKey: ["store", "customer", id],
    queryFn: () => fetchDetails({ data: { id: id! } }),
    enabled: !!id,
  });

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 p-8">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-black">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <div>{data.customer.full_name || "Lead identificado"}</div>
                  <div className="text-sm font-normal text-muted-foreground">ID: {data.customer.id}</div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-3 mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Contato</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" /> {data.customer.email || "—"}</div>
                    <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /> {data.customer.phone || "—"}</div>
                    <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" /> {[data.customer.city, data.customer.state].filter(Boolean).join(" · ") || "—"}</div>
                    <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /> Desde {new Date(data.customer.created_at).toLocaleDateString("pt-BR")}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Financeiro</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm"><span>Total Gasto:</span> <span className="font-bold text-emerald-600">{fmtBRL(data.customer.total_spent)}</span></div>
                    <div className="flex items-center justify-between text-sm"><span>Pedidos:</span> <span className="font-bold">{data.customer.orders_count}</span></div>
                    <div className="flex items-center justify-between text-sm"><span>Pagos:</span> <span className="font-bold">{data.customer.paid_count}</span></div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2">
                <Tabs defaultValue="pedidos">
                  <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-6">
                    <TabsTrigger value="pedidos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-bold"><ShoppingBag className="mr-2 h-4 w-4" /> Pedidos</TabsTrigger>
                    <TabsTrigger value="carrinhos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-bold"><ShoppingCart className="mr-2 h-4 w-4" /> Carrinhos</TabsTrigger>
                    <TabsTrigger value="chat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 font-bold"><MessageCircle className="mr-2 h-4 w-4" /> Chat</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pedidos" className="mt-4">
                    {data.orders.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">Sem pedidos registrados.</div>
                    ) : (
                      <div className="space-y-3">
                        {data.orders.map((o) => (
                          <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors">
                            <div>
                              <div className="font-bold text-sm">Pedido #{o.order_number}</div>
                              <div className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{fmtBRL(o.total)}</div>
                              <Badge variant={o.payment_status === "paid" ? "secondary" : "outline"} className="text-[9px] uppercase">
                                {o.payment_status === "paid" ? "Pago" : "Pendente"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="carrinhos" className="mt-4">
                    {data.carts.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">Sem carrinhos registrados.</div>
                    ) : (
                      <div className="space-y-4">
                        {data.carts.map((c) => (
                          <div key={c.id} className="p-4 rounded-xl border bg-accent/10">
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant={c.status === "active" ? "destructive" : "outline"} className="text-[10px]">
                                {c.status === "active" ? "Abandonado" : "Enviado/Convertido"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            <div className="space-y-2">
                              {c.store_cart_items.map((it: any) => (
                                <div key={it.id} className="flex justify-between text-xs">
                                  <span>{it.quantity}x {it.product_name}</span>
                                  <span className="font-medium">{fmtBRL(it.unit_price * it.quantity)}</span>
                                </div>
                              ))}
                              <div className="pt-2 border-t flex justify-between font-bold text-sm">
                                <span>Total Estimado</span>
                                <span>{fmtBRL(c.total_estimate)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="chat" className="mt-4">
                    {data.conversations.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">Sem histórico de chat.</div>
                    ) : (
                      <div className="space-y-3">
                        {data.conversations.map((conv) => (
                          <div key={conv.id} className="p-3 rounded-lg border hover:bg-accent/30 transition-colors flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm truncate">{conv.channel} · {conv.status}</div>
                              <div className="text-[10px] text-muted-foreground">Última: {new Date(conv.last_message_at).toLocaleString("pt-BR")}</div>
                            </div>
                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <a href={`/admin/atendimento?chat=${conv.id}`}><MessageCircle className="h-4 w-4" /></a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
