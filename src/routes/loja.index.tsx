import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { listStorefrontHome, listStoreCategories } from "@/lib/store/store.functions";
import { Link } from "@tanstack/react-router";

const homeQuery = queryOptions({
  queryKey: ["store", "home"],
  queryFn: () => listStorefrontHome(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

export const Route = createFileRoute("/loja/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homeQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "AMT Fight Wear — Loja Oficial | Kimonos, Rashguards e Faixas" },
      { name: "description", content: "Loja oficial AMT Fight Wear. Kimonos de BJJ, rashguards, faixas, shorts e acessórios para artes marciais. Frete para todo Brasil e 10x sem juros." },
      { property: "og:title", content: "AMT Fight Wear — Loja Oficial" },
      { property: "og:description", content: "Kimonos, rashguards, faixas e acessórios para atletas de artes marciais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreHomePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function StoreHomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  return (
    <StoreShell categories={categories}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">AMT Fight Wear</div>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              Vestido para <span className="text-primary">vencer</span> no tatame.
            </h1>
            <p className="mt-4 max-w-lg text-base text-background/80">
              Kimonos, rashguards, faixas e acessórios desenvolvidos para atletas exigentes. Produtos de alta performance com garantia AMT.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/loja/categoria/$slug" params={{ slug: categories[0]?.slug ?? "kimonos" }} className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">
                Ver coleção
              </Link>
              <a href="#destaques" className="rounded-md border border-background/30 px-6 py-3 font-semibold text-background hover:bg-background/10">
                Destaques
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-black">Categorias</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.slice(0, 12).map((c) => (
              <Link
                key={c.slug}
                to="/loja/categoria/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col items-center gap-2 rounded-lg border bg-card p-4 hover:border-primary"
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {c.image_url && <img src={c.image_url} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />}
                </div>
                <div className="text-center text-sm font-semibold">{c.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Destaques */}
      {data.featured.length > 0 && (
        <section id="destaques" className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-black">Destaques AMT</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Novidades */}
      {data.newest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-black">Novidades</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.newest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {data.featured.length === 0 && data.newest.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <p className="text-lg text-muted-foreground">Catálogo vazio. Vá em <span className="font-semibold">Loja Virtual → Importar catálogo</span> no admin para popular os produtos.</p>
        </div>
      )}
    </StoreShell>
  );
}
