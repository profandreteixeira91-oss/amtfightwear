import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dsListCategories, dsListProducts, dsAddToCart, dsToggleFavorite } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Search } from "lucide-react";
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
  const { data: prods, isLoading } = useQuery({
    queryKey: ["dojo-store", "products", params],
    queryFn: () => listProds({ data: { search: params.q, categorySlug: params.cat, sort: params.sort, limit: 48 } }),
  });

  const add = useMutation({
    mutationFn: (product_id: string) => addFn({ data: { product_id, quantity: 1 } }),
    onSuccess: () => { toast.success("Adicionado ao carrinho"); qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });
  const fav = useMutation({
    mutationFn: (product_id: string) => favFn({ data: { product_id } }),
    onSuccess: (r: any) => toast.success(r?.favorited ? "Favoritado" : "Removido dos favoritos"),
  });

  const submitSearch = (e: React.FormEvent) => { e.preventDefault(); nav({ search: (s: any) => ({ ...s, q: q || undefined }) }); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <form onSubmit={submitSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produtos…" className="pl-9" />
        </form>
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

      <CategoryNav
        categories={cats ?? []}
        selected={params.cat}
        onSelect={(slug) => nav({ search: (s: any) => ({ ...s, cat: slug }) })}
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando produtos…</div>
      ) : !prods?.items.length ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {prods.items.map((p) => (
            <Card key={p.id} className="group overflow-hidden">
              <Link to="/dojo/app/store/produtos/$slug" params={{ slug: p.slug }} className="block">
                <div className="aspect-square overflow-hidden bg-muted">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : null}
                </div>
              </Link>
              <div className="p-3 space-y-1.5">
                <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">{p.name}</div>
                <div className="flex items-baseline gap-1.5">
                  {p.compare_at_price && p.compare_at_price > p.price && (
                    <span className="text-[10px] text-muted-foreground line-through">{brl(p.compare_at_price)}</span>
                  )}
                  <span className="text-base font-bold">{brl(p.price)}</span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" className="flex-1" onClick={() => add.mutate(p.id)} disabled={add.isPending}>
                    <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Comprar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fav.mutate(p.id)}>
                    <Heart className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

function CategoryNav({
  categories,
  selected,
  onSelect,
}: {
  categories: Cat[];
  selected: string | undefined;
  onSelect: (slug: string | undefined) => void;
}) {
  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const selectedCat = categories.find((c) => c.slug === selected);
  const activeParentId =
    selectedCat?.parent_id ?? (selectedCat && !selectedCat.parent_id ? selectedCat.id : null);
  const activeChildren = activeParentId ? childrenOf(activeParentId) : [];

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelect(undefined)}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${!selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}
        >
          Todas
        </button>
        {parents.map((c) => {
          const isActive =
            selected === c.slug ||
            (selectedCat?.parent_id && selectedCat.parent_id === c.id);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.slug)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${isActive ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      {activeChildren.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 pl-2">
          {activeChildren.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.slug)}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] ${selected === c.slug ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:text-foreground"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
