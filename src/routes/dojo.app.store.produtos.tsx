import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dsListCategories, dsListProducts, dsAddToCart, dsToggleFavorite } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Search, X, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const search = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  sort: z.enum(["recent", "price_asc", "price_desc", "name"]).optional(),
});

export const Route = createFileRoute("/dojo/app/store/produtos")({
  component: ProductsPage,
  validateSearch: (s) => search.parse(s),
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

function ProductsPage() {
  const params = useSearch({ from: "/dojo/app/store/produtos" });
  const nav = useNavigate({ from: "/dojo/app/store/produtos" });
  const [q, setQ] = useState(params.q ?? "");

  const listCats = useServerFn(dsListCategories);
  const listProds = useServerFn(dsListProducts);
  const addFn = useServerFn(dsAddToCart);
  const favFn = useServerFn(dsToggleFavorite);
  const qc = useQueryClient();

  const { data: cats } = useQuery({ queryKey: ["dojo-store", "cats"], queryFn: () => listCats() });

  const hasFilter = !!(params.q || params.cat);
  const { data: prods, isLoading } = useQuery({
    queryKey: ["dojo-store", "products", params],
    queryFn: () => listProds({ data: { search: params.q, categorySlug: params.cat, sort: params.sort, limit: 48 } }),
    enabled: hasFilter,
  });

  const add = useMutation({
    mutationFn: (payload: { product_id: string; quantity: number }) => addFn({ data: payload }),
    onSuccess: () => { toast.success("Adicionado ao carrinho"); qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });
  const fav = useMutation({
    mutationFn: (product_id: string) => favFn({ data: { product_id } }),
    onSuccess: (r: any) => toast.success(r?.favorited ? "Favoritado" : "Removido dos favoritos"),
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ search: (s: any) => ({ ...s, q: q || undefined }) });
  };
  const clearFilters = () => { setQ(""); nav({ search: {} }); };

  const parents: Cat[] = (cats ?? []).filter((c: Cat) => !c.parent_id);
  const childrenOf = (id: string) => (cats ?? []).filter((c: Cat) => c.parent_id === id);
  const activeCat = (cats ?? []).find((c: Cat) => c.slug === params.cat) as Cat | undefined;
  const activeParent = activeCat?.parent_id
    ? (cats ?? []).find((c: Cat) => c.id === activeCat.parent_id) as Cat | undefined
    : activeCat;

  return (
    <div className="space-y-5">
      {/* Busca principal */}
      <Card className="p-4 md:p-5">
        <form onSubmit={submitSearch} className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="O que você procura? (ex.: kimono, faixa, rashguard…)"
              className="h-11 pl-9 text-base"
              autoFocus
            />
          </div>
          <Button type="submit" size="lg" className="md:w-auto">Buscar</Button>
        </form>
        {hasFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Filtros:</span>
            {params.q && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                "{params.q}"
                <button onClick={() => { setQ(""); nav({ search: (s: any) => ({ ...s, q: undefined }) }); }}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {activeCat && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                {activeCat.name}
                <button onClick={() => nav({ search: (s: any) => ({ ...s, cat: undefined }) })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              Limpar tudo
            </button>
          </div>
        )}
      </Card>

      {!hasFilter ? (
        /* Landing: categorias como pontos de entrada, sem exibir todo o catálogo */
        <div className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground">Ou navegue por categoria</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {parents.map((c) => (
              <button
                key={c.id}
                onClick={() => nav({ search: () => ({ cat: c.slug }) })}
                className="group flex items-center justify-between rounded-lg border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div className="font-medium">{c.name}</div>
                  </div>
                  {childrenOf(c.id).length > 0 && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {childrenOf(c.id).length} subcategorias
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
            {parents.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria disponível.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Subcategorias do contexto ativo */}
          {activeParent && childrenOf(activeParent.id).length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => nav({ search: (s: any) => ({ ...s, cat: activeParent.slug }) })}
                className={`rounded-full border px-3 py-1 text-xs ${params.cat === activeParent.slug ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}
              >
                Todos — {activeParent.name}
              </button>
              {childrenOf(activeParent.id).map((c) => (
                <button
                  key={c.id}
                  onClick={() => nav({ search: (s: any) => ({ ...s, cat: c.slug }) })}
                  className={`rounded-full border px-3 py-1 text-xs ${params.cat === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Ordenação */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {prods?.items.length ? `${prods.items.length} resultado(s)` : ""}
            </div>
            <select
              value={params.sort ?? "recent"}
              onChange={(e) => nav({ search: (s: any) => ({ ...s, sort: e.target.value as any }) })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="name">Nome A-Z</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando produtos…</div>
          ) : !prods?.items.length ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado. Ajuste a busca ou escolha outra categoria.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {prods.items.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onAdd={(qty) => add.mutate({ product_id: p.id, quantity: qty })}
                  onFav={() => fav.mutate(p.id)}
                  pending={add.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({ p, onAdd, onFav, pending }: { p: any; onAdd: (qty: number) => void; onFav: () => void; pending: boolean }) {
  const [qty, setQty] = useState(1);
  return (
    <Card className="group overflow-hidden">
      <Link to="/dojo/app/store/produtos/$slug" params={{ slug: p.slug }} className="block">
        <div className="aspect-square overflow-hidden bg-muted">
          {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : null}
        </div>
      </Link>
      <div className="space-y-1.5 p-3">
        {p.category_name && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.category_name}</div>}
        <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">{p.name}</div>
        <div className="flex items-baseline gap-1.5">
          {p.compare_at_price && p.compare_at_price > p.price && (
            <span className="text-[10px] text-muted-foreground line-through">{brl(p.compare_at_price)}</span>
          )}
          <span className="text-base font-bold">{brl(p.price)}</span>
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <div className="flex items-center rounded-md border">
            <button className="px-2 text-sm" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <div className="w-7 text-center text-xs">{qty}</div>
            <button className="px-2 text-sm" onClick={() => setQty(qty + 1)}>+</button>
          </div>
          <Button size="sm" className="flex-1" onClick={() => onAdd(qty)} disabled={pending}>
            <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Comprar
          </Button>
          <Button size="sm" variant="outline" onClick={onFav}>
            <Heart className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
