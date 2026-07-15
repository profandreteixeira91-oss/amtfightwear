import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories, getStoreOrder } from "@/lib/store/store.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { CheckCircle2 } from "lucide-react";

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

  if (!data) {
    return <StoreShell categories={categories}><div className="p-16 text-center">Pedido não encontrado.</div></StoreShell>;
  }

  const { order, items } = data;

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-black">Pedido confirmado!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Número do pedido: <strong className="text-foreground">{order.order_number}</strong></p>
          <p className="mt-2 text-sm">Enviamos as próximas instruções para <strong>{order.customer_email}</strong>.</p>
        </div>

        <div className="mt-6 rounded-lg border bg-card p-6">
          <h2 className="mb-3 font-bold">Itens</h2>
          {items.map((it) => (
            <div key={it.id} className="flex justify-between border-b py-2 text-sm last:border-0">
              <div>
                <div className="font-medium">{it.product_name} <span className="text-muted-foreground">×{it.quantity}</span></div>
                {it.variant_label && <div className="text-xs text-muted-foreground">{it.variant_label}</div>}
              </div>
              <div className="font-semibold">{formatBRL(Number(it.total_price))}</div>
            </div>
          ))}
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
