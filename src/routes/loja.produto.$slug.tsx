import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { getProductBySlug, listStoreCategories } from "@/lib/store/store.functions";
import { useState } from "react";
import { useCart, formatBRL } from "@/lib/store/cart-store";
import { ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import { ProductImage } from "@/components/store/ProductImage";

export const Route = createFileRoute("/loja/produto/$slug")({
  loader: async ({ context, params }) => {
    const q = queryOptions({
      queryKey: ["store", "product", params.slug],
      queryFn: () => getProductBySlug({ data: { slug: params.slug } }),
    });
    const c = queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() });
    await Promise.all([context.queryClient.ensureQueryData(q), context.queryClient.ensureQueryData(c)]);
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — AMT Fight Wear` },
      { name: "description", content: `Compre ${params.slug.replace(/-/g, " ")} na loja oficial AMT Fight Wear.` },
    ],
  }),
  component: ProductPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Produto não encontrado</div>,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(queryOptions({
    queryKey: ["store", "product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  }));
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  const add = useCart((s) => s.add);

  const [selectedVariant, setSelectedVariant] = useState<string | null>(data.variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (!data.product) {
    return (
      <StoreShell categories={categories}>
        <div className="p-16 text-center text-muted-foreground">Produto não encontrado.</div>
      </StoreShell>
    );
  }

  const product = data.product;
  const variant = data.variants.find((v) => v.id === selectedVariant) ?? null;
  const price = Number(variant?.price ?? product.price);
  const compareAt = variant?.compare_at_price ?? product.compare_at_price;
  const compareAtNum = compareAt ? Number(compareAt) : null;
  const images = data.images.length > 0 ? data.images : product.image_url ? [{ url: product.image_url, alt: product.name }] : [];
  const installments = (price / 10).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAddToCart = () => {
    add({
      product_id: product.id,
      variant_id: variant?.id ?? null,
      name: product.name,
      variant_label: variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : null,
      slug: product.slug ?? product.id,
      image_url: product.image_url,
      unit_price: price,
      quantity: qty,
    });
    toast.success("Adicionado ao carrinho");
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate({ to: "/loja/carrinho" });
  };

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link>
          <span className="mx-2">/</span>
          {data.category && (
            <>
              <Link to="/loja/categoria/$slug" params={{ slug: data.category.slug }} className="hover:text-primary">{data.category.name}</Link>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <ProductImage
              src={images[activeImage]?.url}
              alt={images[activeImage]?.alt ?? product.name}
              aspect="square"
              className="rounded-lg border"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded border-2 ${i === activeImage ? "border-primary" : "border-transparent"}`}
                  >
                    <ProductImage src={img.url} alt="" aspect="square" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy box */}
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-black sm:text-3xl">{product.name}</h1>
            {product.sku && <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>}

            <div className="rounded-lg border bg-card p-4">
              {compareAtNum && compareAtNum > price && (
                <div className="text-sm text-muted-foreground line-through">{formatBRL(compareAtNum)}</div>
              )}
              <div className="text-3xl font-black text-foreground">{formatBRL(price)}</div>
              <div className="text-sm text-muted-foreground">ou 10x de <strong>{installments}</strong> sem juros</div>
              <div className="mt-1 text-xs text-primary font-semibold">5% de desconto no PIX</div>
            </div>

            {data.variants.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold">Tamanho / Variação</div>
                <div className="flex flex-wrap gap-2">
                  {data.variants.map((v) => {
                    const label = v.size || v.color || v.option_label || "Único";
                    const selected = v.id === selectedVariant;
                    const outOfStock = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        disabled={outOfStock}
                        onClick={() => setSelectedVariant(v.id)}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary"
                        } ${outOfStock ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold">Qtd</div>
              <div className="flex items-center rounded-md border">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-lg">−</button>
                <div className="w-10 text-center text-sm">{qty}</div>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-lg">+</button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleBuyNow}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
              >
                <Zap className="h-4 w-4" /> Comprar agora
              </button>
              <button
                onClick={handleAddToCart}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-primary px-6 py-3 font-bold text-primary hover:bg-primary/5"
              >
                <ShoppingBag className="h-4 w-4" /> Adicionar
              </button>
            </div>

            {product.short_description && (
              <p className="mt-2 text-sm text-muted-foreground">{product.short_description}</p>
            )}

            <ShippingCalculator
              items={[{ product_id: product.id, variant_id: variant?.id ?? null, quantity: qty }]}
            />
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <section className="mt-12 rounded-lg border bg-card p-6">
            <h2 className="mb-3 text-lg font-bold">Descrição</h2>
            <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground">
              {product.description}
            </div>
          </section>
        )}

        {/* Related */}
        {data.related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-black">Produtos relacionados</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </StoreShell>
  );
}
