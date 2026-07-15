import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductImage } from "@/components/store/ProductImage";
import { listStoreCategories } from "@/lib/store/store.functions";
import { useCart, formatBRL } from "@/lib/store/cart-store";
import { Trash2, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/loja/carrinho")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  },
  head: () => ({ meta: [{ title: "Carrinho — AMT Fight Wear" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function CartPage() {
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQuantity = useCart((s) => s.setQuantity);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);

  if (!mounted) return <StoreShell categories={categories}><div className="p-16" /></StoreShell>;

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-black">Seu carrinho</h1>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <Link to="/loja" className="mt-4 inline-block rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground">Ir para a loja</Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {items.map((i, idx) => (
                <div key={`${i.product_id}-${i.variant_id ?? ""}-${idx}`} className="flex gap-4 rounded-lg border bg-card p-3">
                  <ProductImage src={i.image_url} alt={i.name} aspect="square" className="h-24 w-24 shrink-0 rounded" />
                  <div className="flex flex-1 flex-col">
                    {i.type === "custom" ? (
                      <div className="font-semibold">{i.name}</div>
                    ) : (
                      <Link to="/loja/produto/$slug" params={{ slug: i.slug }} className="font-semibold hover:text-primary">{i.name}</Link>
                    )}
                    {i.variant_label && <div className="text-xs text-muted-foreground">{i.variant_label}</div>}
                    {i.type === "custom" && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">Custom Shop</span>
                        {i.production_days && (
                          <span className="text-muted-foreground">Produção em {i.production_days} dias</span>
                        )}
                        {i.custom_config?.fabric?.name && (
                          <span className="text-muted-foreground">· {i.custom_config.fabric.name}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-1 text-sm font-bold">{formatBRL(i.unit_price)}</div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <button onClick={() => setQuantity(i.product_id, i.variant_id, i.quantity - 1)} className="px-3 py-1">−</button>
                        <div className="w-8 text-center text-sm">{i.quantity}</div>
                        <button onClick={() => setQuantity(i.product_id, i.variant_id, i.quantity + 1)} className="px-3 py-1">+</button>
                      </div>
                      <button onClick={() => remove(i.product_id, i.variant_id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-bold">{formatBRL(i.unit_price * i.quantity)}</div>
                </div>
              ))}
            </div>


            <div className="h-fit rounded-lg border bg-card p-5">
              <h2 className="mb-3 text-lg font-bold">Resumo</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  <span>Calculado no checkout</span>
                </div>
                <div className="my-3 border-t pt-3 flex justify-between text-base font-black">
                  <span>Total</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                <div className="text-xs text-muted-foreground">ou 10x de <strong>{formatBRL(subtotal / 10)}</strong> sem juros</div>
              </div>
              <Link to="/loja/checkout" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90">
                Finalizar compra <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/loja" className="mt-2 block text-center text-sm text-muted-foreground hover:text-primary">Continuar comprando</Link>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
