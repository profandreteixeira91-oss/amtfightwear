import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminGetOrderDetail,
  adminAddOrderNote,
  adminUpdateOrderFields,
} from "@/lib/store/order-detail.functions";
import { adminUpdateOrderStatus } from "@/lib/store/store.functions";
import {
  adminMelhorEnvioQuoteOrder,
  adminMelhorEnvioAddToCart,
  adminMelhorEnvioCheckout,
  adminMelhorEnvioGenerate,
  adminMelhorEnvioSyncTracking,
} from "@/lib/store/shipping.functions";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/store/cart-store";
import {
  orderStatusLabel,
  paymentStatusLabel,
  orderStatusOptions,
  paymentStatusOptions,
  orderStatusBadgeClass,
} from "@/lib/store/order-status";
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Truck,
  ExternalLink,
  Printer,
  User,
  MapPin,
  Receipt,
  History,
  StickyNote,
  Factory,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$orderId")({
  component: AdminOrderDetailPage,
});

type AnyRec = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const dt = (v: unknown) => (v ? new Date(String(v)).toLocaleString("pt-BR") : "—");

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "break-all font-mono text-xs" : "text-sm"}>{value}</div>
    </div>
  );
}

function addressLines(raw: unknown): string[] {
  const a = (raw ?? {}) as AnyRec;
  if (!a || Object.keys(a).length === 0) return [];
  const line1 = [a.street ?? a.address ?? a.logradouro, a.number ?? a.numero].filter(Boolean).join(", ");
  const line2 = [a.complement ?? a.complemento, a.neighborhood ?? a.bairro].filter(Boolean).join(" · ");
  const line3 = [a.city ?? a.cidade, a.state ?? a.uf].filter(Boolean).join(" / ");
  const line4 = a.zip ?? a.zipcode ?? a.cep ?? a.postal_code;
  return [line1, line2, line3, line4 ? `CEP ${String(line4)}` : ""].filter((l) => l && l.length > 0) as string[];
}

