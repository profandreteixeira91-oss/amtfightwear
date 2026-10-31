import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListOrders,
  adminCountOrdersByStatus,
  adminUpdateOrderStatus,
  adminDeleteStoreOrder,
} from "@/lib/store/store.functions";

import {
  adminMelhorEnvioBalance,
  adminMelhorEnvioQuoteOrder,
  adminMelhorEnvioCheckout,
  adminMelhorEnvioGenerate,
  adminMelhorEnvioSyncTracking,
} from "@/lib/store/shipping.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ShippingPreparationDialog,
  type ShippingSelection,
} from "@/components/store/ShippingPreparationDialog";
import { PAID_SHIPPING_STATUSES } from "@/lib/store/shipping-flow";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { adminRegenerateStorePixQrCodes } from "@/lib/store/mercadopago.functions";
import { formatBRL } from "@/lib/store/cart-store";
import {
  paymentStatusLabel,
  paymentStatusBadgeClass,
  orderStatusOptions,
} from "@/lib/store/order-status";
import { formatBRDateTime } from "@/lib/dates";
import { whatsappLink } from "@/features/prospect/utils";
import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  RefreshCw,
  Package,
  ExternalLink,
  Wallet,
  Trash2,
  QrCode,
  Eye,
  Search,
  MessageCircle,
  ShoppingCart,
  X,
} from "lucide-react";
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
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { cn } from "@/lib/utils";
import { ADMIN_REFRESH } from "@/lib/admin-refresh";

/** Abas da fila de pedidos, na ordem em que o pedido avança. */
const TABS = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "pagamento", label: "Aguardando pagamento", statuses: ["pending_payment", "pending"] },
  { key: "enviar", label: "A preparar/enviar", statuses: ["paid", "preparing"] },
  { key: "producao", label: "Em produção", statuses: ["processing"] },
  { key: "enviados", label: "Enviados", statuses: ["shipped"] },
  { key: "concluidos", label: "Concluídos", statuses: ["delivered", "completed"] },
  { key: "cancelados", label: "Cancelados", statuses: ["cancelled", "canceled", "refunded"] },
] as const;

type TabKey = (typeof TABS)[number]["key"];
const TAB_KEYS = TABS.map((t) => t.key) as readonly string[];

type OrdersSearch = { tab?: TabKey; q?: string };

