import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  dsListCategories,
  dsListProducts,
  dsGetProduct,
  dsAddToCart,
} from "@/lib/dojo/store/store.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  PackageSearch,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductCard, ProductCardSkeleton } from "@/components/dojo/store/ProductCard";
import { FiltersSidebar } from "@/components/dojo/store/FiltersSidebar";
import { EmptyState } from "@/components/dojo/store/EmptyState";

export const Route = createFileRoute("/dojo/app/store/c/$categoria/$subcategoria")({
  component: ProductListPage,
});

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ProductListPage() {
  const { categoria, subcategoria } = Route.useParams();
  const nav = useNavigate();
  const catsFn = useServerFn(dsListCategories);
  const listFn = useServerFn(dsListProducts);

  const [search, setSearch] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<"name" | "price_asc" | "price_desc" | "recent">("name");

  const { data: cats } = useQuery({
    queryKey: ["dojo-store", "cats"],
    queryFn: () => catsFn(),
  });
  const list: Cat[] = cats ?? [];
  const parent = list.find((c) => c.slug === categoria);
  const sub =
    subcategoria === "todos"
      ? parent
      : list.find((c) => c.slug === subcategoria && c.parent_id === parent?.id);
  const activeSlug = sub?.slug ?? parent?.slug;

  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "list", activeSlug, sort],
    queryFn: () =>
      listFn({ data: { categorySlug: activeSlug, sort, limit: 100 } }),
    enabled: !!activeSlug,
  });

  const items = data?.items ?? [];

  const prices = items.map((p: any) => Number(p.price));
  const minPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 0;
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const effectiveRange: [number, number] = priceRange ?? [minPrice, maxPrice];

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    const [lo, hi] = effectiveRange;
    return items.filter((p: any) => {
      const price = Number(p.price);
      if (price < lo || price > hi) return false;
      if (!q) return true;
      const tokens = q.split(/\s+/).filter(Boolean);
      const hay = normalize(`${p.name} ${p.category_name ?? ""}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [items, search, effectiveRange]);

  const resetFilters = () => {
    setSearch("");
    setPriceRange(null);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <button
          onClick={() =>
            nav({ to: "/dojo/app/store/c/$categoria", params: { categoria } })
          }
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Subcategorias de{" "}
          {parent?.name ?? categoria}
        </button>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {parent?.name}
              {sub && sub !== parent ? ` · ${sub.name}` : sub === parent ? " · Todos" : ""}
            </div>
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Produtos
            </h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "produto" : "produtos"} disponíveis
            </p>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground sm:col-span-1">
            <span className="hidden font-semibold uppercase tracking-[0.14em] sm:inline">Ordenar</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="h-10 w-full min-w-0 rounded-full border border-[color:var(--dojo-border)] bg-white px-3 text-xs text-foreground outline-none focus:border-foreground/40 focus:ring-2 focus:ring-primary/20 sm:w-auto"
            >
              <option value="name">Nome (A–Z)</option>
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <FiltersSidebar
          search={search}
          onSearchChange={setSearch}
          min={minPrice}
          max={maxPrice}
          priceRange={effectiveRange}
          onPriceChange={setPriceRange}
          onReset={resetFilters}
        />

        <div className="min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={search ? "Nenhum resultado" : "Sem produtos"}
              description={
                search
                  ? `Não encontramos nada para "${search}". Ajuste os filtros ou limpe a busca.`
                  : "Essa subcategoria ainda não tem produtos publicados."
              }
              action={
                (search || priceRange) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
                  >
                    Limpar filtros
                  </button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p: any) => (
                <ProductCard key={p.id} product={p} onClick={() => setOpenSlug(p.slug)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductQuickAdd slug={openSlug} onClose={() => setOpenSlug(null)} />
    </div>
  );
}

// ============ Modal com seletor múltiplo de tamanho/quantidade ============
function ProductQuickAdd({
  slug,
  onClose,
}: {
  slug: string | null;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetProduct);
  const addFn = useServerFn(dsAddToCart);

  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "product", slug],
    queryFn: () => getFn({ data: { slug: slug! } }),
    enabled: !!slug,
  });

  // qty por variant.id (ou "__none__" quando sem variantes)
  const [qty, setQty] = useState<Record<string, number>>({});
  const productId = data?.product.id;
  const [lastId, setLastId] = useState<string | null>(null);
  if (productId && productId !== lastId) {
    setLastId(productId);
    setQty({});
  }

  const setLine = (key: string, v: number) =>
    setQty((s) => ({ ...s, [key]: Math.max(0, Math.min(999, v)) }));

  const variants = data?.variants ?? [];
  const hasVariants = variants.length > 0;
  const NONE = "__none__";

  const totalQty = Object.values(qty).reduce((a, b) => a + (b || 0), 0);
  const totalPrice = totalQty * Number(data?.product.price ?? 0);

  const add = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const lines = hasVariants
        ? Object.entries(qty)
            .filter(([, q]) => q > 0)
            .map(([variant_id, quantity]) => ({
              product_id: data.product.id,
              variant_id,
              quantity,
            }))
        : (qty[NONE] ?? 0) > 0
          ? [
              {
                product_id: data.product.id,
                variant_id: null,
                quantity: qty[NONE],
              },
            ]
          : [];
      if (lines.length === 0) throw new Error("Selecione ao menos uma quantidade.");
      for (const line of lines) {
        await addFn({ data: line });
      }
      return lines.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });
      toast.success(
        `${totalQty} un. adicionada${totalQty > 1 ? "s" : ""} ao carrinho${
          n && n > 1 ? ` (${n} tamanhos)` : ""
        }.`,
      );
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao adicionar"),
  });

  const labelOf = (v: any) => {
    const raw = String(v.size ?? v.option_label ?? v.color ?? "Único")
      .replace(/^tamanho:\s*/i, "")
      .trim();
    return raw || "Único";
  };

  return (
    <Dialog open={!!slug} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-3xl p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{data?.product.name ?? "Produto"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            Carregando produto...
          </div>
        ) : (
          <div className="flex max-h-[92vh] flex-col">
            <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr] md:p-6">
              <div className="aspect-square overflow-hidden rounded-2xl bg-[color:var(--dojo-surface-3)]">
                {data.product.image_url ? (
                  <img
                    src={data.product.image_url}
                    alt={data.product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {data.product.category_name}
                  </div>
                  <h2 className="mt-1 text-xl font-bold leading-tight tracking-tight text-foreground">
                    {data.product.name}
                  </h2>
                </div>
                <div className="flex items-baseline gap-2">
                  {data.product.compare_at_price &&
                    data.product.compare_at_price > data.product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        {brl(data.product.compare_at_price)}
                      </span>
                    )}
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {brl(data.product.price)}
                  </span>
                  <span className="text-xs text-muted-foreground">por unidade</span>
                </div>
                {data.product.short_description && (
                  <p className="text-sm text-muted-foreground">
                    {data.product.short_description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border-t border-[color:var(--dojo-border)] px-5 py-5 md:px-6">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {hasVariants
                  ? `Tamanhos (${variants.length} disponíveis)`
                  : "Quantidade"}
              </div>

              {hasVariants ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {variants.map((v: any) => {
                    const q = qty[v.id] ?? 0;
                    return (
                      <div
                        key={v.id}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          q > 0
                            ? "border-foreground/40 bg-foreground/[0.03]"
                            : "border-[color:var(--dojo-border)]"
                        }`}
                      >
                        <div className="min-w-0 flex-1 truncate font-medium">
                          {labelOf(v)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLine(v.id, q - 1)}
                          disabled={q === 0}
                          className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--dojo-border)] transition hover:bg-black/[0.05] disabled:opacity-40"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={q}
                          onChange={(e) => setLine(v.id, Number(e.target.value) || 0)}
                          className="h-8 w-12 rounded-md border border-[color:var(--dojo-border)] bg-white text-center text-xs outline-none focus:border-foreground/40"
                        />
                        <button
                          type="button"
                          onClick={() => setLine(v.id, q + 1)}
                          className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--dojo-border)] transition hover:bg-black/[0.05]"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLine(NONE, (qty[NONE] ?? 0) - 1)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--dojo-border)] transition hover:bg-black/[0.05] disabled:opacity-40"
                    disabled={(qty[NONE] ?? 0) === 0}
                    aria-label="Diminuir"
                  >
                    <Minus className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={qty[NONE] ?? 0}
                    onChange={(e) => setLine(NONE, Number(e.target.value) || 0)}
                    className="h-10 w-20 rounded-md border border-[color:var(--dojo-border)] bg-white text-center text-sm outline-none focus:border-foreground/40"
                  />
                  <button
                    type="button"
                    onClick={() => setLine(NONE, (qty[NONE] ?? 0) + 1)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--dojo-border)] transition hover:bg-black/[0.05]"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[color:var(--dojo-border)] bg-white/95 px-5 py-4 backdrop-blur md:px-6">
              <div className="text-sm">
                <div className="text-[11px] text-muted-foreground">
                  {totalQty} un. selecionada{totalQty !== 1 ? "s" : ""}
                </div>
                <div className="text-lg font-bold tracking-tight text-foreground">
                  {brl(totalPrice)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} className="rounded-full">
                  Fechar
                </Button>
                <Button
                  onClick={() => add.mutate()}
                  disabled={totalQty === 0 || add.isPending}
                  className="gap-1.5 rounded-full bg-foreground text-background hover:opacity-90"
                >
                  {add.isPending ? (
                    "Adicionando..."
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" strokeWidth={1.75} /> Adicionar
                    </>
                  )}
                </Button>
                {totalQty > 0 && !add.isPending && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await add.mutateAsync();
                      nav({ to: "/dojo/app/store/carrinho" });
                    }}
                    className="hidden gap-1.5 rounded-full sm:inline-flex"
                  >
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> Ir ao carrinho
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
