import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { getProductBySlug, listStoreCategories } from "@/lib/store/store.functions";
import { useEffect, useState } from "react";
import { useCart, formatBRL } from "@/lib/store/cart-store";
import { ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import { ProductGallery } from "@/components/store/ProductGallery";
import { TrustBadges } from "@/components/store/TrustBadges";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import { pushRecentProduct } from "@/lib/store/recent";
import { trackStoreEvent, toAnalyticsItem } from "@/lib/store/analytics";
import { installmentValueFor, maxInstallmentsFor, pixPriceFor } from "@/lib/store/pricing";

export const Route = createFileRoute("/loja/produto/$slug")({
  loader: async ({ context, params }) => {
    const q = queryOptions({
      queryKey: ["store", "product", params.slug],
      queryFn: () => getProductBySlug({ data: { slug: params.slug } }),
    });
    const c = queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() });
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(q),
      context.queryClient.ensureQueryData(c),
    ]);
    return { product: data.product, category: data.category };
  },
  head: ({ params, loaderData }) => {
    const url = `https://amtfightwear.com.br/loja/produto/${params.slug}`;
    const p = loaderData?.product as
      | { name?: string; short_description?: string | null; description?: string | null; price?: number | null; image_url?: string | null; sku?: string | null }
      | null
      | undefined;
    if (!p) {
      return {
        meta: [
          { title: "Produto não encontrado — AMT Fight Wear" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const name = p.name ?? params.slug.replace(/-/g, " ");
    const title = `${name} | AMT Fight Wear`;
    const desc = (p.short_description || p.description || `Compre ${name} na loja oficial AMT Fight Wear: fabricação própria, até 10x sem juros e envio para todo o Brasil.`)
      .replace(/<[^>]*>/g, "")
      .slice(0, 155);
    const img = p.image_url && /^https?:\/\//.test(p.image_url) ? p.image_url : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description: desc,
            ...(img ? { image: img } : {}),
            ...(p.sku ? { sku: p.sku } : {}),
            brand: { "@type": "Brand", name: "AMT Fight Wear" },
            ...(p.price
              ? {
                  offers: {
                    "@type": "Offer",
                    url,
                    priceCurrency: "BRL",
                    price: Number(p.price).toFixed(2),
                    availability: "https://schema.org/InStock",
                  },
                }
              : {}),
          }),
        },
      ],
    };
  },

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

  const defaultVariantId = (() => {
    const inStock = data.variants.filter((v) => v.stock > 0);
    const pool = inStock.length > 0 ? inStock : data.variants;
    return pool[0]?.id ?? null;
  })();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(defaultVariantId);
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
  // Preço é sempre o cadastrado no painel administrativo (products.price),
  // independentemente de valores individuais em variantes.
  const price = Number(product.price);
  const compareAt = product.compare_at_price;
  const compareAtNum = compareAt ? Number(compareAt) : null;
  const images = data.images.length > 0 ? data.images : product.image_url ? [{ url: product.image_url, alt: product.name }] : [];
  const maxInstallments = price >= 1000 ? 10 : price >= 600 ? 5 : price >= 200 ? 3 : 1;
  const installmentValue = (price / maxInstallments).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pixPrice = (price * 0.95).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-x-2 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          <Link to="/" className="hover:text-primary">Início</Link>
          <span aria-hidden>/</span>
          {data.category && (
            <>
              <Link to="/loja/categoria/$slug" params={{ slug: data.category.slug }} className="hover:text-primary">{data.category.name}</Link>
              <span aria-hidden>/</span>
            </>
          )}
          <span className="normal-case tracking-normal text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          {/* Galeria */}
          <ProductGallery media={images} name={product.name} />


          {/* Buy box */}
          <div className="flex flex-col gap-5">
            <div>
              {data.category && (
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  {data.category.name}
                </div>
              )}
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
              {product.sku && <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">SKU: {product.sku}</div>}
            </div>

            <div className="card-elevated p-5">
              {compareAtNum && compareAtNum > price && (
                <div className="text-sm text-muted-foreground line-through">{formatBRL(compareAtNum)}</div>
              )}
              <div className="font-display text-4xl font-bold tracking-tight text-foreground">{formatBRL(price)}</div>
              {maxInstallments > 1 ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  ou até <strong className="text-foreground">{maxInstallments}x</strong> de <strong className="text-foreground">{installmentValue}</strong> sem juros
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">à vista</div>
              )}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                PIX {pixPrice} <span className="font-normal opacity-70">(5% off · varejo)</span>
              </div>
            </div>

            {data.variants.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Tamanho / Variação</span>
                  <span className="text-primary normal-case tracking-normal font-medium">Guia de medidas</span>
                </div>
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
                        className={`min-w-[3.25rem] rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-[var(--store-shadow-ruby)]"
                            : "border-input bg-background hover:border-primary/50"
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Qtd</div>
              <div className="inline-flex items-center rounded-full border bg-background">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-10 w-10 place-items-center rounded-l-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Diminuir">−</button>
                <div className="w-10 select-none text-center text-sm font-bold tabular-nums">{qty}</div>
                <button onClick={() => setQty(qty + 1)} className="grid h-10 w-10 place-items-center rounded-r-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Aumentar">+</button>
              </div>
            </div>

            {/* Botões — visíveis apenas ≥sm; no mobile ficam na barra sticky abaixo */}
            <div className="hidden gap-2 sm:flex">
              <button
                onClick={handleBuyNow}
                className="btn-ruby inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-widest"
              >
                <Zap className="h-4 w-4" /> Comprar agora
              </button>
              <button
                onClick={handleAddToCart}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-foreground transition hover:bg-foreground hover:text-background"
              >
                <ShoppingBag className="h-4 w-4" /> Adicionar
              </button>
              <FavoriteButton
                product={{ id: product.id, name: product.name, slug: product.slug ?? product.id, image_url: product.image_url, price }}
                className="h-auto self-stretch rounded-xl"
              />
            </div>


            {product.short_description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{product.short_description}</p>
            )}

            <ShippingCalculator
              items={[{ product_id: product.id, variant_id: variant?.id ?? null, quantity: qty, unit_price: Number(price) }]}
            />

            {/* Trust strip */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <div>Frete grátis<br /><span className="text-foreground">R$ 399+</span></div>
              <div>Direto da<br /><span className="text-foreground">fábrica</span></div>
              <div>Troca fácil<br /><span className="text-foreground">7 dias</span></div>
            </div>
            <TrustBadges />

          </div>
        </div>

        {/* Descrição */}
        {product.description && (
          <section className="mt-14 card-elevated p-6 sm:p-8">
            <div className="eyebrow mb-3">Descrição</div>
            <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">Detalhes do produto</h2>
            <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground">
              {product.description}
            </div>
          </section>
        )}

        {/* Relacionados */}
        {data.related.length > 0 && (
          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="eyebrow">Continue comprando</div>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Produtos relacionados</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {data.related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <RecentlyViewed excludeId={product.id} />
      </div>


      {/* Barra de compra sticky — mobile only */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur pb-safe sm:hidden"
        style={{ boxShadow: "0 -8px 24px -8px rgb(10 10 10 / 0.12)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 pt-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {variant ? [variant.size, variant.color].filter(Boolean).join(" / ") || "Selecionado" : "Preço total"}
            </div>
            <div className="font-display text-lg font-bold tabular-nums text-foreground">
              {formatBRL(price * qty)}
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            aria-label="Adicionar ao carrinho"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-foreground text-foreground transition active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          <button
            onClick={handleBuyNow}
            className="btn-ruby inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold uppercase tracking-widest"
          >
            <Zap className="h-4 w-4" /> Comprar
          </button>
        </div>
      </div>
    </StoreShell>
  );
}

