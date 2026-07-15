import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories, getStoreOrder } from "@/lib/store/store.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { exportOrderPdf } from "@/lib/store/order-pdf";
import { CheckCircle2, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/loja/pedido/$id")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() })),
      context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "order", params.id], queryFn: () => getStoreOrder({ data: { id: params.id } }) })),
    ]);
  },
  head: () => ({ meta: [{ title: "Pedido — AMT Fight Wear" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Pedido não encontrado</div>,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["store", "order", id], queryFn: () => getStoreOrder({ data: { id } }) }));
  const [downloading, setDownloading] = useState(false);

  if (!data) {
    return <StoreShell categories={categories}><div className="p-16 text-center">Pedido não encontrado.</div></StoreShell>;
  }

  const { order, items } = data;

  async function handleDownload() {
    setDownloading(true);
    try {
      await exportOrderPdf(order as any, items as any);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-black">Pedido confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Número do pedido: <strong className="text-foreground">{order.order_number}</strong></p>
          <p className="mt-2 text-sm">Enviamos as próximas instruções para <strong>{order.customer_email}</strong>.</p>
          <Button onClick={handleDownload} disabled={downloading} className="mt-4 gap-2">
            <Download className="h-4 w-4" />
            {downloading ? "Gerando PDF…" : "Baixar PDF do pedido"}
          </Button>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6">
          <h2 className="mb-3 font-bold">Itens</h2>
          {items.map((it) => {
            const cfg = (it as any).custom_config as Record<string, any> | null | undefined;
            const preview = cfg?.preview_image as string | undefined;
            return (
              <div key={it.id} className="flex gap-3 border-b py-3 text-sm last:border-0">
                {preview && (
                  <img src={preview} alt={it.product_name} className="h-20 w-20 shrink-0 rounded-md border object-cover" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{it.product_name} <span className="text-muted-foreground">×{it.quantity}</span></div>
                  {it.variant_label && <div className="text-xs text-muted-foreground">{it.variant_label}</div>}
                  {cfg?.template_name && <div className="mt-1 text-xs text-muted-foreground">Modelo: {cfg.template_name}{cfg.fabric?.name ? ` · ${cfg.fabric.name}` : ""}</div>}
                </div>
                <div className="whitespace-nowrap font-semibold">{formatBRL(Number(it.total_price))}</div>
              </div>
            );
          })}
          <div className="mt-3 flex justify-between text-base font-black">
            <span>Total</span>
            <span>{formatBRL(Number(order.total))}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Status pagamento</div>
            <div className="mt-1 font-semibold">{order.payment_status}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Status pedido</div>
            <div className="mt-1 font-semibold">{order.status}</div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/loja" className="text-sm font-semibold text-primary hover:underline">Continuar comprando →</Link>
        </div>
      </div>
    </StoreShell>
  );
}

