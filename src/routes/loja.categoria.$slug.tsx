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
      <div className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/loja" className="hover:text-primary">Início</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{data.category?.name ?? slug}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-black">{data.category?.name ?? "Categoria"}</h1>
          {data.category?.description && <p className="mt-2 text-sm text-muted-foreground">{data.category.description}</p>}
          <p className="mt-2 text-sm text-muted-foreground">{data.products.length} produto(s)</p>
        </header>

        {data.products.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Nenhum produto nesta categoria ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </StoreShell>
  );
}
