import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories, getStoreOrder, cancelStoreOrder } from "@/lib/store/store.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { exportOrderPdf } from "@/lib/store/order-pdf";
import {
  orderStatusLabel,
  paymentStatusLabel,
  orderStatusBadgeClass,
  paymentStatusBadgeClass,
} from "@/lib/store/order-status";
import {
  CheckCircle2,
  Download,
  Copy,
  Check,
  Package,
  Truck,
  CreditCard,
  MapPin,
  QrCode,
  FileText,
  ShoppingBag,
  Clock,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { brDate } from "@/lib/dates";
import { KimonoGuideCallout, isKimonoContext } from "@/components/store/KimonoGuideLink";

export const Route = createFileRoute("/loja/pedido/$id")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() })),
      context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "order", params.id], queryFn: () => getStoreOrder({ data: { id: params.id } }) })),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Seu pedido — AMT Fight Wear" },
      { name: "description", content: "Acompanhe o status do seu pedido AMT Fight Wear, veja os itens, o pagamento e a entrega." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Pedido não encontrado</div>,
});

const STEPS = [
  { key: "pending_payment", label: "Pagamento", icon: CreditCard },
  { key: "preparing", label: "Produção", icon: Package },
  { key: "shipped", label: "Enviado", icon: Truck },
  { key: "delivered", label: "Entregue", icon: CheckCircle2 },
];

function stepIndex(status: string | null | undefined) {
  const s = String(status || "").toLowerCase();
  if (["delivered", "completed"].includes(s)) return 3;
  if (s === "shipped") return 2;
  if (["preparing", "processing", "paid"].includes(s)) return 1;
  return 0;
}

function paymentMethodLabel(order: any) {
  const m = order.payment_method;
  if (!m) return null;
  if (m === "PIX") return "PIX";
  if (m === "BOLETO") return "Boleto bancário";
  if (m === "CREDIT_CARD") return `Cartão de crédito${order.installments && order.installments > 1 ? ` · ${order.installments}x` : ""}`;
  return m;
}

function OrderPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["store", "order", id], queryFn: () => getStoreOrder({ data: { id } }) }));
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelOrderFn = useServerFn(cancelStoreOrder);

  if (!data) {
    return <StoreShell categories={categories}><div className="p-16 text-center">Pedido não encontrado.</div></StoreShell>;
  }

  const { order, items } = data;
  const o = order as any;
  const current = stepIndex(o.status);
  const isCancelled = ["cancelled", "canceled", "refunded"].includes(String(o.status || "").toLowerCase());
  const canCancel = ["pending_payment", "pending", "failed"].includes(String(o.status || "").toLowerCase()) && !isCancelled;
  const addr = o.shipping_address as Record<string, any> | null | undefined;

  async function handleDownload() {
    setDownloading(true);
    try {
      await exportOrderPdf(order as any, items as any);
    } finally {
      setDownloading(false);
    }
  }

  function copyPix() {
    navigator.clipboard.writeText(String(o.asaas_pix_copy_paste));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCancel() {
    if (!window.confirm("Tem certeza que deseja cancelar este pedido? Essa ação não pode ser desfeita.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelOrderFn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["store", "order", id] });
    } catch (err: any) {
      setCancelError(err?.message ?? "Não foi possível cancelar o pedido.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-lg sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Pedido registrado</span>
              </div>
              <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                Obrigado! Seu pedido está confirmado
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md border bg-background px-2.5 py-1 font-mono text-xs font-bold">
                  #{o.order_number}
                </span>
                {o.created_at && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {brDate(o.created_at)}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Enviamos as próximas instruções para <strong className="text-foreground">{o.customer_email}</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="text-3xl font-black tracking-tight">{formatBRL(Number(o.total))}</div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button onClick={handleDownload} disabled={downloading} variant="secondary" className="gap-2">
                  <Download className="h-4 w-4" />
                  {downloading ? "Gerando PDF…" : "Baixar comprovante"}
                </Button>
                {canCancel && (
                  <Button onClick={handleCancel} disabled={cancelling} variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
                    <XCircle className="h-4 w-4" />
                    {cancelling ? "Cancelando…" : "Cancelar pedido"}
                  </Button>
                )}
              </div>
              {cancelError && <p className="max-w-xs text-right text-xs text-destructive">{cancelError}</p>}
            </div>
          </div>
        </div>

        {/* Finalização do pagamento */}
        {o.payment_method === "PIX" && o.payment_status !== "paid" && o.asaas_pix_qr_code && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-primary/25 bg-card">
            <div className="flex items-center gap-2 border-b bg-primary/5 px-5 py-4">
              <QrCode className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Finalize o pagamento com PIX</h2>
            </div>
            <div className="grid gap-6 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-6">
              <img
                src={o.asaas_pix_qr_code}
                alt="QR Code PIX do pedido"
                className="mx-auto h-52 w-52 rounded-xl border bg-background p-2"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Escaneie o QR Code no app do seu banco</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ou use o código Copia e Cola abaixo. O pedido é atualizado automaticamente após a confirmação.
                </p>
                {o.asaas_pix_copy_paste && (
                  <>
                    <p className="mt-4 break-all rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {String(o.asaas_pix_copy_paste).slice(0, 160)}
                      {String(o.asaas_pix_copy_paste).length > 160 ? "…" : ""}
                    </p>
                    <Button onClick={copyPix} className="mt-3 gap-2">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Código copiado!" : "Copiar código PIX"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {o.payment_method === "BOLETO" && o.payment_status !== "paid" && o.asaas_boleto_url && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Boleto gerado</h2>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={o.asaas_boleto_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Baixar boleto
              </a>
              {o.asaas_invoice_url && (
                <a href={o.asaas_invoice_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                  Ver fatura completa
                </a>
              )}
            </div>
          </div>
        )}

        {/* Progresso */}
        {!isCancelled ? (
          <div className="mt-6 rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Acompanhamento</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${orderStatusBadgeClass(o.status)}`}>
                {orderStatusLabel[o.status ?? ""] ?? o.status}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {STEPS.map((s, i) => {
                const done = i <= current;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex min-w-0 flex-col items-center gap-2 text-center">
                    <div className="relative flex w-full items-center justify-center">
                      {i > 0 && (
                        <span className={`absolute left-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2 ${i <= current ? "bg-primary" : "bg-border"}`} />
                      )}
                      {i < STEPS.length - 1 && (
                        <span className={`absolute right-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2 ${i < current ? "bg-primary" : "bg-border"}`} />
                      )}
                      <span
                        className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                          done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold leading-tight sm:text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm font-semibold text-destructive">
            Este pedido está {(orderStatusLabel[o.status ?? ""] ?? o.status)?.toLowerCase()}.
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          {/* Itens */}
          <div className="rounded-2xl border bg-card">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <ShoppingBag className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Itens do pedido</h2>
              <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <ul className="divide-y">
              {items.map((it) => {
                const cfg = (it as any).custom_config as Record<string, any> | null | undefined;
                const preview = (cfg?.preview_image as string | undefined) ?? ((it as any).image_url as string | undefined);
                const unit = Number((it as any).unit_price ?? 0);
                return (
                  <li key={it.id} className="flex gap-4 p-4 sm:p-5">
                    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted/40">
                      {preview ? (
                        <img src={preview} alt={it.product_name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <p className="min-w-0 text-sm font-bold leading-snug sm:text-base">{it.product_name}</p>
                        <p className="shrink-0 text-sm font-black">{formatBRL(Number(it.total_price))}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Quantidade: {it.quantity}
                        </span>
                        {it.variant_label && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {it.variant_label}
                          </span>
                        )}
                        {cfg?.template_name && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Modelo: {cfg.template_name}
                          </span>
                        )}
                        {cfg?.fabric?.name && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Tecido: {cfg.fabric.name}
                          </span>
                        )}
                      </div>
                      {unit > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">{formatBRL(unit)} por unidade</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {items.some((it: any) => isKimonoContext(it.name, it.product_name)) && (
              <div className="border-t p-5 sm:p-6">
                <KimonoGuideCallout variant="care" />
              </div>
            )}
          </div>

          {/* Resumo lateral */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Resumo</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {o.subtotal != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-semibold">{formatBRL(Number(o.subtotal))}</dd>
                  </div>
                )}
                {o.shipping_cost != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Frete</dt>
                    <dd className="font-semibold">
                      {Number(o.shipping_cost) === 0 ? "Grátis" : formatBRL(Number(o.shipping_cost))}
                    </dd>
                  </div>
                )}
                {o.discount != null && Number(o.discount) > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Desconto</dt>
                    <dd className="font-semibold text-emerald-600">− {formatBRL(Number(o.discount))}</dd>
                  </div>
                )}
                <div className="mt-3 flex justify-between gap-4 border-t pt-3 text-base font-black">
                  <dt>Total</dt>
                  <dd>{formatBRL(Number(o.total))}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Pagamento</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Situação</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${paymentStatusBadgeClass(o.payment_status)}`}>
                    {paymentStatusLabel[o.payment_status ?? ""] ?? o.payment_status}
                  </span>
                </div>
                {paymentMethodLabel(o) && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Forma</span>
                    <span className="font-semibold">{paymentMethodLabel(o)}</span>
                  </div>
                )}
              </div>
            </div>

            {addr && (
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <h2 className="text-sm font-bold uppercase tracking-wider">Entrega</h2>
                </div>
                <address className="mt-3 space-y-0.5 text-sm not-italic leading-relaxed text-muted-foreground">
                  {o.customer_name && <div className="font-semibold text-foreground">{o.customer_name}</div>}
                  {(addr.street || addr.address) && (
                    <div>
                      {addr.street ?? addr.address}
                      {addr.number ? `, ${addr.number}` : ""}
                      {addr.complement ? ` — ${addr.complement}` : ""}
                    </div>
                  )}
                  {(addr.neighborhood || addr.district) && <div>{addr.neighborhood ?? addr.district}</div>}
                  {(addr.city || addr.state) && (
                    <div>
                      {addr.city}
                      {addr.state ? ` / ${addr.state}` : ""}
                    </div>
                  )}
                  {(addr.zip || addr.cep || addr.postal_code) && <div>CEP {addr.zip ?? addr.cep ?? addr.postal_code}</div>}
                </address>
              </div>
            )}
          </div>
        </div>


        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold hover:bg-muted sm:w-auto"
          >
            Continuar comprando
          </Link>
          <a
            href="https://wa.me/5582920016732"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            Falar com o suporte
          </a>
          {canCancel && (
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              variant="outline"
              className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto"
            >
              <XCircle className="h-4 w-4" />
              {cancelling ? "Cancelando…" : "Cancelar pedido"}
            </Button>
          )}
        </div>
      </div>
    </StoreShell>
  );
}
