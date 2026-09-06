import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListCategories, dsListProducts } from "@/lib/dojo/store/store.functions";
import { HeroCarousel } from "@/components/dojo/store/HeroCarousel";
import { CategoryCard } from "@/components/dojo/store/CategoryCard";
import { ProductCard, ProductCardSkeleton } from "@/components/dojo/store/ProductCard";
import { EmptyState } from "@/components/dojo/store/EmptyState";
import { ArrowRight, PackageOpen } from "lucide-react";

export const Route = createFileRoute("/dojo/app/store/")({ component: StoreHome });

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

export function StoreHome() {
  const listCats = useServerFn(dsListCategories);
  const listProducts = useServerFn(dsListProducts);

  const { data: cats, isLoading: catsLoading } = useQuery({
    queryKey: ["dojo-store", "cats"],
    queryFn: () => listCats(),
    staleTime: 60_000,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ["dojo-store", "products", "recent"],
    queryFn: () => listProducts({ data: { sort: "recent", limit: 8 } }),
    staleTime: 30_000,
  });

  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ["dojo-store", "products", "featured"],
    queryFn: () => listProducts({ data: { featured: true, limit: 8 } }),
    staleTime: 30_000,
  });

  const parents: Cat[] = ((cats ?? []) as Cat[]).filter((c) => !c.parent_id);
  const countBy = new Map<string, number>();
  for (const c of (cats ?? []) as Cat[]) {
    if (c.parent_id) countBy.set(c.parent_id, (countBy.get(c.parent_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-14">
      <HeroCarousel />

      {/* Categorias */}
      <section className="space-y-6" aria-labelledby="cats-title">
        <header className="flex flex-col gap-1 px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Coleção
          </div>
          <h2 id="cats-title" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Compre por categoria
          </h2>
        </header>

        {catsLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-3xl bg-[color:var(--dojo-surface-3)]"
              />
            ))}
          </div>
        ) : parents.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Nenhuma categoria disponível"
            description="Volte em instantes — nosso catálogo está sendo preparado."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {parents.map((c) => (
              <CategoryCard key={c.id} slug={c.slug} name={c.name} count={countBy.get(c.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Recentes */}
      <ProductRow
        eyebrow="Chegou agora"
        title="Novidades da AMT Store"
        seeAllTo="/dojo/app/store/c/$categoria"
        seeAllParams={parents[0] ? { categoria: parents[0].slug } : undefined}
        items={recent?.items ?? []}
        loading={recentLoading}
      />

      {/* Destaques */}
      <ProductRow
        eyebrow="Selecionados"
        title="Produtos em destaque"
        items={featured?.items ?? []}
        loading={featuredLoading}
        fallbackMessage="Sem destaques por enquanto — confira as novidades acima."
      />
    </div>
  );
}

function ProductRow({
  eyebrow,
  title,
  items,
  loading,
  seeAllTo,
  seeAllParams,
  fallbackMessage,
}: {
  eyebrow: string;
  title: string;
  items: any[];
  loading?: boolean;
  seeAllTo?: string;
  seeAllParams?: Record<string, string>;
  fallbackMessage?: string;
}) {
  const showFallback = !loading && items.length === 0;

  return (
    <section className="space-y-5">
      <header className="flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </div>
          <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
            {title}
          </h2>
        </div>
        {seeAllTo && seeAllParams && (
          <Link
            to={seeAllTo as any}
            params={seeAllParams as any}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground hover:opacity-70 sm:text-sm"
          >
            Ver tudo <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : showFallback ? (
        fallbackMessage ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--dojo-border)] p-8 text-center text-sm text-muted-foreground">
            {fallbackMessage}
          </div>
        ) : null
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, 8).map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
