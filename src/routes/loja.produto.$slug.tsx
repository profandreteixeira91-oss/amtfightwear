import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { KimonoGuideCallout, KimonoSizeGuideLink, isKimonoContext } from "@/components/store/KimonoGuideLink";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { getProductBySlug, listStoreCategories } from "@/lib/store/store.functions";
import { useEffect, useRef, useState } from "react";
import { useCart, formatBRL } from "@/lib/store/cart-store";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import type { ShippingOption } from "@/lib/store/shipping.functions";
import { ProductGallery } from "@/components/store/ProductGallery";
import { TechSpecs } from "@/components/store/TechSpecs";
import { TrustBadges } from "@/components/store/TrustBadges";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import { pushRecentProduct } from "@/lib/store/recent";
import { trackStoreEvent, toAnalyticsItem } from "@/lib/store/analytics";
import { installmentValueFor, maxInstallmentsFor, pixPriceFor } from "@/lib/store/pricing";
import { selectAvailableVariant } from "@/lib/store/variant-availability";
import { formatProductName } from "@/lib/store/product-name";
import { EMBROIDERY_MAX_LENGTH, normalizeEmbroideryName, requiresEmbroideryName } from "@/lib/store/personalization";

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
    const name = formatProductName(p.name) || params.slug.replace(/-/g, " ");
    const title = `${name} | AMT Fight Wear`;
    const desc = (p.short_description || p.description || `Compre ${name} na loja oficial AMT Fight Wear: fabricação própria, parcelamento sem juros e envio para todo o Brasil.`)
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
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error instanceof Error ? error.message : String(error)}</div>,
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

  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [embroidery, setEmbroidery] = useState("");
  const [embroideryError, setEmbroideryError] = useState(false);
  const embroideryRef = useRef<HTMLInputElement>(null);

  // Inicializar seleção baseada em variantes disponíveis
  useEffect(() => {
    if (data.variants.length > 0) {
      const inStock = data.variants.filter((v) => v.stock > 0);
      const pool = inStock.length > 0 ? inStock : data.variants;
      const first = pool[0];
      if (first) {
        setSelectedSize(first.size || null);
        setSelectedColor(first.color || null);
      }
    }
  }, [data.variants]);

  // Sincronizar imagem ao trocar cor
  useEffect(() => {
    if (!selectedColor) return;
    
    // As imagens podem vir de data.images (tabela store_product_images)
    // ou do fallback data.product.image_url.
    // data.images tem precedência na ProductGallery.
    const images = data.images.length > 0 ? data.images : (data.product?.image_url ? [{ url: data.product.image_url, alt: data.product.name }] : []);
    
    if (images.length === 0) return;

    const colorToMatch = selectedColor.toLowerCase();

    // 1. Procura por uma imagem que contenha o nome da cor selecionada no alt ou na URL
    const colorIndex = images.findIndex(img => {
      const alt = (img.alt || "").toLowerCase();
      const url = (img.url || "").toLowerCase();
      
      // Match direto
      if (alt.includes(colorToMatch)) return true;
      if (url.includes(colorToMatch)) return true;
      
      return false;
    });

    if (colorIndex !== -1) {
      setActiveImageIndex(colorIndex);
    } else {
      // 2. Se não encontrou por string direta, tenta mapear termos comuns
      const colorMap: Record<string, string[]> = {
        'branca': ['white', 'branco'],
        'preta': ['black', 'preto'],
        'azul': ['blue'],
        'roxa': ['purple', 'roxo'],
        'marrom': ['brown'],
        'cinza': ['grey', 'gray'],
        'verde': ['green'],
        'amarela': ['yellow', 'amarelo'],
        'laranja': ['orange']
      };

      const synonyms = colorMap[colorToMatch] || [];
      const synonymIndex = images.findIndex(img => {
        const alt = (img.alt || "").toLowerCase();
        const url = (img.url || "").toLowerCase();
        return synonyms.some(s => alt.includes(s) || url.includes(s));
      });

      if (synonymIndex !== -1) {
        setActiveImageIndex(synonymIndex);
      }
    }
  }, [selectedColor, data.images, data.product]);

  const variant = selectAvailableVariant(data.variants, { size: selectedSize, color: selectedColor }) ?? null;

  // Histórico local + evento de visualização (analytics de e-commerce).
  const p = data.product;
  useEffect(() => {
    if (!p) return;
    pushRecentProduct({
      id: p.id,
      name: p.name,
      slug: p.slug ?? p.id,
      image_url: p.image_url,
      price: Number(p.price),
    });
    trackStoreEvent("view_item", {
      value: Number(p.price),
      items: [toAnalyticsItem({ id: p.id, name: p.name, price: p.price, category: data.category?.name ?? null })],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);

  if (!data.product) {
    return (
      <StoreShell categories={categories}>
        <div className="p-16 text-center text-muted-foreground">Produto não encontrado.</div>
      </StoreShell>
    );
  }

  const product = data.product;
  // Removido variant find redundante pois já está definido acima
  // Preço é sempre o cadastrado no painel administrativo (products.price),
  // independentemente de valores individuais em variantes.
  const price = Number(product.price);
  const compareAt = product.compare_at_price;
  const compareAtNum = compareAt ? Number(compareAt) : null;
  const images = data.images.length > 0 ? data.images : product.image_url ? [{ url: product.image_url, alt: product.name }] : [];
  const maxInstallments = maxInstallmentsFor(price);
  const installmentValue = formatBRL(installmentValueFor(price));
  const pixPrice = formatBRL(pixPriceFor(price));

  const needsEmbroidery = requiresEmbroideryName(product.name);
  const displayName = formatProductName(product.name);

  const handleAddToCart = () => {
    if (!variant && data.variants.length > 0) {
      toast.error("Selecione um tamanho disponível");
      return false;
    }
    const embroideryName = normalizeEmbroideryName(embroidery);
    if (needsEmbroidery && !embroideryName) {
      setEmbroideryError(true);
      embroideryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      embroideryRef.current?.focus({ preventScroll: true });
      toast.error("Digite o nome a ser bordado na faixa");
      return false;
    }
    const availableStock = variant?.stock ?? Number(product.stock);
    if (qty > availableStock) {
      toast.error(`Estoque disponível: ${availableStock} unidade(s)`);
      return false;
    }
    const variantLabel = variant ? [variant.size, variant.color].filter(Boolean).join(" / ") : null;
    add({
      product_id: product.id,
      variant_id: variant?.id ?? null,
      name: product.name,
      variant_label: variantLabel,
      slug: product.slug ?? product.id,
      image_url: product.image_url,
      unit_price: price,
      quantity: qty,
      personalization: needsEmbroidery ? embroideryName : null,
    });
    trackStoreEvent("add_to_cart", {
      value: price * qty,
      items: [toAnalyticsItem({ id: product.id, name: product.name, price, quantity: qty, variant: variantLabel })],
    });
    toast.success("Adicionado ao carrinho");
    return true;
  };

  const handleBuyNow = () => {
    if (!handleAddToCart()) return;
    trackStoreEvent("begin_checkout", { value: price * qty, source: "product_buy_now" });
    navigate({ to: "/loja/carrinho" });
  };

  /** Ao escolher o frete já na página do produto, adiciona o item e segue direto
   *  para o checkout com o CEP e a opção de envio pré-selecionados. */
  const handleSelectShipping = (option: ShippingOption, zip: string) => {
    if (!handleAddToCart()) return;
    try {
      sessionStorage.setItem("amt-checkout-shipping", JSON.stringify({ zip, option }));
    } catch { /* ignore */ }
    trackStoreEvent("begin_checkout", { value: price * qty, source: "product_shipping_select" });
    toast.success("Frete selecionado — indo para o checkout");
    navigate({ to: "/loja/checkout" });
  };


  const showKimonoGuide = isKimonoContext(
    product.name,
    product.short_description,
    data.category?.name,
    data.category?.slug,
  );

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
        <nav aria-label="Trilha" className="mb-6 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="shrink-0 transition-colors hover:text-foreground">Início</Link>
          {data.category && (
            <>
              <span aria-hidden className="opacity-50">›</span>
              <Link
                to="/loja/categoria/$slug"
                params={{ slug: data.category.slug }}
                className="min-w-0 truncate transition-colors hover:text-foreground"
              >
                {data.category.name}
              </Link>
            </>
          )}
          <span aria-hidden className="opacity-50">›</span>
          <span className="min-w-0 truncate text-foreground">{displayName}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
          {/* Galeria */}
          <ProductGallery 
            media={images} 
            name={product.name} 
            activeImageIndex={activeImageIndex}
            onImageChange={setActiveImageIndex}
          />


          {/* Buy box */}
          <div className="flex flex-col gap-5">
            <div>
              {data.category && (
                <div className="mb-2 text-xs font-medium text-muted-foreground">{data.category.name}</div>
              )}
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[1.75rem]">{displayName}</h1>
              {product.sku && <div className="mt-2 text-[11px] text-muted-foreground">Ref. {product.sku}</div>}
            </div>

            <div className="border-y border-neutral-200 py-5">
              {compareAtNum && compareAtNum > price && (
                <div className="text-sm text-muted-foreground line-through">{formatBRL(compareAtNum)}</div>
              )}
              <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">{formatBRL(price)}</div>
              {maxInstallments > 1 ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  ou até <strong className="text-foreground">{maxInstallments}x</strong> de <strong className="text-foreground">{installmentValue}</strong> sem juros
                </div>
              ) : null}
              <div className="mt-2 text-sm font-medium text-emerald-700">
                {pixPrice} no PIX <span className="font-normal text-muted-foreground">(5% de desconto)</span>
              </div>
            </div>

            {data.variants.length > 0 && (
              <div className="flex flex-col gap-6">
                {/* Tamanhos */}
                {(() => {
                  const sizes = Array.from(new Set(data.variants.map(v => v.size).filter(Boolean)));
                  if (sizes.length === 0) return null;
                  return (
                    <div>
                      <div className="mb-2.5 flex items-center justify-between text-sm font-medium">
                        <span>Tamanho{selectedSize ? <span className="font-normal text-muted-foreground"> · {selectedSize}</span> : null}</span>
                        {showKimonoGuide && <KimonoSizeGuideLink />}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((s) => {
                          const selected = s === selectedSize;
                          // Verifica se o tamanho está disponível na cor selecionada (se houver cor)
                          const available = selectAvailableVariant(data.variants, { size: s });
                          const outOfStock = !available;
                          
                          return (
                            <button
                              key={s}
                              disabled={outOfStock}
                              onClick={() => {
                                if (!s) return;
                                const next = selectAvailableVariant(data.variants, { size: s, color: selectedColor }) ?? available;
                                if (!next) return;
                                setSelectedSize(next.size);
                                setSelectedColor(next.color);
                                setQty(1);
                              }}
                              className={`min-w-[3.25rem] rounded-full border px-4 py-2 text-sm font-medium transition ${
                                selected
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-neutral-300 bg-white hover:border-foreground"
                              } ${outOfStock ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Cores */}
                {(() => {
                  const colors = Array.from(new Set(data.variants.map(v => v.color).filter(Boolean)));
                  if (colors.length === 0) return null;
                  return (
                    <div>
                      <div className="mb-2.5 text-sm font-medium">
                        Cor{selectedColor ? <span className="font-normal text-muted-foreground"> · {selectedColor}</span> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((c) => {
                          const selected = c === selectedColor;
                          // Verifica se a cor está disponível no tamanho selecionado (se houver tamanho)
                          const available = data.variants.find(v => v.color === c && v.stock > 0);
                          const outOfStock = !available;

                          return (
                            <button
                              key={c}
                              disabled={outOfStock}
                              onClick={() => {
                                if (!c) return;
                                const next = selectAvailableVariant(data.variants, { size: selectedSize, color: c }) ?? available;
                                if (!next) return;
                                setSelectedSize(next.size);
                                setSelectedColor(next.color === null ? c : next.color);
                                setQty(1);
                              }}
                              className={`min-w-[3.25rem] rounded-full border px-4 py-2 text-sm font-medium transition ${
                                selected
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-neutral-300 bg-white hover:border-foreground"
                              } ${outOfStock ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {needsEmbroidery && (
              <div>
                <label
                  htmlFor="embroidery-name"
                  className="mb-2.5 flex items-center justify-between text-sm font-medium"
                >
                  <span>Nome a ser bordado <span className="text-primary">*</span></span>
                  <span className="text-xs font-normal tabular-nums text-muted-foreground">
                    {embroidery.length}/{EMBROIDERY_MAX_LENGTH}
                  </span>
                </label>
                <input
                  id="embroidery-name"
                  ref={embroideryRef}
                  value={embroidery}
                  maxLength={EMBROIDERY_MAX_LENGTH}
                  onChange={(e) => {
                    setEmbroidery(e.target.value);
                    if (embroideryError && e.target.value.trim()) setEmbroideryError(false);
                  }}
                  placeholder="Ex.: João Silva"
                  autoComplete="off"
                  aria-invalid={embroideryError}
                  aria-describedby="embroidery-help"
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-base font-medium outline-none transition focus:border-foreground focus:ring-4 focus:ring-neutral-900/5 ${
                    embroideryError ? "border-destructive ring-4 ring-destructive/10" : "border-neutral-300"
                  }`}
                />
                <p id="embroidery-help" className={`mt-1.5 text-xs ${embroideryError ? "text-destructive" : "text-muted-foreground"}`}>
                  {embroideryError
                    ? "Obrigatório: digite o nome exatamente como deve sair no bordado."
                    : "Digite exatamente como deve sair no bordado (maiúsculas, acentos e espaços são respeitados)."}
                </p>
                {embroidery.trim() && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed bg-muted/40 px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Prévia</span>
                    <span className="truncate font-display text-lg font-bold tracking-wide">{normalizeEmbroideryName(embroidery)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">Quantidade</div>
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
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Comprar agora
              </button>
              <button
                onClick={handleAddToCart}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-foreground bg-white px-6 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background"
              >
                <ShoppingBag className="h-4 w-4" /> Adicionar
              </button>
              <FavoriteButton
                product={{ id: product.id, name: product.name, slug: product.slug ?? product.id, image_url: product.image_url, price }}
                className="h-12 w-12 self-center rounded-full"
              />
            </div>


            {/* Resumo só quando acrescenta algo: muitos cadastros repetem o início da descrição completa. */}
            {product.short_description &&
              !(product.description ?? "").replace(/<[^>]*>/g, "").trim().startsWith(product.short_description.trim().slice(0, 60)) && (
                <p className="text-sm leading-relaxed text-muted-foreground">{product.short_description}</p>
              )}

            {showKimonoGuide && <KimonoGuideCallout variant="card" />}

            <ShippingCalculator
              items={[{ product_id: product.id, variant_id: variant?.id ?? null, quantity: qty, unit_price: Number(price) }]}
              onSelect={handleSelectShipping}
            />

            <TrustBadges />

          </div>
        </div>

        {/* Descrição */}
        {product.description && (
          <section className="mt-14 card-elevated p-6 sm:p-8">
            <div className="eyebrow mb-3">Descrição</div>
            <h2 className="mb-8 font-display text-2xl font-bold tracking-tight sm:text-3xl">Ficha Técnica Profissional</h2>
            <TechSpecs description={product.description} />
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
              {(data.related as any[]).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {showKimonoGuide && <KimonoGuideCallout className="mt-14" />}

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
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-foreground text-foreground transition active:scale-95"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          <button
            onClick={handleBuyNow}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
          >
            Comprar
          </button>
        </div>
      </div>
    </StoreShell>
  );
}

