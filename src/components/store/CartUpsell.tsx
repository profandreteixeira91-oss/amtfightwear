import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/store/ProductImage";
import { listStorefrontHome } from "@/lib/store/store.functions";
import { useCart } from "@/lib/store/cart-store";
import { formatMoney, missingForFreeShipping } from "@/lib/store/pricing";
import { trackStoreEvent, toAnalyticsItem } from "@/lib/store/analytics";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  image_url?: string | null;
};

/**
 * Cross-sell inteligente do carrinho: prioriza itens que ajudam o cliente a
 * bater o frete grátis e nunca sugere algo que já está no carrinho.
 */
export function CartUpsell({ subtotal }: { subtotal: number }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);

  const { data } = useQuery({
    queryKey: ["storefront-home-upsell"],
    queryFn: () => listStorefrontHome(),
    staleTime: 5 * 60 * 1000,
  });

  const missing = missingForFreeShipping(subtotal);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!data) return [];
    const pool: Suggestion[] = [...(data.featured ?? []), ...(data.newest ?? []), ...(data.bjjBelts ?? [])];
    const inCart = new Set(items.map((i) => i.product_id));
    const seen = new Set<string>();
    const unique = pool.filter((p) => {
      if (!p?.id || inCart.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    // Se falta pouco para o frete grátis, prioriza produtos que fecham a conta.
    if (missing > 0) {
      unique.sort((a, b) => {
        const da = Math.abs(Number(a.price) - missing);
        const db = Math.abs(Number(b.price) - missing);
        return da - db;
      });
    }
    return unique.slice(0, 4);
  }, [data, items, missing]);

  if (suggestions.length === 0) return null;

  const handleAdd = (p: Suggestion) => {
    add({
      product_id: p.id,
      variant_id: null,
      name: p.name,
      slug: p.slug,
      image_url: p.image_url ?? null,
      unit_price: Number(p.price),
      quantity: 1,
      type: "product",
    });
    trackStoreEvent("add_to_cart", {
      value: Number(p.price),
      items: [toAnalyticsItem({ id: p.id, name: p.name, price: p.price })],
      source: "cart_upsell",
    });
    toast.success("Produto adicionado ao carrinho");
  };

  return (
    <section aria-labelledby="cart-upsell" className="rounded-2xl border bg-background p-4">
      <div className="mb-3 flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
        <div>
          <h2 id="cart-upsell" className="text-sm font-black uppercase tracking-[0.14em]">
            Complete seu setup
          </h2>
          <p className="text-xs text-muted-foreground">
            {missing > 0
              ? `Adicione ${formatMoney(missing)} e garanta frete grátis.`
              : "Escolhidos para treinar com o kit completo."}
          </p>
        </div>
      </div>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {suggestions.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-start rounded-xl border p-2 sm:w-auto">
            <Link to="/loja/produto/$slug" params={{ slug: p.slug }} className="group block">
              <div className="overflow-hidden rounded-lg">
                <ProductImage
                  src={p.image_url}
                  alt={p.name}
                  aspect="square"
                  imgClassName="transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug">{p.name}</p>
            </Link>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-black text-primary">{formatMoney(Number(p.price))}</span>
              <button
                type="button"
                onClick={() => handleAdd(p)}
                aria-label={`Adicionar ${p.name} ao carrinho`}
                className="grid h-9 w-9 min-h-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