function AdminOrderDetailPage() {
  const { orderId } = Route.useParams();
  const getFn = useServerFn(adminGetOrderDetail);
  const statusFn = useServerFn(adminUpdateOrderStatus);
  const noteFn = useServerFn(adminAddOrderNote);
  const fieldsFn = useServerFn(adminUpdateOrderFields);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "store", "order", orderId],
    queryFn: () => getFn({ data: { id: orderId } }),
  });

  const order = (data?.order ?? null) as AnyRec | null;
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setNotes(String(order.notes ?? ""));
      setTracking(String(order.shipping_tracking ?? ""));
    }
  }, [order?.id, order?.notes, order?.shipping_tracking]);

  const run = async (key: string, fn: () => Promise<void>) => {
    try {
      setBusy(key);
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <PageShell title="Pedido" description="Carregando…">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </PageShell>
    );
  }

  if (error || !order) {
    return (
      <PageShell title="Pedido" description="Não foi possível carregar">
        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "Pedido não encontrado."}
            </p>
            <Button asChild variant="outline">
              <Link to="/admin/pedidos">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar aos pedidos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const items = (data?.items ?? []) as AnyRec[];
  const products = (data?.products ?? []) as AnyRec[];
  const events = (data?.events ?? []) as AnyRec[];
  const notifications = (data?.notifications ?? []) as AnyRec[];
  const production = (data?.production ?? []) as AnyRec[];
  const customerOrders = (data?.customerOrders ?? []) as AnyRec[];
  const productById = new Map(products.map((p) => [String(p.id), p]));

  const timeline = [
    ...events.map((e) => ({
      id: `e-${String(e.id)}`,
      when: String(e.created_at),
      title: String(e.message ?? e.event),
      tag: String(e.event),
      who: (e.actor_email as string | null) ?? null,
    })),
    ...notifications.map((n) => ({
      id: `n-${String(n.id)}`,
      when: String(n.created_at),
      title: String(n.title ?? n.event),
      tag: `notificação · ${String(n.event)}`,
      who: null as string | null,
    })),
    {
      id: "created",
      when: String(order.created_at),
      title: "Pedido criado",
      tag: "created",
      who: null as string | null,
    },
  ].sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  const saveStatus = (status: string, payment_status?: string) =>
    run("status", async () => {
      await statusFn({ data: { id: orderId, status, ...(payment_status ? { payment_status } : {}) } });
      toast.success("Status atualizado");
      await refetch();
    });

  const saveFields = (patch: Record<string, string>) =>
    run("fields", async () => {
      await fieldsFn({ data: { id: orderId, ...patch } });
      toast.success("Pedido atualizado");
      await refetch();
    });

  return (
    <PageShell
      title={`Pedido ${String(order.order_number ?? "")}`}
      description={`Criado em ${dt(order.created_at)} · ${str(order.customer_name)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/pedidos">
              <ArrowLeft className="mr-1 h-4 w-4" /> Todos os pedidos
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Imprimir
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className={orderStatusBadgeClass(String(order.status ?? ""))}>
          {orderStatusLabel[String(order.status ?? "")] ?? str(order.status)}
        </Badge>
        <Badge variant="outline">
          Pagamento: {paymentStatusLabel[String(order.payment_status ?? "")] ?? str(order.payment_status)}
        </Badge>
        <Badge variant="secondary">
          <Truck className="mr-1 h-3 w-3" /> {str(order.melhor_envio_status)}
        </Badge>
        <span className="font-mono text-xs text-muted-foreground">{String(order.id)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Itens do pedido ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {items.map((it) => {
                const p = productById.get(String(it.product_id ?? ""));
                return (
                  <div key={String(it.id)} className="flex gap-3 p-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {it.image_url ? (
                        <img src={String(it.image_url)} alt="" className="h-full w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-semibold">{str(it.product_name)}</div>
                      {it.variant_label ? (
                        <div className="text-xs text-muted-foreground">{String(it.variant_label)}</div>
                      ) : null}
                      <div className="text-xs text-muted-foreground">
                        SKU {str(it.sku ?? p?.sku)} · Qtd {str(it.quantity)} × {formatBRL(Number(it.unit_price ?? 0))}
                        {it.production_days ? ` · produção ${String(it.production_days)}d` : ""}
                      </div>
                      {p ? (
                        <div className="text-xs text-muted-foreground">
                          Estoque atual: <b>{str(p.stock)}</b>
                          {p.weight_grams ? ` · ${String(p.weight_grams)}g` : ""}
                          {p.length_cm ? ` · ${String(p.length_cm)}×${String(p.width_cm)}×${String(p.height_cm)}cm` : ""}
                        </div>
                      ) : null}
                      {it.custom_config ? (
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(it.custom_config, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right text-sm font-bold tabular-nums">
                      {formatBRL(Number(it.total_price ?? 0))}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">Nenhum item registrado.</div>
              )}
            </CardContent>
          </Card>

          {/* Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" /> Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Field label="Método" value={str(order.payment_method)} />
              <Field label="Provedor" value={str(order.payment_provider)} />
              <Field label="Parcelas" value={str(order.installments)} />
              <Field label="Referência" value={str(order.payment_reference)} mono />
              <Field label="Cartão final" value={str(order.card_last4)} />
              <Field label="Mercado Pago ID" value={str(order.mp_payment_id)} mono />
              <Field label="Asaas pagamento" value={str(order.asaas_payment_id)} mono />
              <Field label="Pix expira em" value={dt(order.asaas_pix_expires_at)} />
              <Field
                label="Links"
                value={
                  <div className="flex flex-wrap gap-2">
                    {order.asaas_invoice_url ? (
                      <a
                        className="inline-flex items-center gap-1 text-xs underline"
                        href={String(order.asaas_invoice_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Fatura <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    {order.asaas_boleto_url ? (
                      <a
                        className="inline-flex items-center gap-1 text-xs underline"
                        href={String(order.asaas_boleto_url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Boleto <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    {!order.asaas_invoice_url && !order.asaas_boleto_url ? "—" : null}
                  </div>
                }
              />
            </CardContent>
          </Card>

          {/* Envio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4" /> Envio (Melhor Envio)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ShippingSection order={order} onChange={() => refetch()} />
              <Separator className="my-4" />
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <div className="mb-1 text-[11px] uppercase text-muted-foreground">Código de rastreio</div>
                  <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Ex.: AA123456789BR" />
                </div>
                <Button
                  variant="outline"
                  disabled={busy === "fields"}
                  onClick={() => saveFields({ shipping_tracking: tracking })}
                >
                  Salvar rastreio
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Produção */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Factory className="h-4 w-4" /> Produção ({production.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {production.map((j) => (
                <div key={String(j.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{str(j.product_name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {str(j.variant_label)} · Qtd {str(j.quantity)} · Prazo {j.deadline ? new Date(String(j.deadline)).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{str(j.stage)}</Badge>
                    <Badge variant="secondary">{str(j.status)}</Badge>
                  </div>
                </div>
              ))}
              {production.length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhum job de produção vinculado.</div>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Histórico do pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {timeline.map((t) => (
                  <li key={t.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <div className="text-sm">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {dt(t.when)} · {t.tag}
                        {t.who ? ` · ${t.who}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatBRL(Number(order.subtotal ?? 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className="tabular-nums">{formatBRL(Number(order.shipping_cost ?? 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span className="tabular-nums">−{formatBRL(Number(order.discount ?? 0))}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold tabular-nums">{formatBRL(Number(order.total ?? 0))}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-[11px] uppercase text-muted-foreground">Status do pedido</div>
                <Select value={String(order.status ?? "")} onValueChange={(v) => saveStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase text-muted-foreground">Status do pagamento</div>
                <Select
                  value={String(order.payment_status ?? "")}
                  onValueChange={(v) => saveStatus(String(order.status ?? ""), v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Field label="Nome" value={str(order.customer_name)} />
              <Field label="E-mail" value={str(order.customer_email)} />
              <Field label="Telefone" value={str(order.customer_phone)} />
              <Field label="Documento" value={str(order.customer_document)} />
              <Separator />
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Entrega
                </div>
                {addressLines(order.shipping_address).length ? (
                  addressLines(order.shipping_address).map((l) => (
                    <div key={l} className="text-sm">
                      {l}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
              <Separator />
              <div>
                <div className="mb-1 text-[11px] uppercase text-muted-foreground">
                  Histórico do cliente ({customerOrders.length})
                </div>
                <div className="space-y-1">
                  {customerOrders.map((c) => (
                    <Link
                      key={String(c.id)}
                      to="/admin/pedidos/$orderId"
                      params={{ orderId: String(c.id) }}
                      className="flex items-center justify-between rounded px-1 py-0.5 text-xs hover:bg-accent"
                    >
                      <span className="font-mono">{str(c.order_number)}</span>
                      <span className="tabular-nums">{formatBRL(Number(c.total ?? 0))}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4" /> Observações internas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Observações do pedido"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "fields"}
                onClick={() => saveFields({ notes })}
              >
                Salvar observações
              </Button>
              <Separator />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Adicionar nota ao histórico"
              />
              <Button
                size="sm"
                disabled={!note.trim() || busy === "note"}
                onClick={() =>
                  run("note", async () => {
                    await noteFn({ data: { id: orderId, note: note.trim() } });
                    setNote("");
                    toast.success("Nota adicionada");
                    await refetch();
                  })
                }
              >
                Adicionar nota
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function ShippingSection({ order, onChange }: { order: AnyRec; onChange: () => void }) {
  const quote = useServerFn(adminMelhorEnvioQuoteOrder);
  const addToCart = useServerFn(adminMelhorEnvioAddToCart);
  const checkout = useServerFn(adminMelhorEnvioCheckout);
  const generate = useServerFn(adminMelhorEnvioGenerate);
  const sync = useServerFn(adminMelhorEnvioSyncTracking);

  const [busy, setBusy] = useState<string | null>(null);
  const [options, setOptions] = useState<
    Array<{ id: number; name: string; company: string; price: number; delivery_time: number | null; error: string | null }>
  >([]);
  const id = String(order.id);
  const meStatus = String(order.melhor_envio_status ?? "");

  const run = async (key: string, fn: () => Promise<void>) => {
    try {
      setBusy(key);
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 rounded-md border bg-muted/40 p-3 sm:grid-cols-2">
        <Field label="Serviço" value={str(order.melhor_envio_service_name)} />
        <Field label="Status Melhor Envio" value={str(order.melhor_envio_status)} />
        <Field label="ID carrinho" value={str(order.melhor_envio_cart_id)} mono />
        <Field label="ID envio" value={str(order.melhor_envio_order_id)} mono />
        <Field label="Rastreio" value={str(order.shipping_tracking)} mono />
        <Field label="Última sincronização" value={dt(order.melhor_envio_synced_at)} />
      </div>

      {!order.melhor_envio_cart_id && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold">1. Cotar frete</div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === "quote"}
              onClick={() =>
                run("quote", async () => {
                  const opts = await quote({ data: { order_id: id } });
                  setOptions(opts);
                })
              }
            >
              <RefreshCw className="mr-1 h-3 w-3" /> {busy === "quote" ? "Cotando…" : "Cotar agora"}
            </Button>
          </div>
          {options.length > 0 && (
            <div className="divide-y rounded-md border">
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
                  <Button
                    size="sm"
                    disabled={!!o.error || busy === `add-${o.id}`}
                    onClick={() =>
                      run(`add-${o.id}`, async () => {
                        await addToCart({
                          data: { order_id: id, service_id: o.id, service_name: `${o.company} ${o.name}` },
                        });
                        toast.success("Adicionado ao carrinho do Melhor Envio");
                        onChange();
                      })
                    }
                  >
                    Escolher
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {Boolean(order.melhor_envio_cart_id) && !["paid", "generated", "posted", "delivered"].includes(meStatus) && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-semibold">2. Comprar etiqueta</div>
            <div className="text-xs text-muted-foreground">Debita do saldo Melhor Envio.</div>
          </div>
          <Button
            size="sm"
            disabled={busy === "checkout"}
            onClick={() =>
              run("checkout", async () => {
                await checkout({ data: { order_ids: [id] } });
                toast.success("Compra realizada");
                onChange();
              })
            }
          >
            {busy === "checkout" ? "Comprando…" : "Comprar"}
          </Button>
        </div>
      )}

      {["paid", "generated", "posted", "delivered"].includes(meStatus) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
          <div>
            <div className="font-semibold">3. Etiqueta</div>
            <div className="text-xs text-muted-foreground">
              {order.melhor_envio_label_url ? "PDF disponível." : "Gerar etiqueta imprimível."}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy === "gen"}
              onClick={() =>
                run("gen", async () => {
                  const r = await generate({ data: { order_ids: [id] } });
                  toast.success("Etiqueta gerada");
                  if (r.url) window.open(r.url, "_blank", "noopener");
                  onChange();
                })
              }
            >
              <Package className="mr-1 h-3 w-3" /> {order.melhor_envio_label_url ? "Regerar" : "Gerar etiqueta"}
            </Button>
            {order.melhor_envio_label_url ? (
              <Button size="sm" variant="secondary" asChild>
                <a href={String(order.melhor_envio_label_url)} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" /> Abrir PDF
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {order.melhor_envio_cart_id ? (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-semibold">4. Rastreio</div>
            <div className="text-xs text-muted-foreground">
              {order.shipping_tracking ? `Código: ${String(order.shipping_tracking)}` : "Sem código ainda."}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy === "sync"}
            onClick={() =>
              run("sync", async () => {
                const r = await sync({ data: { order_ids: [id] } });
                toast.success(`Rastreio atualizado (${r.updated})`);
                onChange();
              })
            }
          >
            <RefreshCw className="mr-1 h-3 w-3" /> {busy === "sync" ? "Atualizando…" : "Atualizar"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
