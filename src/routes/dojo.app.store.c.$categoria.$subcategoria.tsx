import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListCategories, dsListProducts } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/dojo/app/store/c/$categoria/$subcategoria")({ component: ProductListPage });

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ProductListPage() {
  const { categoria, subcategoria } = Route.useParams();
  const nav = useNavigate();
  const catsFn = useServerFn(dsListCategories);
  const listFn = useServerFn(dsListProducts);

  const { data: cats } = useQuery({ queryKey: ["dojo-store", "cats"], queryFn: () => catsFn() });
  const list: Cat[] = cats ?? [];
  const parent = list.find((c) => c.slug === categoria);
  const sub = subcategoria === "todos" ? parent : list.find((c) => c.slug === subcategoria && c.parent_id === parent?.id);
  const activeSlug = sub?.slug ?? parent?.slug;

  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "list", activeSlug],
    queryFn: () => listFn({ data: { categorySlug: activeSlug, sort: "name", limit: 100 } }),
    enabled: !!activeSlug,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <button
        onClick={() => nav({ to: "/dojo/app/store/c/$categoria", params: { categoria } })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Subcategorias de {parent?.name ?? categoria}
      </button>

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {parent?.name}{sub && sub !== parent ? ` · ${sub.name}` : ""}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um produto para ver imagens, tamanhos e opções.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando produtos…</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado nesta subcategoria.
        </Card>
      ) : (
        <Card className="divide-y">
          {items.map((p) => (
            <Link
              key={p.id}
              to="/dojo/app/store/produtos/$slug"
              params={{ slug: p.slug }}
              className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-medium">{p.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {p.category_name && <span>{p.category_name}</span>}
                  {p.compare_at_price && p.compare_at_price > p.price && (
                    <span className="line-through">{brl(Number(p.compare_at_price))}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="text-base font-bold">{brl(Number(p.price))}</div>
                  <div className="text-[10px] text-muted-foreground">unidade</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