export const Route = createFileRoute("/_authenticated/admin/pedidos/")({
  // Aba e busca ficam na URL: o link do Início abre a fila certa e o F5 não perde o filtro.
  validateSearch: (search: Record<string, unknown>): OrdersSearch => ({
    tab:
      TAB_KEYS.includes(search.tab as string) && search.tab !== "todos"
        ? (search.tab as TabKey)
        : undefined,
    q: typeof search.q === "string" && search.q.trim() ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pedidos e fretes — Administração AMT Fight Wear" },
      {
        name: "description",
        content: "Gestão de pedidos, pagamento de fretes e etiquetas da AMT Fight Wear.",
      },
      { property: "og:title", content: "Pedidos — AMT Fight Wear" },
      { property: "og:description", content: "Administração de pedidos e envios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOrdersPage,
});

const STATUSES = orderStatusOptions;
const LIST_LIMIT = 200;

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  total: number | string;
  payment_status: string;
  payment_method?: string | null;
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: TabKey = search.tab ?? "todos";
  const q = search.q ?? "";

  const qc = useQueryClient();
  const list = useServerFn(adminListOrders);
  const countFn = useServerFn(adminCountOrdersByStatus);
  const update = useServerFn(adminUpdateOrderStatus);
  const del = useServerFn(adminDeleteStoreOrder);
  const balanceFn = useServerFn(adminMelhorEnvioBalance);

  const setSearch = (next: OrdersSearch) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  // O campo responde na hora; a URL (e a consulta no servidor) recebe o termo após uma pausa.
  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    if (qInput.trim() === q.trim()) return;
    const t = setTimeout(() => setSearch({ q: qInput.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  // Busca e aba são filtradas no servidor: a fila não fica limitada aos 200 pedidos mais recentes.
  const tabStatuses = TABS.find((t) => t.key === tab)?.statuses;
  const { data, refetch, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "store", "orders", "list", { q, tab }],
    queryFn: async () =>
      (await list({
        data: { q: q || undefined, statuses: tabStatuses ? [...tabStatuses] : undefined },
      })) as Order[],
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_REFRESH.queue,
  });
  const statusCounts = useQuery({
    queryKey: ["admin", "store", "orders", "counts", q],
    queryFn: () => countFn({ data: { q: q || undefined } }),
    placeholderData: keepPreviousData,
    refetchInterval: ADMIN_REFRESH.queue,
  });
  const { data: meInfo } = useQuery({
    queryKey: ["admin", "store", "me-balance"],
    queryFn: () => balanceFn(),
    staleTime: 60_000,
  });

  const refreshOrders = () => qc.invalidateQueries({ queryKey: ["admin", "store", "orders"] });

  const visible = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => {
    const byStatus = statusCounts.data ?? {};
    const out = {} as Record<TabKey, number>;
    for (const t of TABS) {
      const statuses = t.statuses as readonly string[] | null;
      out[t.key] = Object.entries(byStatus)
        .filter(([s]) => !statuses || statuses.includes(s))
        .reduce((a, [, n]) => a + n, 0);
    }
    return out;
  }, [statusCounts.data]);
  const countsLoading = statusCounts.isLoading;

  const visibleTotal = visible.reduce((a, o) => a + Number(o.total || 0), 0);

  const change = async (id: string, status: string) => {
    try {
      await update({ data: { id, status } });
      toast.success("Status atualizado");
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (id: string) => {
    try {
      await del({ data: { id } });
      toast.success("Pedido excluído");
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  // Regera os QR Codes Pix pendentes com as credenciais atuais da loja.
  const regenFn = useServerFn(adminRegenerateStorePixQrCodes);
  const [regenBusy, setRegenBusy] = useState(false);
  const regenPix = async () => {
    setRegenBusy(true);
    try {
      const r = await regenFn();
      if (r.updated > 0) toast.success(`${r.updated} QR Code(s) Pix atualizado(s)`);
      if (r.failures.length > 0) {
        toast.error(`${r.failures.length} falha(s): ${r.failures[0]?.message ?? ""}`);
      } else if (r.updated === 0) {
        toast.info("Nenhum pedido Pix pendente");
      }
      refreshOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setRegenBusy(false);
    }
  };

  return (
    <PageShell
      title="Pedidos"
      description={
        countsLoading
          ? "Carregando pedidos…"
          : `${counts.pagamento} aguardando pagamento · ${counts.enviar} a preparar/enviar · ${counts.producao} em produção`
      }
      actions={
        <>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <div className="leading-tight">
              <div className="text-[11px] text-muted-foreground">Saldo Melhor Envio</div>
              <div className="font-semibold">
                {meInfo ? formatBRL(Number(meInfo.balance)) : "—"}
                {meInfo?.name ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({meInfo.name})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={regenPix} disabled={regenBusy} className="gap-2">
            <QrCode className="h-4 w-4" />
            {regenBusy ? "Atualizando QR Codes…" : "Atualizar QR Codes Pix"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshOrders()}
            disabled={isFetching}
            aria-label="Recarregar pedidos"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Filtrar por status"
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSearch({ tab: t.key === "todos" ? undefined : t.key })}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    active ? "bg-primary-foreground/20" : "bg-muted text-foreground/70",
                  )}
                >
                  {countsLoading ? "…" : counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por nº, cliente, e-mail ou telefone"
              className="pl-9 pr-9"
              aria-label="Buscar pedidos"
            />
            {qInput ? (
              <button
                type="button"
                onClick={() => {
                  setQInput("");
                  setSearch({ q: undefined });
                }}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {!isLoading ? (
            <div className="text-sm text-muted-foreground">
              {visible.length} pedido(s) ·{" "}
              <span className="font-semibold text-foreground">{formatBRL(visibleTotal)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                className="m-4"
                title={
                  counts.todos === 0 && !q ? "Nenhum pedido ainda" : "Nenhum pedido neste filtro"
                }
                description={q ? `Nada encontrado para “${q}”.` : undefined}
                action={
                  q || tab !== "todos" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSearch({ q: undefined, tab: undefined })}
                    >
                      Limpar filtros
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Envio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link
                          to="/admin/pedidos/$orderId"
                          params={{ orderId: o.id }}
                          className="font-mono text-xs font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {o.order_number}
                        </Link>
                        <div className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatBRDateTime(o.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="truncate font-medium">{o.customer_name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {o.customer_email}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                        {formatBRL(Number(o.total))}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                            paymentStatusBadgeClass(o.payment_status),
                          )}
                        >
                          {paymentStatusLabel[o.payment_status] ?? o.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select value={o.status} onValueChange={(v) => change(o.id, v)}>
                          <SelectTrigger
                            className="h-8 w-44"
                            aria-label={`Status do pedido ${o.order_number}`}
                          >
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
                      </TableCell>
                      <TableCell>
                        <ShippingCell order={o} onChange={refreshOrders} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {o.customer_phone ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                            >
                              <a
                                href={whatsappLink(
                                  o.customer_phone,
                                  `Olá ${o.customer_name?.split(" ")[0] ?? ""}! Sobre o seu pedido ${o.order_number} na AMT Fight Wear:`,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`WhatsApp de ${o.customer_name}`}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-8 gap-1 px-2 text-xs"
                          >
                            <Link to="/admin/pedidos/$orderId" params={{ orderId: o.id }}>
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Excluir pedido"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir pedido {o.order_number}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é permanente. O pedido, seus itens e notificações
                                  associadas serão removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => remove(o.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      {visible.length >= LIST_LIMIT ? (
        <p className="text-center text-xs text-muted-foreground">
          Exibindo os {LIST_LIMIT} pedidos mais recentes deste filtro. Refine a busca para encontrar
          pedidos mais antigos.
        </p>
      ) : null}
    </PageShell>
  );
}

function ShippingCell({ order, onChange }: { order: Order; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const status = order.melhor_envio_status;
  const label = status
    ? ({
        in_cart: "No carrinho",
        paid: "Pago",
        generated: "Etiqueta pronta",
        posted: "Postado",
        delivered: "Entregue",
      }[status] ?? status)
    : "—";

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={status === "delivered" ? "default" : status ? "secondary" : "outline"}
        className="whitespace-nowrap"
      >
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
            <DialogDescription>
              Melhor Envio: cotar, comprar, emitir etiqueta e rastrear.
            </DialogDescription>
          </DialogHeader>
          <ShippingPanel order={order} onChange={onChange} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShippingPanel({ order, onChange }: { order: Order; onChange: () => void }) {
  const quote = useServerFn(adminMelhorEnvioQuoteOrder);
  const [selection, setSelection] = useState<ShippingSelection | null>(null);
  const checkout = useServerFn(adminMelhorEnvioCheckout);
  const generate = useServerFn(adminMelhorEnvioGenerate);
  const sync = useServerFn(adminMelhorEnvioSyncTracking);

  const [busy, setBusy] = useState<string | null>(null);
  const [options, setOptions] = useState<
    Array<{
      id: number;
      name: string;
      company: string;
      price: number;
      delivery_time: number | null;
      error: string | null;
    }>
  >([]);

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
    setSelection({ id: o.id, name: `${o.company} ${o.name}` });

  const doCheckout = () =>
    run("checkout", async () => {
      await checkout({ data: { order_ids: [order.id] } });
      toast.success("Compra realizada (saldo debitado)");
      onChange();
    });

  const doGenerate = () =>
    run("gen", async () => {
      await generate({ data: { order_ids: [order.id] } });
      toast.success("Etiqueta pronta. Use Abrir PDF para imprimir.");
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

      <ShippingPreparationDialog
        orderId={order.id}
        selection={selection}
        onClose={() => setSelection(null)}
        onChange={onChange}
      />
      {!order.melhor_envio_cart_id && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold">1. Cotar frete</div>
            <Button size="sm" variant="outline" onClick={doQuote} disabled={busy !== null}>
              <RefreshCw className="mr-1 h-3 w-3" />{" "}
              {busy === "quote" ? "Cotando..." : "Cotar agora"}
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
                      {o.error
                        ? o.error
                        : `${o.delivery_time ?? "?"} dias úteis · ${formatBRL(o.price)}`}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => doAdd(o)} disabled={!!o.error || busy !== null}>
                    {busy === `add-${o.id}` ? "..." : "Escolher"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {order.melhor_envio_cart_id &&
        !PAID_SHIPPING_STATUSES.includes(order.melhor_envio_status ?? "") && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-semibold">2. Pagar frete com saldo Melhor Envio</div>
              <div className="text-xs text-muted-foreground">
                Serviço: {order.melhor_envio_service_name}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={busy !== null}>
                  {busy === "checkout" ? "Comprando..." : "Comprar"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Pagar frete do pedido {order.order_number}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O valor de {order.melhor_envio_service_name ?? "frete"} será debitado do saldo
                    da carteira Melhor Envio.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={doCheckout}>Confirmar pagamento</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

      {order.melhor_envio_status && PAID_SHIPPING_STATUSES.includes(order.melhor_envio_status) && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-semibold">3. Etiqueta</div>
            <div className="text-xs text-muted-foreground">
              {order.melhor_envio_label_url
                ? "PDF disponível para impressão."
                : "Preparar etiqueta para impressão."}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={doGenerate} disabled={busy !== null}>
              <Package className="mr-1 h-3 w-3" />{" "}
              {order.melhor_envio_label_url ? "Atualizar impressão" : "Preparar impressão"}
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
          <Button size="sm" variant="outline" onClick={doSync} disabled={busy !== null}>
            <RefreshCw className="mr-1 h-3 w-3" />{" "}
            {busy === "sync" ? "Atualizando..." : "Atualizar"}
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
