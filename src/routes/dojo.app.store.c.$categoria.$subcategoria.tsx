import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  dsListCategories,
  dsListProducts,
  dsGetProduct,
  dsAddToCart,
} from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
    queryKey: ["dojo-store", "list", activeSlug],
    queryFn: () =>
      listFn({ data: { categorySlug: activeSlug, sort: "name", limit: 100 } }),
    enabled: !!activeSlug,
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return items;
    const tokens = q.split(/\s+/).filter(Boolean);
    return items.filter((p) => {
      const hay = normalize(`${p.name} ${p.category_name ?? ""}`);
      return tokens.every((t) => hay.includes(t));
    });
  }, [items, search]);

  return (
    <div className="space-y-6">
      <button
        onClick={() =>
          nav({ to: "/dojo/app/store/c/$categoria", params: { categoria } })
        }
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Subcategorias de{" "}
        {parent?.name ?? categoria}
      </button>

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {parent?.name}
          {sub && sub !== parent ? ` · ${sub.name}` : ""}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um produto para escolher tamanhos e quantidades.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome do produto..."
          className="pl-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando produtos…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {search
            ? `Nenhum produto encontrado para "${search}".`
            : "Nenhum produto encontrado nesta subcategoria."}
        </Card>
      ) : (
        <Card className="divide-y">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenSlug(p.slug)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-medium">{p.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {p.category_name && <span>{p.category_name}</span>}
                  {p.compare_at_price && p.compare_at_price > p.price && (
                    <span className="line-through">
                      {brl(Number(p.compare_at_price))}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="text-base font-bold">
                    {brl(Number(p.price))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    unidade
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </Card>
      )}

      <ProductQuickAdd
        slug={openSlug}
        onClose={() => setOpenSlug(null)}
      />
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
  // reset ao trocar produto
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
    const raw = String(
      v.size ?? v.option_label ?? v.color ?? "Único",
    ).replace(/^tamanho:\s*/i, "").trim();
    return raw || "Único";
  };

  return (
    <Dialog open={!!slug} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{data?.product.name ?? "Produto"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Carregando produto…
          </div>
        ) : (
          <div>
            <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr] md:p-6">
              <div className="aspect-square overflow-hidden rounded-lg bg-muted">
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
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {data.product.category_name}
                  </div>
                  <h2 className="mt-1 text-xl font-bold leading-tight">
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
                  <span className="text-2xl font-bold text-primary">
                    {brl(data.product.price)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    por unidade
                  </span>
                </div>
                {data.product.short_description && (
                  <p className="text-sm text-muted-foreground">
                    {data.product.short_description}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t px-4 py-4 md:px-6">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          q > 0 ? "border-primary/60 bg-primary/5" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1 truncate font-medium">
                          {labelOf(v)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLine(v.id, q - 1)}
                          disabled={q === 0}
                          className="grid h-7 w-7 place-items-center rounded border hover:bg-accent disabled:opacity-40"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={q}
                          onChange={(e) =>
                            setLine(v.id, Number(e.target.value) || 0)
                          }
                          className="h-7 w-12 rounded border bg-background text-center text-xs outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setLine(v.id, q + 1)}
                          className="grid h-7 w-7 place-items-center rounded border hover:bg-accent"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3.5 w-3.5" />
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
                    className="grid h-9 w-9 place-items-center rounded-md border hover:bg-accent disabled:opacity-40"
                    disabled={(qty[NONE] ?? 0) === 0}
                    aria-label="Diminuir"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={qty[NONE] ?? 0}
                    onChange={(e) =>
                      setLine(NONE, Number(e.target.value) || 0)
                    }
                    className="h-9 w-20 rounded-md border bg-background text-center text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setLine(NONE, (qty[NONE] ?? 0) + 1)}
                    className="grid h-9 w-9 place-items-center rounded-md border hover:bg-accent"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-6">
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">
                  {totalQty} un. selecionada{totalQty !== 1 ? "s" : ""}
                </div>
                <div className="text-lg font-bold text-primary">
                  {brl(totalPrice)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button
                  onClick={() => add.mutate()}
                  disabled={totalQty === 0 || add.isPending}
                  className="gap-1.5"
                >
                  {add.isPending ? (
                    "Adicionando…"
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" /> Adicionar
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
                    className="hidden gap-1.5 sm:inline-flex"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Ir ao carrinho
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
