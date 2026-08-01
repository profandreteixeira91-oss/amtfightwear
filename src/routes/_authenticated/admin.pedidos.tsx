import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListOrders, adminUpdateOrderStatus, adminDeleteStoreOrder } from "@/lib/store/store.functions";

import {
  adminMelhorEnvioBalance,
  adminMelhorEnvioQuoteOrder,
  adminMelhorEnvioAddToCart,
  adminMelhorEnvioCheckout,
  adminMelhorEnvioGenerate,
  adminMelhorEnvioSyncTracking,
} from "@/lib/store/shipping.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/store/cart-store";
import { orderStatusLabel, paymentStatusLabel, orderStatusOptions } from "@/lib/store/order-status";
import { useState } from "react";
import { Truck, RefreshCw, Package, ExternalLink, Wallet, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageShell } from "@/components/common/PageShell";


export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: AdminOrdersPage,
});

const STATUSES = orderStatusOptions;

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number | string;
  payment_status: string;
  status: string;
  created_at: string;
  melhor_envio_service_name?: string | null;
  melhor_envio_status?: string | null;
  melhor_envio_cart_id?: string | null;
  melhor_envio_order_id?: string | null;
  melhor_envio_label_url?: string | null;
  shipping_tracking?: string | null;
};

function AdminOrdersPage() {
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrderStatus);
  const del = useServerFn(adminDeleteStoreOrder);
  const balanceFn = useServerFn(adminMelhorEnvioBalance);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "orders"],
    queryFn: () => list(),
  });
  const { data: meInfo } = useQuery({
    queryKey: ["admin", "store", "me-balance"],
    queryFn: () => balanceFn(),
    staleTime: 60_000,
  });

  const change = async (id: string, status: string) => {
    try {
      await update({ data: { id, status } });
      toast.success("Status atualizado");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (id: string) => {
    try {
      await del({ data: { id } });
      toast.success("Pedido excluído");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };


  return (
    <PageShell
      title="Pedidos"
      description={`${data?.length ?? 0} pedidos recebidos`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={regenPix}
            disabled={regenBusy}
            className="gap-2"
          >
            <QrCode className="h-4 w-4" />
            {regenBusy ? "Atualizando QR Codes…" : "Atualizar QR Codes Pix"}
          </Button>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Saldo Melhor Envio</div>
              <div className="font-bold">
                {meInfo ? formatBRL(Number(meInfo.balance)) : "—"}
                {meInfo?.name ? <span className="ml-2 text-xs font-normal text-muted-foreground">({meInfo.name})</span> : null}
              </div>
            </div>
          </div>
        </div>
      }
    >

      <Card>
        <CardHeader>
          <CardTitle>Todos os pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase">
                  <tr>
                    <th className="p-2 text-left">Pedido</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Total</th>
                    <th className="p-2 text-left">Pagamento</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Envio</th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-right">Ações</th>
                  </tr>

                </thead>
                <tbody>
                  {data?.map((o) => (
                    <tr key={o.id} className="border-b hover:bg-accent/30">
                      <td className="p-2 font-mono text-xs">{o.order_number}</td>
                      <td className="p-2">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                      </td>
                      <td className="p-2 font-bold">{formatBRL(Number(o.total))}</td>
                      <td className="p-2">{paymentStatusLabel[o.payment_status] ?? o.payment_status}</td>
                      <td className="p-2">
                        <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <ShippingCell order={o as Order} onChange={() => refetch()} />
                      </td>
                      <td className="p-2 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir pedido">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir pedido {o.order_number}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação é permanente. O pedido, seus itens e notificações associadas serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>

                  ))}
                </tbody>
              </table>
              {data && data.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhum pedido ainda.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function ShippingCell({ order, onChange }: { order: Order; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const status = order.melhor_envio_status;
  const label = status
    ? { in_cart: "No carrinho", paid: "Pago", generated: "Etiqueta pronta", posted: "Postado", delivered: "Entregue" }[status] ?? status
    : "—";

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status === "delivered" ? "default" : status ? "secondary" : "outline"} className="whitespace-nowrap">
        <Truck className="mr-1 h-3 w-3" />
        {label}
      </Badge>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
            Gerenciar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Envio — {order.order_number}</DialogTitle>
            <DialogDescription>Melhor Envio: cotar, comprar, emitir etiqueta e rastrear.</DialogDescription>
          </DialogHeader>
          <ShippingPanel order={order} onChange={onChange} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShippingPanel({ order, onChange }: { order: Order; onChange: () => void }) {
  const quote = useServerFn(adminMelhorEnvioQuoteOrder);
  const addToCart = useServerFn(adminMelhorEnvioAddToCart);
  const checkout = useServerFn(adminMelhorEnvioCheckout);
  const generate = useServerFn(adminMelhorEnvioGenerate);
  const sync = useServerFn(adminMelhorEnvioSyncTracking);

  const [busy, setBusy] = useState<string | null>(null);
  const [options, setOptions] = useState<Array<{ id: number; name: string; company: string; price: number; delivery_time: number | null; error: string | null }>>([]);

  const run = async (key: string, fn: () => Promise<void>) => {
    try {
      setBusy(key);
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(null);
    }
  };

  const doQuote = () =>
    run("quote", async () => {
      const opts = await quote({ data: { order_id: order.id } });
      setOptions(opts);
    });

  const doAdd = (o: (typeof options)[number]) =>
    run(`add-${o.id}`, async () => {
      await addToCart({ data: { order_id: order.id, service_id: o.id, service_name: `${o.company} ${o.name}` } });
      toast.success("Adicionado ao carrinho do Melhor Envio");
      onChange();
    });

  const doCheckout = () =>
    run("checkout", async () => {
      await checkout({ data: { order_ids: [order.id] } });
      toast.success("Compra realizada (saldo debitado)");
      onChange();
    });

  const doGenerate = () =>
    run("gen", async () => {
      const r = await generate({ data: { order_ids: [order.id] } });
      toast.success("Etiqueta gerada");
      if (r.url) window.open(r.url, "_blank", "noopener");
      onChange();
    });

  const doSync = () =>
    run("sync", async () => {
      const r = await sync({ data: { order_ids: [order.id] } });
      toast.success(`Rastreio atualizado (${r.updated})`);
      onChange();
    });

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-2 sm:grid-cols-2 rounded-md border bg-muted/40 p-3">
        <InfoRow label="Serviço" value={order.melhor_envio_service_name ?? "—"} />
        <InfoRow label="Status ME" value={order.melhor_envio_status ?? "—"} />
        <InfoRow label="ID carrinho" value={order.melhor_envio_cart_id ?? "—"} mono />
        <InfoRow label="Código de rastreio" value={order.shipping_tracking ?? "—"} mono />
      </div>

      {!order.melhor_envio_cart_id && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold">1. Cotar frete</div>
            <Button size="sm" variant="outline" onClick={doQuote} disabled={busy === "quote"}>
              <RefreshCw className="mr-1 h-3 w-3" /> {busy === "quote" ? "Cotando..." : "Cotar agora"}
            </Button>
          </div>
          {options.length > 0 && (
            <div className="rounded-md border divide-y">
              {options.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-2">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {o.company} · {o.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {o.error ? o.error : `${o.delivery_time ?? "?"} dias úteis · ${formatBRL(o.price)}`}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => doAdd(o)} disabled={!!o.error || busy === `add-${o.id}`}>
                    {busy === `add-${o.id}` ? "..." : "Escolher"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {order.melhor_envio_cart_id && !["paid", "generated", "posted", "delivered"].includes(order.melhor_envio_status ?? "") && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-semibold">2. Comprar (debita do saldo Melhor Envio)</div>
            <div className="text-xs text-muted-foreground">Serviço: {order.melhor_envio_service_name}</div>
          </div>
          <Button size="sm" onClick={doCheckout} disabled={busy === "checkout"}>
            {busy === "checkout" ? "Comprando..." : "Comprar"}
          </Button>
        </div>
      )}

      {order.melhor_envio_status && ["paid", "generated", "posted", "delivered"].includes(order.melhor_envio_status) && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-semibold">3. Etiqueta</div>
            <div className="text-xs text-muted-foreground">
              {order.melhor_envio_label_url ? "PDF disponível para impressão." : "Gerar etiqueta imprimível."}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={doGenerate} disabled={busy === "gen"}>
              <Package className="mr-1 h-3 w-3" /> {order.melhor_envio_label_url ? "Regerar" : "Gerar etiqueta"}
            </Button>
            {order.melhor_envio_label_url && (
              <Button size="sm" variant="secondary" asChild>
                <a href={order.melhor_envio_label_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" /> Abrir PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {order.melhor_envio_cart_id && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-semibold">4. Rastreio</div>
            <div className="text-xs text-muted-foreground">
              {order.shipping_tracking ? `Código: ${order.shipping_tracking}` : "Sem código ainda."}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={doSync} disabled={busy === "sync"}>
            <RefreshCw className="mr-1 h-3 w-3" /> {busy === "sync" ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs" : "text-sm"}>{value}</div>
    </div>
  );
}
