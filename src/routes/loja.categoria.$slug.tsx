import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X, ChevronDown, ArrowUpDown } from "lucide-react";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { getCategoryWithProducts, listStoreCategories } from "@/lib/store/store.functions";

export const Route = createFileRoute("/loja/categoria/$slug")({
  loader: async ({ context, params }) => {
    const q = queryOptions({
      queryKey: ["store", "category", params.slug],
      queryFn: () => getCategoryWithProducts({ data: { slug: params.slug } }),
    });
    const c = queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() });
    const [data] = await Promise.all([
      context.queryClient.ensureQueryData(q),
      context.queryClient.ensureQueryData(c),
    ]);
    return { category: data.category, count: data.products.length };
  },
  head: ({ params, loaderData }) => {
    const url = `https://amtfightwear.com.br/loja/categoria/${params.slug}`;
    const cat = loaderData?.category as { name?: string; description?: string | null } | null | undefined;
    if (!cat) {
      return {
        meta: [
          { title: "Categoria não encontrada — AMT Fight Wear" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const name = cat.name ?? params.slug.replace(/-/g, " ");
    const title = `${name} | AMT Fight Wear`;
    const desc = (cat.description || `${name} da AMT Fight Wear: fabricação própria, alta durabilidade, até 10x sem juros e envio para todo o Brasil.`)
      .replace(/<[^>]*>/g, "")
      .slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: "https://amtfightwear.com.br/" },
              { "@type": "ListItem", position: 2, name, item: url },
            ],
          }),
        },
      ],
    };
  },

  component: CategoryPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Categoria não encontrada</div>,
});

type SortKey = "relevance" | "price-asc" | "price-desc" | "name-asc";

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(queryOptions({
    queryKey: ["store", "category", slug],
    queryFn: () => getCategoryWithProducts({ data: { slug } }),
  }));
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));

  const category = data.category;
  const products = data.products;

  // Build category tree helpers
  const childrenByParent = useMemo(() => {
    const map = new Map<string, typeof categories>();
    for (const c of categories) {
      if (c.parent_id) {
        const arr = map.get(c.parent_id) ?? [];
        arr.push(c);
        map.set(c.parent_id, arr);
      }
    }
    return map;
  }, [categories]);

  // Subtree ids under current category (for descendants list)
  const subCategories = useMemo(() => {
    if (!category?.id) return [] as typeof categories;
    return (childrenByParent.get(category.id) ?? []) as typeof categories;
  }, [category?.id, childrenByParent]);

  // Sibling top-level categories (peer navigation)
  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent_id),
    [categories],
  );

  // Price bounds
  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const prices = products.map((p) => Number(p.price ?? 0));
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  // Filters state
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState<number>(priceBounds.min);
  const [maxPrice, setMaxPrice] = useState<number>(priceBounds.max);
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reset price bounds when products change
  useMemo(() => {
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
  }, [priceBounds.min, priceBounds.max]);

  const toggleSub = (id: string) => {
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedSubIds(new Set());
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
    setOnlyPromo(false);
  };

  const activeFiltersCount =
    selectedSubIds.size +
    (onlyPromo ? 1 : 0) +
    (minPrice !== priceBounds.min || maxPrice !== priceBounds.max ? 1 : 0);

  // Descendant map: for each direct sub, gather all ids under it
  const descendantIds = useMemo(() => {
    const compute = (id: string): string[] => {
      const acc = [id];
      const kids = childrenByParent.get(id) ?? [];
      for (const k of kids) acc.push(...compute(k.id!));
      return acc;
    };
    const m = new Map<string, string[]>();
    for (const s of subCategories) if (s.id) m.set(s.id, compute(s.id));
    return m;
  }, [subCategories, childrenByParent]);

  const filtered = useMemo(() => {
    let list = products.slice();
    if (selectedSubIds.size > 0) {
      const allowedIds = new Set<string>();
      for (const sid of selectedSubIds) {
        for (const d of descendantIds.get(sid) ?? [sid]) allowedIds.add(d);
      }
      list = list.filter((p) => p.category_id && allowedIds.has(p.category_id));
    }
    list = list.filter((p) => {
      const price = Number(p.price ?? 0);
      return price >= minPrice && price <= maxPrice;
    });
    if (onlyPromo) {
      list = list.filter((p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price));
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [products, selectedSubIds, descendantIds, minPrice, maxPrice, onlyPromo, sort]);

  const currency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const FiltersPanel = (
    <div className="space-y-6">
      {/* Subcategorias */}
      {subCategories.length > 0 && (
        <FilterSection title="Subcategorias" defaultOpen>
          <ul className="space-y-1.5">
            {subCategories.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary"
                    checked={selectedSubIds.has(s.id!)}
                    onChange={() => toggleSub(s.id!)}
                  />
                  <span className="flex-1">{s.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      )}

      {/* Preço */}
      {priceBounds.max > priceBounds.min && (
        <FilterSection title="Faixa de preço" defaultOpen>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Mín.</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Math.max(priceBounds.min, Number(e.target.value) || 0))}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">Máx.</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Math.min(priceBounds.max, Number(e.target.value) || 0))}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currency(minPrice)}</span>
              <span>{currency(maxPrice)}</span>
            </div>
          </div>
        </FilterSection>
      )}

      {/* Ofertas */}
      <FilterSection title="Ofertas" defaultOpen>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            checked={onlyPromo}
            onChange={(e) => setOnlyPromo(e.target.checked)}
          />
          <span>Somente com desconto</span>
        </label>
      </FilterSection>

      {/* Outras categorias */}
      {topCategories.length > 1 && (
        <FilterSection title="Explorar outras categorias">
          <ul className="space-y-1">
            {topCategories
              .filter((c) => c.slug !== category?.slug)
              .map((c) => (
                <li key={c.id}>
                  <Link
                    to="/loja/categoria/$slug"
                    params={{ slug: c.slug }}
                    className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
          </ul>
        </FilterSection>
      )}
    </div>
  );

  return (
    <StoreShell categories={categories}>
      {/* Hero da categoria */}
      <section className="relative isolate overflow-hidden ink-surface">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(220,38,38,0.22),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <nav className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
            <Link to="/" className="transition-colors hover:text-white">Início</Link>
            <span aria-hidden>/</span>
            <span className="text-white/90">{category?.name ?? slug}</span>
          </nav>
          <h1 className="font-display text-3xl font-bold leading-[1.05] text-white sm:text-4xl lg:text-5xl">
            {category?.name ?? "Categoria"}
          </h1>
          {category?.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              {category.description}
            </p>
          )}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Limpar ({activeFiltersCount})
                  </button>
                )}
              </div>
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                {FiltersPanel}
              </div>
            </div>
          </aside>

          {/* Produtos */}
          <section className="min-w-0">
            {/* Toolbar */}
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <div className="hidden text-sm text-muted-foreground lg:block">
                Mostrando <strong className="text-foreground">{filtered.length}</strong> de {products.length}
              </div>
              <label className="ml-auto inline-flex items-center gap-2 text-sm">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <span className="hidden text-muted-foreground sm:inline">Ordenar:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium"
                >
                  <option value="relevance">Relevância</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="name-asc">Nome (A–Z)</option>
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center">
                <p className="text-muted-foreground">Nenhum produto encontrado com os filtros atuais.</p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 hover:bg-accent"
                aria-label="Fechar filtros"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {FiltersPanel}
              <div className="mt-6 flex gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm font-semibold"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Ver {filtered.length} produtos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StoreShell>
  );
}

function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between text-left text-xs font-bold uppercase tracking-widest text-foreground"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
}
