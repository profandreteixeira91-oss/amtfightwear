import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { getCategoryWithProducts, listStoreCategories } from "@/lib/store/store.functions";

export const Route = createFileRoute("/loja/categoria/$slug")({
  loader: async ({ context, params }) => {
    const q = queryOptions({
      queryKey: ["store", "category", params.slug],
      queryFn: () => getCategoryWithProducts({ data: { slug: params.slug } }),
    });
    const c = queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() });
    await Promise.all([context.queryClient.ensureQueryData(q), context.queryClient.ensureQueryData(c)]);
  },
  head: ({ params, loaderData: _ }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — AMT Fight Wear` },
      { name: "description", content: `Confira ${params.slug.replace(/-/g, " ")} na loja oficial AMT Fight Wear.` },
    ],
  }),
  component: CategoryPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Categoria não encontrada</div>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(queryOptions({
    queryKey: ["store", "category", slug],
    queryFn: () => getCategoryWithProducts({ data: { slug } }),
  }));
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));

  return (
    <StoreShell categories={categories}>
      {/* Hero da categoria — Midnight Ruby */}
      <section className="relative isolate overflow-hidden ink-surface">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_0%,rgba(220,38,38,0.22),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
            <Link to="/" className="transition-colors hover:text-white">Início</Link>
            <span aria-hidden>/</span>
            <span className="text-white/90">{data.category?.name ?? slug}</span>
          </nav>
          <div className="eyebrow !text-primary-foreground/80 mb-3">
            Categoria
          </div>
          <h1 className="font-display text-3xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            {data.category?.name ?? "Categoria"}
          </h1>
          {data.category?.description && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              {data.category.description}
            </p>
          )}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {data.products.length} {data.products.length === 1 ? "produto" : "produtos"}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {data.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center text-muted-foreground">
            Nenhum produto nesta categoria ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </StoreShell>
  );
}

