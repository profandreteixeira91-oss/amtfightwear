import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  adminListStoreProducts,
  adminUpdateStoreProduct,
  adminGetStoreProduct,
  adminGetStoreProductVariants,
  adminSaveVariants,
  adminCreateStoreProduct,
  adminDeleteStoreProduct,
  adminListStoreCategories,
  adminUpsertStoreCategory,
  adminDeleteStoreCategory,
  adminApplyCategoryFiscalToProducts,
  adminAdjustProductPrices,
} from "@/lib/store/store.functions";
import { useServerFn } from "@tanstack/react-start";
import { getFiscalSuggestion } from "@/lib/fiscal/automation.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/store/cart-store";
import {
  AlertCircle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  ImageOff,
  Info,
  LayoutGrid,
  MoreHorizontal,
  Package,
  PackageX,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  Settings2,
  BarChart3,
  Trash2,
  X,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { StatCard } from "@/components/common/StatCard";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { stockAfterGeneralEdit } from "@/lib/store/variant-availability";
import { parseDecimal } from "@/lib/store/product-costs";
import {
  COSTS_QUERY_KEY,
  categoryOptions,
  categoryWithDescendants,
  type CategoryNode,
} from "@/components/admin/costs/cost-shared";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  head: () => ({
    meta: [
      { title: "Catálogo de produtos — Administração AMT Fight Wear" },
      {
        name: "description",
        content: "Administração do catálogo, preços e estoque por tamanho da AMT Fight Wear.",
      },
      { property: "og:title", content: "Catálogo de produtos — AMT Fight Wear" },
      {
        property: "og:description",
        content: "Gestão de produtos e disponibilidade por tamanho da loja AMT Fight Wear.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProductsPage,
});

const PAGE_SIZE = 25;
const LOW_STOCK = 5;
const PRODUCT_STALE_TIME = 1000 * 60 * 15;
const PRODUCT_GC_TIME = 1000 * 60 * 30;
const PRODUCTS_KEY = ["admin", "store", "products"];
const ALL = "__all__";
const NO_CATEGORY = "__none__";

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost: number | null;
  stock: number;
  status: string;
  featured: boolean | null;
  category_id: string | null;
  image_url: string | null;
  updated_at: string;
  wholesale_enabled: boolean | null;
  wholesale_discount_percent: number | null;
};

type EditState = Record<string, { price?: string; stock?: string }>;
type StatusFilter = "all" | "active" | "inactive" | "low" | "out" | "noimage" | "nocost";
type SortKey = "recent" | "name" | "price_desc" | "price_asc" | "stock_asc";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
  { value: "low", label: "Estoque baixo" },
  { value: "out", label: "Sem estoque" },
  { value: "noimage", label: "Sem imagem" },
  { value: "nocost", label: "Sem custo" },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Atualizados recentemente" },
  { value: "name", label: "Nome (A–Z)" },
  { value: "price_desc", label: "Maior preço" },
  { value: "price_asc", label: "Menor preço" },
  { value: "stock_asc", label: "Menor estoque" },
];

const matchesStatus = (p: ProductRow, f: StatusFilter) => {
  switch (f) {
    case "active":
      return p.status === "active";
    case "inactive":
      return p.status !== "active";
    case "low":
      return p.stock > 0 && p.stock < LOW_STOCK;
    case "out":
      return p.stock <= 0;
    case "noimage":
      return !p.image_url;
    case "nocost":
      return !(Number(p.cost) > 0);
    default:
      return true;
  }
};

const fmtMarkup = (v: number) => `${v.toFixed(1).replace(".", ",")}x`;

/** Valida uma edição em linha. Devolve o patch ou a mensagem de erro. */
function editToPatch(e: {
  price?: string;
  stock?: string;
}): { patch: Record<string, number> } | { error: string } {
  const patch: Record<string, number> = {};
  if (e.price !== undefined && e.price.trim() !== "") {
    const n = parseDecimal(e.price);
    if (n === null || n < 0) return { error: "preço inválido" };
    patch.price = n;
  }
  if (e.stock !== undefined && e.stock.trim() !== "") {
    const n = Number(e.stock);
    if (!Number.isInteger(n) || n < 0) return { error: "estoque inválido" };
    patch.stock = n;
  }
  return { patch };
}

function AdminProductsPage() {
  const [confirm, confirmDialog] = useConfirm();
  const list = useServerFn(adminListStoreProducts);
  const update = useServerFn(adminUpdateStoreProduct);
  const adjustPrices = useServerFn(adminAdjustProductPrices);
  const deleteProduct = useServerFn(adminDeleteStoreProduct);
  const listCatsTop = useServerFn(adminListStoreCategories);
  const queryClient = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () => list({}) as Promise<ProductRow[]>,
  });
  const { data: catsAll } = useQuery({
    queryKey: ["admin", "store", "categories"],
    queryFn: () => listCatsTop({}),
  });
  const products = useMemo(() => (data ?? []) as ProductRow[], [data]);
  const categories = useMemo(() => (catsAll ?? []) as CategoryNode[], [catsAll]);
  const catOptions = useMemo(() => categoryOptions(categories), [categories]);
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Invalida caches do storefront público e da tela de custos para que alterações
  // (preço, estoque, status, destaque, atacado, exclusão) reflitam na hora.
  const refresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["store"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "store", "product"] });
    queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
  };

  // Pré-carrega detalhes + variações ao passar o mouse no editar: o diálogo abre já com cache.
  const getProductPrefetch = useServerFn(adminGetStoreProduct);
  const getVariantsPrefetch = useServerFn(adminGetStoreProductVariants);
  const prefetchProduct = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "store", "product", id],
      queryFn: () => getProductPrefetch({ data: { id } }),
      staleTime: PRODUCT_STALE_TIME,
      gcTime: PRODUCT_GC_TIME,
    });
    queryClient.prefetchQuery({
      queryKey: ["admin", "store", "product", id, "variants"],
      queryFn: () => getVariantsPrefetch({ data: { id } }),
      staleTime: PRODUCT_STALE_TIME,
      gcTime: PRODUCT_GC_TIME,
    });
  };

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<EditState>({});
  const [saving, setSaving] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkPricePct, setBulkPricePct] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);

  const allowedCategoryIds = useMemo(() => {
    if (categoryFilter === ALL || categoryFilter === NO_CATEGORY) return null;
    return categoryWithDescendants(categories, categoryFilter);
  }, [categoryFilter, categories]);

  const filtered = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const rows = products.filter((p) => {
      if (categoryFilter === NO_CATEGORY && p.category_id && catName.has(p.category_id))
        return false;
      if (allowedCategoryIds && !(p.category_id && allowedCategoryIds.has(p.category_id)))
        return false;
      if (!matchesStatus(p, statusFilter)) return false;
      if (tokens.length === 0) return true;
      const hay = `${p.name} ${p.slug ?? ""} ${p.sku ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    const sorted = [...rows];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (sort === "price_desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "price_asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "stock_asc") sorted.sort((a, b) => a.stock - b.stock);
    return sorted;
  }, [products, search, categoryFilter, allowedCategoryIds, statusFilter, sort, catName]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    return {
      total: products.length,
      active,
      low: products.filter((p) => matchesStatus(p, "low")).length,
      out: products.filter((p) => matchesStatus(p, "out")).length,
      noImage: products.filter((p) => !p.image_url).length,
      noCost: products.filter((p) => matchesStatus(p, "nocost")).length,
    };
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const filtersActive = search.trim() !== "" || categoryFilter !== ALL || statusFilter !== "all";

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setSearch("");
    setCategoryFilter(ALL);
    setStatusFilter("all");
    resetPage();
  };

  const setEdit = (id: string, field: "price" | "stock", value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };
  const discardEdit = (id: string) =>
    setEdits((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });

  const toggleRow = (id: string, v: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  };
  const toggleAllPage = (v: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const p of pageRows) {
        if (v) n.add(p.id);
        else n.delete(p.id);
      }
      return n;
    });
  };
  const allPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id));

  /** Atualiza na tela antes da resposta (interruptores); volta se o servidor recusar. */
  const patchOptimistic = async (id: string, patch: Partial<ProductRow>, okMessage: string) => {
    queryClient.setQueryData<ProductRow[]>(PRODUCTS_KEY, (old) =>
      old?.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
    try {
      await update({ data: { id, patch } });
      toast.success(okMessage);
      queryClient.invalidateQueries({ queryKey: ["store"] });
      queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      refetch();
    }
  };

  const ownPricedNote = (n: number) =>
    n > 0
      ? ` · ${n} ${n === 1 ? "variação com preço próprio mantida" : "variações com preço próprio mantidas"}`
      : "";

  const isDirty = (p: ProductRow) => {
    const e = edits[p.id];
    if (!e) return false;
    const priceChanged = e.price !== undefined && parseDecimal(e.price) !== Number(p.price);
    const stockChanged = e.stock !== undefined && e.stock !== String(p.stock);
    return priceChanged || stockChanged;
  };
  const dirtyIds = products.filter(isDirty).map((p) => p.id);

  const saveRow = async (id: string) => {
    const e = edits[id];
    if (!e) return;
    const res = editToPatch(e);
    if ("error" in res) return toast.error(`Não salvo: ${res.error}`);
    if (Object.keys(res.patch).length === 0) return discardEdit(id);
    try {
      setSaving(true);
      const out = await update({ data: { id, patch: res.patch } });
      discardEdit(id);
      toast.success(`Produto atualizado na loja${ownPricedNote(out.ownPricedVariants ?? 0)}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const saveAllDirty = async () => {
    // Valida tudo antes: nada é descartado em silêncio.
    const patches: { id: string; patch: Record<string, number> }[] = [];
    for (const id of dirtyIds) {
      const res = editToPatch(edits[id]);
      if ("error" in res) {
        const name = products.find((p) => p.id === id)?.name ?? "produto";
        return toast.error(`"${name}": ${res.error}. Corrija antes de salvar.`);
      }
      patches.push({ id, patch: res.patch });
    }
    setSaving(true);
    let ok = 0;
    let own = 0;
    const failed: string[] = [];
    for (const { id, patch } of patches) {
      try {
        const out = await update({ data: { id, patch } });
        own += out.ownPricedVariants ?? 0;
        ok++;
        discardEdit(id);
      } catch {
        failed.push(products.find((p) => p.id === id)?.name ?? id);
      }
    }
    setSaving(false);
    if (failed.length) toast.error(`Falhou: ${failed.join(", ")}`);
    if (ok)
      toast.success(
        `${ok} ${ok === 1 ? "produto atualizado" : "produtos atualizados"}${ownPricedNote(own)}`,
      );
    refresh();
  };

  const runBulk = async (label: string, fn: (p: ProductRow) => Promise<unknown>) => {
    const rows = products.filter((p) => selected.has(p.id));
    setSaving(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const p of rows) {
        try {
          await fn(p);
          ok++;
        } catch {
          fail++;
        }
      }
    } finally {
      setSaving(false);
    }
    if (ok) toast.success(`${label}: ${ok} ${ok === 1 ? "produto" : "produtos"}`);
    if (fail) toast.error(`${fail} ${fail === 1 ? "falhou" : "falharam"}`);
    setSelected(new Set());
    refresh();
  };

  const applyBulk = async () => {
    if (selected.size === 0) return toast.error("Selecione produtos");
    const priceAbs = bulkPrice.trim() ? parseDecimal(bulkPrice) : null;
    const pricePct = bulkPricePct.trim() ? parseDecimal(bulkPricePct) : null;
    const stockAbs = bulkStock.trim() ? Number(bulkStock) : null;
    if (bulkPrice.trim() && (priceAbs === null || priceAbs < 0))
      return toast.error("Preço inválido");
    if (bulkPricePct.trim() && (pricePct === null || pricePct <= -90 || pricePct > 500))
      return toast.error("Reajuste inválido (entre -90% e 500%)");
    if (stockAbs !== null && (!Number.isInteger(stockAbs) || stockAbs < 0))
      return toast.error("Estoque inválido");
    if (priceAbs !== null && pricePct !== null)
      return toast.error("Use preço novo ou reajuste, não os dois");
    if (priceAbs === null && pricePct === null && stockAbs === null)
      return toast.error("Informe um valor");

    const n = selected.size;
    const parts = [
      priceAbs !== null ? `preço ${formatBRL(priceAbs)}` : null,
      pricePct !== null
        ? `reajuste de ${pricePct > 0 ? "+" : ""}${String(pricePct).replace(".", ",")}%`
        : null,
      stockAbs !== null ? `estoque ${stockAbs} em todas as variações` : null,
    ].filter(Boolean);
    const ok = await confirm({
      title: `Alterar ${n} ${n === 1 ? "produto" : "produtos"}?`,
      description: `${parts.join(" e ")}. ${
        pricePct !== null
          ? "O reajuste vale também para os preços próprios por tamanho."
          : priceAbs !== null
            ? "Variações com preço próprio por tamanho não mudam."
            : ""
      }`,
      confirmLabel: "Aplicar",
    });
    if (!ok) return;

    setSaving(true);
    try {
      if (pricePct !== null) {
        const res = await adjustPrices({ data: { ids: [...selected], percent: pricePct } });
        if (res.failed.length) toast.error(`${res.failed.length} reajuste(s) falharam`);
      }
      if (priceAbs !== null || stockAbs !== null) {
        const patch: Record<string, number> = {};
        if (priceAbs !== null) patch.price = priceAbs;
        if (stockAbs !== null) patch.stock = stockAbs;
        for (const id of selected) await update({ data: { id, patch } });
      }
      toast.success(`${n} ${n === 1 ? "produto atualizado" : "produtos atualizados"} na loja`);
      setBulkPrice("");
      setBulkStock("");
      setBulkPricePct("");
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aplicar");
    } finally {
      setSaving(false);
      refresh();
    }
  };

  const bulkDelete = async () => {
    const n = selected.size;
    if (
      !(await confirm({
        title: `Excluir ${n} ${n === 1 ? "produto" : "produtos"}?`,
        description:
          "Some da loja e do painel. Esta ação não pode ser desfeita. Para só esconder, use Desativar.",
        confirmLabel: "Excluir",
        destructive: true,
      }))
    )
      return;
    await runBulk("Excluídos", (p) => deleteProduct({ data: { id: p.id } }));
  };

  const deleteOne = async (p: ProductRow) => {
    if (
      !(await confirm({
        title: `Excluir "${p.name}"?`,
        description:
          "Some da loja e do painel. Esta ação não pode ser desfeita. Para só esconder, desligue Ativo.",
        confirmLabel: "Excluir",
        destructive: true,
      }))
    )
      return;
    try {
      setSaving(true);
      await deleteProduct({ data: { id: p.id } });
      toast.success("Produto excluído");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setSaving(false);
    }
  };

  const saveWholesaleDiscount = (p: ProductRow, raw: string) => {
    const next = raw.trim() === "" ? null : parseDecimal(raw);
    if (raw.trim() !== "" && (next === null || next < 0 || next > 90))
      return toast.error("Desconto de atacado: 0 a 90%");
    if ((next ?? null) === (p.wholesale_discount_percent ?? null)) return;
    void patchOptimistic(p.id, { wholesale_discount_percent: next }, "Desconto de atacado salvo");
  };

  /* ───────── blocos de uma linha (tabela e cartão usam os mesmos) ───────── */

  const thumb = (p: ProductRow, size = "h-11 w-11") =>
    p.image_url ? (
      <img
        src={p.image_url}
        alt=""
        loading="lazy"
        className={cn(size, "shrink-0 rounded-lg border border-neutral-200 object-cover")}
      />
    ) : (
      <div
        className={cn(
          size,
          "grid shrink-0 place-items-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50",
        )}
        title="Sem imagem"
      >
        <ImageOff className="h-4 w-4 text-neutral-400" />
      </div>
    );

  const meta = (p: ProductRow) =>
    [p.category_id ? catName.get(p.category_id) : "Sem categoria", p.sku]
      .filter(Boolean)
      .join(" · ");

  const priceInput = (p: ProductRow) => {
    const e = edits[p.id];
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          R$
        </span>
        <Input
          inputMode="decimal"
          aria-label={`Preço de ${p.name}`}
          value={e?.price ?? Number(p.price).toFixed(2).replace(".", ",")}
          onChange={(ev) => setEdit(p.id, "price", ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && saveRow(p.id)}
          className="h-9 pl-8 tabular-nums"
        />
      </div>
    );
  };

  const costLine = (p: ProductRow) => {
    const cost = Number(p.cost);
    if (!(cost > 0)) {
      return (
        <Link
          to="/admin/produtos/custos"
          search={{ produto: p.id }}
          className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Sem custo · preencher
        </Link>
      );
    }
    const markup = Number(p.price) / cost;
    return (
      <Link
        to="/admin/produtos/custos"
        search={{ produto: p.id }}
        className={cn(
          "text-[11px] tabular-nums underline-offset-2 hover:underline",
          markup < 1.5 ? "text-amber-700" : "text-muted-foreground",
        )}
        title="Custo de produção e markup (preço ÷ custo)"
      >
        Custo {formatBRL(cost)} · {fmtMarkup(markup)}
      </Link>
    );
  };

  const stockInput = (p: ProductRow) => {
    const val = edits[p.id]?.stock ?? String(p.stock);
    const n = Number(val);
    return (
      <div>
        <Input
          inputMode="numeric"
          aria-label={`Estoque de ${p.name}`}
          value={val}
          onChange={(ev) => setEdit(p.id, "stock", ev.target.value)}
          onKeyDown={(ev) => ev.key === "Enter" && saveRow(p.id)}
          className={cn(
            "h-9 tabular-nums",
            n <= 0 && "border-red-200 text-destructive",
            n > 0 && n < LOW_STOCK && "border-amber-200 text-amber-700",
          )}
        />
        {n <= 0 ? (
          <div className="mt-1 text-[11px] font-medium text-destructive">Sem estoque</div>
        ) : n < LOW_STOCK ? (
          <div className="mt-1 text-[11px] font-medium text-amber-700">Estoque baixo</div>
        ) : null}
      </div>
    );
  };

  const wholesaleControl = (p: ProductRow) => (
    <div className="flex items-center gap-2">
      <Switch
        checked={p.wholesale_enabled ?? false}
        aria-label={`Atacado de ${p.name}`}
        onCheckedChange={(v) =>
          patchOptimistic(
            p.id,
            { wholesale_enabled: v },
            v ? "Atacado ligado" : "Atacado desligado",
          )
        }
      />
      <div className="relative w-[70px]">
        <Input
          key={`${p.id}-${p.wholesale_discount_percent ?? ""}`}
          inputMode="decimal"
          aria-label={`Desconto de atacado de ${p.name}`}
          placeholder="25"
          defaultValue={p.wholesale_discount_percent ?? ""}
          disabled={!p.wholesale_enabled}
          onBlur={(ev) => saveWholesaleDiscount(p, ev.target.value)}
          className="h-8 pr-6 text-xs tabular-nums"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          %
        </span>
      </div>
    </div>
  );

  const rowActions = (p: ProductRow, dirty: boolean) => (
    <div className="flex items-center justify-end gap-1">
      {dirty ? (
        <>
          <Button size="sm" onClick={() => saveRow(p.id)} disabled={saving} className="h-8">
            <Save className="mr-1 h-3.5 w-3.5" /> Salvar
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => discardEdit(p.id)}
            aria-label="Descartar alteração"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : null}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={`Editar ${p.name}`}
        onMouseEnter={() => prefetchProduct(p.id)}
        onFocus={() => prefetchProduct(p.id)}
        onClick={() => {
          prefetchProduct(p.id);
          setEditingId(p.id);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Mais ações de ${p.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {p.slug ? (
            <DropdownMenuItem asChild>
              <a href={`/loja/produto/${p.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Ver na loja
              </a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link to="/admin/produtos/custos" search={{ produto: p.id }}>
              <Calculator className="mr-2 h-4 w-4" /> Custos e preço ideal
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => deleteOne(p)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <PageShell
      title="Produtos"
      description={`${stats.total} ${stats.total === 1 ? "produto" : "produtos"} no catálogo · ${stats.active} ativos na loja`}
      actions={
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setManagingCategories(true)}
            className="flex-1 sm:flex-none"
          >
            <LayoutGrid className="mr-2 h-4 w-4" /> Categorias
          </Button>
          <Button onClick={() => setCreatingProduct(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" /> Novo produto
          </Button>
        </div>
      }
    >
      {confirmDialog}

      {/* Indicadores: clicar filtra a lista */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["low", "Estoque baixo", stats.low, AlertCircle, `Menos de ${LOW_STOCK} unidades`],
            ["out", "Sem estoque", stats.out, PackageX, "Zerados no estoque geral"],
            ["noimage", "Sem imagem", stats.noImage, ImageOff, "Aparecem sem foto na vitrine"],
            [
              "nocost",
              "Sem ficha de custo",
              stats.noCost,
              Calculator,
              "Sem custo, não dá para ver o lucro",
            ],
          ] as const
        ).map(([filter, label, value, icon, hint], i) => (
          <div
            key={filter}
            role="button"
            tabIndex={0}
            onClick={() => {
              setStatusFilter(statusFilter === filter ? "all" : filter);
              resetPage();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setStatusFilter(statusFilter === filter ? "all" : filter);
              resetPage();
            }}
            className={cn(
              "cursor-pointer rounded-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
              statusFilter === filter && "ring-2 ring-foreground",
            )}
            aria-pressed={statusFilter === filter}
          >
            <StatCard
              index={i}
              icon={icon}
              label={label}
              value={isLoading ? "" : String(value)}
              loading={isLoading}
              hint={hint}
            />
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, URL ou SKU"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger className="md:w-52">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {catOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${"— ".repeat(c.depth)}${c.name}`}
                  </SelectItem>
                ))}
                <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="md:w-52" aria-label="Ordenar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatusFilter(f.value);
                resetPage();
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-neutral-200 text-muted-foreground hover:border-neutral-300 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
          {filtersActive ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
            </Button>
          ) : null}
          <div className="ml-auto hidden items-center gap-1 text-xs sm:flex">
            <Link
              to="/admin/produtos/importar"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
            >
              Importar
            </Link>
            <Link
              to="/admin/atacado"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
            >
              Regras de atacado
            </Link>
            <Link
              to="/admin/fiscal"
              search={{ orderId: undefined, type: undefined }}
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-neutral-100 hover:text-foreground"
            >
              Fiscal
            </Link>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={(v) => toggleAllPage(!!v)}
              aria-label="Selecionar a página"
            />
            <span className="text-muted-foreground">
              {filtered.length === 0
                ? "Nenhum produto"
                : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} de ${filtered.length}`}
            </span>
          </label>
          {filtered.length > PAGE_SIZE && selected.size < filtered.length ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelected(new Set(filtered.map((p) => p.id)))}
            >
              Selecionar os {filtered.length}
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-neutral-100">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {filtersActive
                ? "Ajuste a busca ou os filtros."
                : "O catálogo está vazio. Crie ou importe o primeiro produto."}
            </p>
            {filtersActive ? (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <Button size="sm" className="mt-4" onClick={() => setCreatingProduct(true)}>
                <Plus className="mr-1 h-4 w-4" /> Novo produto
              </Button>
            )}
          </div>
        ) : (
          <TooltipProvider>
            {/* Tabela (tablet e desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-left text-xs text-muted-foreground">
                    <th className="w-10 px-4 py-2" />
                    <th className="px-2 py-2 font-medium">Produto</th>
                    <th className="w-[170px] px-2 py-2 font-medium">Preço</th>
                    <th className="w-[110px] px-2 py-2 font-medium">Estoque</th>
                    <th className="w-[70px] px-2 py-2 text-center font-medium">Ativo</th>
                    <th className="w-[80px] px-2 py-2 text-center font-medium">Destaque</th>
                    <th className="w-[140px] px-2 py-2 font-medium">Atacado</th>
                    <th className="w-[150px] px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => {
                    const dirty = isDirty(p);
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-neutral-100 align-top transition-colors last:border-0 hover:bg-neutral-50/60",
                          dirty && "bg-amber-50/50 hover:bg-amber-50/70",
                          selected.has(p.id) && "bg-neutral-50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selected.has(p.id)}
                            onCheckedChange={(v) => toggleRow(p.id, !!v)}
                            aria-label={`Selecionar ${p.name}`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex min-w-[220px] items-center gap-3">
                            {thumb(p)}
                            <div className="min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="block max-w-[320px] truncate text-left font-medium hover:underline"
                                    onMouseEnter={() => prefetchProduct(p.id)}
                                    onClick={() => setEditingId(p.id)}
                                  >
                                    {p.name}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {p.name}
                                </TooltipContent>
                              </Tooltip>
                              <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                <span className="truncate">{meta(p)}</span>
                                {p.status !== "active" ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 shrink-0 px-1.5 text-[10px]"
                                  >
                                    Inativo
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {priceInput(p)}
                          <div className="mt-1">{costLine(p)}</div>
                        </td>
                        <td className="px-2 py-3">{stockInput(p)}</td>
                        <td className="px-2 py-3 text-center">
                          <Switch
                            checked={p.status === "active"}
                            aria-label={`${p.name} ativo na loja`}
                            onCheckedChange={(v) =>
                              patchOptimistic(
                                p.id,
                                { status: v ? "active" : "inactive" },
                                v ? "Produto ativo na loja" : "Produto escondido da loja",
                              )
                            }
                            className="mt-2"
                          />
                        </td>
                        <td className="px-2 py-3 text-center">
                          <Switch
                            checked={p.featured ?? false}
                            aria-label={`${p.name} em destaque`}
                            onCheckedChange={(v) =>
                              patchOptimistic(
                                p.id,
                                { featured: v },
                                v ? "Em destaque" : "Fora dos destaques",
                              )
                            }
                            className="mt-2"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="mt-0.5">{wholesaleControl(p)}</div>
                        </td>
                        <td className="px-4 py-3">{rowActions(p, dirty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cartões (celular) */}
            <ul className="divide-y divide-neutral-100 md:hidden">
              {pageRows.map((p) => {
                const dirty = isDirty(p);
                return (
                  <li key={p.id} className={cn("space-y-3 p-4", dirty && "bg-amber-50/50")}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={selected.has(p.id)}
                        onCheckedChange={(v) => toggleRow(p.id, !!v)}
                        aria-label={`Selecionar ${p.name}`}
                      />
                      {thumb(p, "h-14 w-14")}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="line-clamp-2 text-left font-medium"
                          onClick={() => setEditingId(p.id)}
                        >
                          {p.name}
                        </button>
                        <div className="truncate text-xs text-muted-foreground">{meta(p)}</div>
                        {p.status !== "active" ? (
                          <Badge variant="outline" className="mt-1 h-5 px-1.5 text-[10px]">
                            Inativo
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Preço</Label>
                        {priceInput(p)}
                        <div className="mt-1">{costLine(p)}</div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Estoque</Label>
                        {stockInput(p)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={p.status === "active"}
                          onCheckedChange={(v) =>
                            patchOptimistic(
                              p.id,
                              { status: v ? "active" : "inactive" },
                              v ? "Produto ativo na loja" : "Produto escondido da loja",
                            )
                          }
                        />
                        Ativo
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={p.featured ?? false}
                          onCheckedChange={(v) =>
                            patchOptimistic(
                              p.id,
                              { featured: v },
                              v ? "Em destaque" : "Fora dos destaques",
                            )
                          }
                        />
                        Destaque
                      </label>
                      <div className="flex items-center gap-2">Atacado {wholesaleControl(p)}</div>
                    </div>
                    {rowActions(p, dirty)}
                  </li>
                );
              })}
            </ul>
          </TooltipProvider>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="border-t border-neutral-100 px-4">
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        ) : null}
      </div>

      {/* Barra fixa: ações em massa e alterações pendentes */}
      {selected.size > 0 || dirtyIds.length > 0 ? (
        <div className="sticky bottom-3 z-20 mt-4 space-y-2">
          {selected.size > 0 ? (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-3 text-white shadow-lg">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex items-center justify-between gap-2 lg:w-40 lg:flex-col lg:items-start lg:justify-end">
                  <span className="text-sm font-semibold">
                    {selected.size} {selected.size === 1 ? "selecionado" : "selecionados"}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-white/60 hover:text-white"
                    onClick={() => setSelected(new Set())}
                  >
                    Limpar seleção
                  </button>
                </div>
                <div className="grid flex-1 grid-cols-3 gap-2">
                  <BulkField
                    label="Preço novo"
                    prefix="R$"
                    value={bulkPrice}
                    onChange={setBulkPrice}
                    placeholder="0,00"
                  />
                  <BulkField
                    label="Reajuste"
                    suffix="%"
                    value={bulkPricePct}
                    onChange={setBulkPricePct}
                    placeholder="+10 ou -5"
                  />
                  <BulkField
                    label="Estoque"
                    value={bulkStock}
                    onChange={setBulkStock}
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={applyBulk} disabled={saving}>
                    {saving ? "Aplicando…" : "Aplicar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    disabled={saving}
                    onClick={() =>
                      runBulk("Ativados", (p) =>
                        update({ data: { id: p.id, patch: { status: "active" } } }),
                      )
                    }
                  >
                    Ativar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                    disabled={saving}
                    onClick={() =>
                      runBulk("Desativados", (p) =>
                        update({ data: { id: p.id, patch: { status: "inactive" } } }),
                      )
                    }
                  >
                    Desativar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-300 hover:bg-red-500/20 hover:text-red-200"
                    disabled={saving}
                    onClick={bulkDelete}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {dirtyIds.length > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-lg">
              <span className="text-sm text-amber-900">
                {dirtyIds.length}{" "}
                {dirtyIds.length === 1 ? "alteração não salva" : "alterações não salvas"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEdits({})} disabled={saving}>
                  Descartar
                </Button>
                <Button size="sm" onClick={saveAllDirty} disabled={saving}>
                  <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Salvando…" : "Salvar tudo"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {editingId && (
        <ProductEditDialog
          productId={editingId}
          seed={products.find((p) => p.id === editingId)}
          categories={catOptions}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            refresh();
          }}
        />
      )}

      {creatingProduct && (
        <ProductCreateDialog
          categories={catOptions}
          onClose={() => setCreatingProduct(false)}
          onCreated={(id) => {
            setCreatingProduct(false);
            refresh();
            setEditingId(id);
          }}
        />
      )}

      {managingCategories && (
        <CategoriesDialog
          productCounts={products.reduce<Record<string, number>>((acc, p) => {
            if (p.category_id) acc[p.category_id] = (acc[p.category_id] ?? 0) + 1;
            return acc;
          }, {})}
          onClose={() => {
            setManagingCategories(false);
            queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
          }}
        />
      )}
    </PageShell>
  );
}

function BulkField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="text-[11px] text-white/60">{label}</span>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/50">
            {prefix}
          </span>
        ) : null}
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-md border border-white/15 bg-white/10 px-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none",
            prefix && "pl-8",
            suffix && "pr-6",
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/50">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

type CategoryOption = CategoryNode & { depth: number };

const fieldLabel = "text-xs font-medium text-muted-foreground";

type VariantDraft = {
  id?: string;
  size: string | null;
  color: string | null;
  option_label: string | null;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  weight_grams: number | null;
  sort_order: number;
  active: boolean;
};

function ProductEditDialog({
  productId,
  seed,
  categories,
  onClose,
  onSaved,
}: {
  productId: string;
  seed?: ProductRow;
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const getProduct = useServerFn(adminGetStoreProduct);
  const getVariants = useServerFn(adminGetStoreProductVariants);
  const updateProduct = useServerFn(adminUpdateStoreProduct);
  const saveVariants = useServerFn(adminSaveVariants);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "store", "product", productId],
    queryFn: () => getProduct({ data: { id: productId } }),
    staleTime: PRODUCT_STALE_TIME,
    gcTime: PRODUCT_GC_TIME,
    refetchOnWindowFocus: false,
  });

  // Variações em requisição própria: a aba carrega em paralelo e o salvamento
  // dos campos do produto nunca fica bloqueado por ela.
  const variantsQuery = useQuery({
    queryKey: ["admin", "store", "product", productId, "variants"],
    queryFn: () => getVariants({ data: { id: productId } }),
    staleTime: PRODUCT_STALE_TIME,
    gcTime: PRODUCT_GC_TIME,
    refetchOnWindowFocus: false,
    // Aproveita as variações já vindas no detalhe, se ele resolveu primeiro.
    initialData: data?.variants ? { variants: data.variants } : undefined,
  });

  // Semeia o formulário com o registro já carregado na listagem, para que o
  // diálogo apareça preenchido de imediato enquanto os dados completos chegam.
  const [name, setName] = useState(seed?.name ?? "");
  const [slug, setSlug] = useState(seed?.slug ?? "");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(seed?.price != null ? String(seed.price) : "");
  const [compareAt, setCompareAt] = useState(
    seed?.compare_at_price != null ? String(seed.compare_at_price) : "",
  );
  const [stock, setStock] = useState(seed?.stock != null ? String(seed.stock) : "");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(seed?.category_id ?? "");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [origem, setOrigem] = useState("");
  // A emissão usa cfop_internal (venda no estado) e cfop_interstate (outros estados).
  const [cfopInternal, setCfopInternal] = useState("");
  const [cfopInterstate, setCfopInterstate] = useState("");
  const [unidade, setUnidade] = useState("");
  const [gtin, setGtin] = useState("");

  // Hidrata os campos uma única vez por produto — refetches em segundo plano
  // não podem descartar edições em andamento.
  const hydratedProduct = useRef<string | null>(null);
  const hydratedVariants = useRef<string | null>(null);

  useEffect(() => {
    if (!data?.product) return;
    if (hydratedProduct.current === productId) return;
    hydratedProduct.current = productId;
    const p = data.product;
    setName(p.name ?? "");
    setSlug(p.slug ?? "");
    setShortDesc(p.short_description ?? "");
    setDescription(p.description ?? "");
    setPrice(String(p.price ?? ""));
    setCompareAt(p.compare_at_price != null ? String(p.compare_at_price) : "");
    setStock(String(p.stock ?? 0));
    setCategoryId(p.category_id ?? "");
    setNcm(p.ncm ?? "");
    setCest(p.cest ?? "");
    setOrigem(p.origem ?? "");
    setCfopInternal(p.cfop_internal ?? "");
    setCfopInterstate(p.cfop_interstate ?? "");
    setUnidade((p as { unidade?: string | null }).unidade ?? "");
    setGtin((p as { gtin?: string | null }).gtin ?? "");
  }, [data, productId]);

  useEffect(() => {
    const rows = variantsQuery.data?.variants;
    if (!rows) return;
    if (hydratedVariants.current === productId) return;
    hydratedVariants.current = productId;
    setVariants(
      rows.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        option_label: v.option_label,
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock: v.stock,
        weight_grams: v.weight_grams,
        sort_order: v.sort_order,
        active: v.active,
      })),
    );
    setDeletedIds([]);
  }, [variantsQuery.data, productId]);

  const variantsReady = !!variantsQuery.data?.variants;

  const updateVariant = (i: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: null,
        color: null,
        option_label: null,
        sku: null,
        price: null,
        compare_at_price: null,
        stock: 0,
        weight_grams: null,
        sort_order: prev.length,
        active: true,
      },
    ]);
  };

  const removeVariant = (i: number) => {
    setVariants((prev) => {
      const v = prev[i];
      if (v.id) setDeletedIds((d) => [...d, v.id!]);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const parseNum = (s: string): number | null => parseDecimal(s);

  const handleSave = async () => {
    // Impede salvar com o formulário apenas semeado pela listagem: campos como
    // descrição/GTIN ainda não chegaram e seriam gravados vazios.
    if (!data?.product) return toast.error("Aguarde o carregamento dos dados do produto");
    const priceNum = parseNum(price);
    const stockNum = Number(stock);
    if (priceNum === null || priceNum < 0) return toast.error("Preço inválido");
    if (!Number.isInteger(stockNum) || stockNum < 0) return toast.error("Estoque inválido");
    if (!name.trim()) return toast.error("Nome obrigatório");

    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim(),
        short_description: shortDesc || null,
        description: description || null,
        price: priceNum,
        compare_at_price: parseNum(compareAt),
        category_id: categoryId || null,
        ...(stockNum !== Number(data.product.stock) ? { stock: stockNum } : {}),
        ncm: ncm.trim() || null,
        cest: cest.trim() || null,
        origem: origem.trim() || null,
        cfop_internal: cfopInternal.trim() || null,
        cfop_interstate: cfopInterstate.trim() || null,
        unidade: unidade.trim() || null,
        gtin: gtin.trim() || null,
      };
      await updateProduct({ data: { id: productId, patch } });

      // Só grava variações se elas realmente chegaram do servidor: caso a aba
      // ainda esteja carregando, os campos do produto são salvos sem apagar
      // as variações existentes.
      if (variantsReady) {
        // Variações que acompanhavam o preço antigo do produto seguem o preço novo; as de
        // preço próprio (por tamanho) ficam como estão no formulário.
        const oldPrice = Number(data.product.price);
        const followsProduct = (vp: number | null) =>
          vp !== null && Math.abs(vp - oldPrice) < 0.005;
        const cleanedVariants = variants.map((v, idx) => ({
          id: v.id,
          size: v.size?.trim() || null,
          color: v.color?.trim() || null,
          option_label: v.option_label?.trim() || null,
          sku: v.sku?.trim() || null,
          price: followsProduct(v.price) ? priceNum : v.price,
          compare_at_price: v.compare_at_price,
          stock: stockAfterGeneralEdit(
            v,
            variantsQuery.data?.variants.find((original) => original.id === v.id),
            stockNum,
            Number(data.product.stock),
          ),
          weight_grams: v.weight_grams,
          sort_order: idx,
          active: v.active,
        }));
        await saveVariants({
          data: { product_id: productId, variants: cleanedVariants, deleted_ids: deletedIds },
        });
      }

      toast.success("Produto atualizado e sincronizado com a loja");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col h-[85vh]">
          <DialogHeader className="p-6 pb-2 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Editar Produto</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure detalhes, preços, variações e dados fiscais.
                </p>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b border-border/40 bg-muted/10">
              <TabsList className="h-12 bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="geral"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase"
                >
                  <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Geral
                </TabsTrigger>
                <TabsTrigger
                  value="preco"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-2" /> Preço & Estoque
                </TabsTrigger>
                <TabsTrigger
                  value="variacoes"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase"
                >
                  <Package className="h-3.5 w-3.5 mr-2" /> Variações
                </TabsTrigger>
                <TabsTrigger
                  value="fiscal"
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 text-xs font-semibold tracking-wide uppercase"
                >
                  <Receipt className="h-3.5 w-3.5 mr-2" /> Fiscal
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {(isLoading || !data?.product) && !seed ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                    <p className="text-sm">Carregando dados do produto...</p>
                  </div>
                ) : (
                  <>
                    <TabsContent
                      value="geral"
                      className="mt-0 space-y-6 animate-in fade-in-50 duration-300"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Nome do Produto</Label>
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="bg-muted/30 focus:bg-background border-border/40"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Endereço na loja (slug)</Label>
                            <Input
                              value={slug}
                              onChange={(e) => setSlug(e.target.value)}
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Categoria</Label>
                            <CategorySelect
                              value={categoryId}
                              onChange={setCategoryId}
                              categories={categories}
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Descrição Curta</Label>
                            <Textarea
                              value={shortDesc}
                              onChange={(e) => setShortDesc(e.target.value)}
                              rows={2}
                              placeholder="Resumo para listagens..."
                              className="bg-muted/30 focus:bg-background border-border/40 text-sm resize-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Descrição Detalhada</Label>
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              rows={5}
                              placeholder="Informações técnicas, material, etc..."
                              className="bg-muted/30 focus:bg-background border-border/40 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="preco"
                      className="mt-0 space-y-8 animate-in fade-in-50 duration-300"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className={fieldLabel}>Preço de Venda (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                              R$
                            </span>
                            <Input
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              className="pl-9 bg-muted/30 focus:bg-background border-border/40 font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>Preço Original / "De" (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                              R$
                            </span>
                            <Input
                              value={compareAt}
                              onChange={(e) => setCompareAt(e.target.value)}
                              placeholder="0,00"
                              className="pl-9 bg-muted/30 focus:bg-background border-border/40 font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>Estoque Geral</Label>
                          <Input
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                          <p>
                            Com variações (tamanhos/cores), a loja cobra o preço de cada variação.
                            As que têm o mesmo preço do produto acompanham a mudança daqui; as de
                            preço próprio (ex.: tamanhos maiores mais caros) ficam como estão na aba
                            Variações.
                          </p>
                          <Link
                            to="/admin/produtos/custos"
                            search={{ produto: productId }}
                            className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            <Calculator className="h-3.5 w-3.5" /> Ver custo, lucro e preço ideal
                          </Link>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="variacoes"
                      className="mt-0 space-y-6 animate-in fade-in-50 duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold">Gerenciar Variações</h3>
                          <p className="text-[11px] text-muted-foreground">
                            Tamanhos, cores e SKUs específicos.
                          </p>
                        </div>
                        <Button size="sm" onClick={addVariant} className="shadow-sm">
                          <Plus className="h-3.5 w-3.5 mr-2" /> Nova Variação
                        </Button>
                      </div>

                      {!variantsReady && variantsQuery.isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                          <p className="text-sm">Carregando variações...</p>
                        </div>
                      ) : variantsQuery.error && !variantsReady ? (
                        <div className="py-12 text-center text-sm text-destructive">
                          Erro ao carregar variações: {(variantsQuery.error as Error).message}
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => variantsQuery.refetch()}
                            >
                              Tentar novamente
                            </Button>
                          </div>
                        </div>
                      ) : variants.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-2xl bg-muted/20">
                          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Este produto não possui variações.
                          </p>
                          <Button variant="link" size="sm" onClick={addVariant} className="mt-2">
                            Adicionar a primeira
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {variants.map((v, i) => (
                            <div
                              key={v.id ?? `new-${i}`}
                              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-xl border border-border/40 bg-muted/10 group relative"
                            >
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className={fieldLabel}>Tamanho</Label>
                                <Input
                                  className="h-8 text-xs bg-background"
                                  value={v.size ?? ""}
                                  onChange={(e) => updateVariant(i, { size: e.target.value })}
                                  placeholder="ex: A2"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className={fieldLabel}>Cor</Label>
                                <Input
                                  className="h-8 text-xs bg-background"
                                  value={v.color ?? ""}
                                  onChange={(e) => updateVariant(i, { color: e.target.value })}
                                  placeholder="ex: Branco"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className={fieldLabel}>SKU</Label>
                                <Input
                                  className="h-8 text-[10px] font-mono bg-background uppercase"
                                  value={v.sku ?? ""}
                                  onChange={(e) => updateVariant(i, { sku: e.target.value })}
                                  placeholder="AMT-KIM-A2W"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className={fieldLabel}>Preço (R$)</Label>
                                <Input
                                  className="h-8 text-xs font-mono bg-background"
                                  value={v.price != null ? String(v.price) : ""}
                                  onChange={(e) =>
                                    updateVariant(i, { price: parseNum(e.target.value) })
                                  }
                                  placeholder="Herda"
                                />
                              </div>
                              <div className="md:col-span-2 space-y-1.5">
                                <Label className={fieldLabel}>Estoque</Label>
                                <Input
                                  className="h-8 text-xs font-mono bg-background"
                                  value={String(v.stock)}
                                  onChange={(e) => {
                                    const n = Number(e.target.value);
                                    updateVariant(i, { stock: Number.isFinite(n) ? n : 0 });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2 pb-1">
                                <Label className={fieldLabel}>Ativa</Label>
                                <Switch
                                  checked={v.active}
                                  onCheckedChange={(a) => updateVariant(i, { active: a })}
                                  className="scale-75"
                                />
                              </div>
                              <div className="md:col-span-1 flex items-center justify-end pb-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeVariant(i)}
                                  className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent
                      value="fiscal"
                      className="mt-0 space-y-6 animate-in fade-in-50 duration-300"
                    >
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/40 border border-border/40">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">Parâmetros Fiscais</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Esses dados são essenciais para a emissão correta de NF-e e cálculo de
                            impostos.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className={fieldLabel}>NCM (8 dígitos)</Label>
                          <Input
                            value={ncm}
                            onChange={(e) => setNcm(e.target.value)}
                            placeholder="62171000"
                            className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>CEST (7 dígitos)</Label>
                          <Input
                            value={cest}
                            onChange={(e) => setCest(e.target.value)}
                            placeholder="28.038.00"
                            className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>Origem da Mercadoria</Label>
                          <Input
                            value={origem}
                            onChange={(e) => setOrigem(e.target.value)}
                            placeholder="0 - Nacional"
                            className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>CFOP no estado</Label>
                          <Input
                            value={cfopInternal}
                            onChange={(e) => setCfopInternal(e.target.value)}
                            placeholder="5102"
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>CFOP para outros estados</Label>
                          <Input
                            value={cfopInterstate}
                            onChange={(e) => setCfopInterstate(e.target.value)}
                            placeholder="6102"
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>Unidade Comercial</Label>
                          <Input
                            value={unidade}
                            onChange={(e) => setUnidade(e.target.value)}
                            placeholder="UN"
                            className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className={fieldLabel}>GTIN / EAN-13</Label>
                          <Input
                            value={gtin}
                            onChange={(e) => setGtin(e.target.value)}
                            placeholder="Código de barras"
                            className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t border-border/40 bg-muted/20">
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={saving}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !data?.product}
                    className="min-w-[140px] shadow-lg shadow-primary/20"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo(() => {
    const set = new Set<number>();
    set.add(1);
    set.add(totalPages);
    for (let i = page - 2; i <= page + 2; i++) if (i >= 1 && i <= totalPages) set.add(i);
    return Array.from(set).sort((a, b) => a - b);
  }, [page, totalPages]);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <Button size="icon" variant="ghost" onClick={() => onChange(1)} disabled={page === 1}>
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => onChange(page - 1)} disabled={page === 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const gap = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {gap && <span className="px-1 text-muted-foreground">…</span>}
            <Button
              size="sm"
              variant={p === page ? "default" : "ghost"}
              onClick={() => onChange(p)}
              className="min-w-8 h-8 px-2"
            >
              {p}
            </Button>
          </span>
        );
      })}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onChange(totalPages)}
        disabled={page === totalPages}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function ProductCreateDialog({
  categories,
  onClose,
  onCreated,
}: {
  categories: CategoryOption[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const create = useServerFn(adminCreateStoreProduct);
  const getSuggestion = useServerFn(getFiscalSuggestion);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [shortDesc, setShortDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  type FiscalDraft = Partial<
    Record<
      "ncm" | "cest" | "cfop_internal" | "cfop_interstate" | "unit_commercial" | "unit_taxable",
      string | null
    >
  >;
  const [fiscalData, setFiscalData] = useState<FiscalDraft>({});
  const [saving, setSaving] = useState(false);

  const handleName = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Nome obrigatório");
    const s = slug.trim() || slugify(name);
    const p = parseDecimal(price);
    if (p === null || p < 0) return toast.error("Preço inválido");
    const st = Number(stock);
    if (!Number.isInteger(st) || st < 0) return toast.error("Estoque inválido");
    setSaving(true);
    try {
      const { id } = await create({
        data: {
          name: name.trim(),
          slug: s,
          price: p,
          stock: st,
          category_id: categoryId || null,
          short_description: shortDesc || null,
          image_url: imageUrl || null,
          status: "active",
          featured: false,
          ncm: fiscalData.ncm || null,
          cest: fiscalData.cest || null,
          cfop_internal: fiscalData.cfop_internal || null,
          cfop_interstate: fiscalData.cfop_interstate || null,
          unit_commercial: fiscalData.unit_commercial || "UN",
          unit_taxable: fiscalData.unit_taxable || "UN",
        },
      });
      toast.success("Produto criado com automação fiscal");
      onCreated(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  const onCategoryChange = async (cid: string) => {
    setCategoryId(cid);
    if (!cid) return;
    try {
      const suggestion = await getSuggestion({ data: { category_id: cid } });
      if (suggestion) {
        setFiscalData(suggestion as FiscalDraft);
        toast.info("Sugestão fiscal aplicada para esta categoria", {
          description: `NCM: ${(suggestion as FiscalDraft).ncm ?? "—"} | CFOP: ${(suggestion as FiscalDraft).cfop_internal ?? "—"}`,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar sugestão fiscal", err);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Novo Produto</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adicione um novo item ao seu catálogo.
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className={fieldLabel}>Nome do Produto *</Label>
                <Input
                  value={name}
                  onChange={(e) => handleName(e.target.value)}
                  placeholder="ex: Kimono AMT Pro"
                  className="bg-muted/30 focus:bg-background border-border/40"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className={fieldLabel}>Slug (URL) *</Label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="ex: kimono-amt-pro"
                  className="bg-muted/30 focus:bg-background border-border/40 font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className={fieldLabel}>Preço (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    R$
                  </span>
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="199,90"
                    className="pl-9 bg-muted/30 focus:bg-background border-border/40 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={fieldLabel}>Estoque Inicial</Label>
                <Input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="bg-muted/30 focus:bg-background border-border/40 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={fieldLabel}>Categoria</Label>
              <CategorySelect
                value={categoryId}
                onChange={onCategoryChange}
                categories={categories}
              />
            </div>

            <div className="space-y-2">
              <Label className={fieldLabel}>URL da Imagem</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="bg-muted/30 focus:bg-background border-border/40 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className={fieldLabel}>Breve Descrição</Label>
              <Textarea
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                rows={2}
                placeholder="Resumo do produto..."
                className="bg-muted/30 focus:bg-background border-border/40 text-sm resize-none"
              />
            </div>

            {fiscalData.ncm && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-[10px] uppercase tracking-wider">
                  <Receipt className="h-3.5 w-3.5" /> Automação Fiscal Ativa
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className={fieldLabel}>NCM Sugerido</Label>
                    <Input
                      value={fiscalData.ncm || ""}
                      onChange={(e) => setFiscalData({ ...fiscalData, ncm: e.target.value })}
                      className="h-8 text-xs bg-card/50 border-blue-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={fieldLabel}>CFOP Interno</Label>
                    <Input
                      value={fiscalData.cfop_internal || ""}
                      onChange={(e) =>
                        setFiscalData({ ...fiscalData, cfop_internal: e.target.value })
                      }
                      className="h-8 text-xs bg-card/50 border-blue-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[140px] shadow-lg shadow-primary/20"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Criar Produto
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CatDraft = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  sort_order: number;
  active: boolean;
  ncm: string;
  cest: string;
  origem: string;
  cfop: string;
  unidade: string;
  parent_id: string;
};

function emptyCatDraft(): CatDraft {
  return {
    slug: "",
    name: "",
    description: "",
    image_url: "",
    sort_order: 0,
    active: true,
    ncm: "",
    cest: "",
    origem: "",
    cfop: "",
    unidade: "",
    parent_id: "",
  };
}

function CategoriesDialog({
  onClose,
  productCounts,
}: {
  onClose: () => void;
  productCounts: Record<string, number>;
}) {
  const [confirm, confirmDialog] = useConfirm();
  const listCats = useServerFn(adminListStoreCategories);
  const upsert = useServerFn(adminUpsertStoreCategory);
  const del = useServerFn(adminDeleteStoreCategory);
  const applyFiscal = useServerFn(adminApplyCategoryFiscalToProducts);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "store", "categories"],
    queryFn: () => listCats({}),
  });

  const [draft, setDraft] = useState<CatDraft>(emptyCatDraft());
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const editing = !!draft.id;

  const startEdit = (c: NonNullable<typeof data>[number]) => {
    setDraft({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      sort_order: c.sort_order ?? 0,
      active: c.active,
      ncm: c.ncm ?? "",
      cest: c.cest ?? "",
      origem: c.origem ?? "",
      cfop: c.cfop ?? "",
      unidade: c.unidade ?? "",
      parent_id: c.parent_id ?? "",
    });
  };

  const handleName = (v: string) => {
    setDraft((d) => ({ ...d, name: v, slug: d.id ? d.slug : d.slug || slugify(v) }));
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Nome obrigatório");
    const s = draft.slug.trim() || slugify(draft.name);
    setSaving(true);
    try {
      await upsert({
        data: {
          id: draft.id,
          slug: s,
          name: draft.name.trim(),
          description: draft.description || null,
          image_url: draft.image_url || null,
          sort_order: Number(draft.sort_order) || 0,
          active: draft.active,
          ncm: draft.ncm.trim() || null,
          cest: draft.cest.trim() || null,
          origem: draft.origem.trim() || null,
          cfop: draft.cfop.trim() || null,
          unidade: draft.unidade.trim() || null,
          parent_id: draft.parent_id || null,
        },
      });
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      setDraft(emptyCatDraft());
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const count = productCounts[id] ?? 0;
    if (
      !(await confirm({
        title: "Excluir categoria?",
        description:
          count > 0
            ? `${count} ${count === 1 ? "produto ficará" : "produtos ficarão"} sem categoria.`
            : "Nenhum produto usa esta categoria.",
        confirmLabel: "Excluir",
        destructive: true,
      }))
    )
      return;
    try {
      await del({ data: { id } });
      toast.success("Categoria excluída");
      if (draft.id === id) setDraft(emptyCatDraft());
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  const applyToProducts = async () => {
    if (!draft.id) return;
    if (
      !(await confirm({
        title: "Aplicar dados fiscais em todos os produtos da categoria?",
        description: "Isso sobrescreve NCM, CEST, Origem, CFOP e Unidade nos produtos vinculados.",
        confirmLabel: "Aplicar",
      }))
    )
      return;
    setApplying(true);
    try {
      const res = await applyFiscal({
        data: {
          category_id: draft.id,
          fields: ["ncm", "cest", "origem", "cfop", "unidade"],
        },
      });
      toast.success(`Aplicado em ${res.updated} produto(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="flex flex-col h-[85vh]">
            <DialogHeader className="p-6 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Gestão de Categorias</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Organize seu catálogo e configure dados fiscais padrão.
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {/* Sidebar: Lista de Categorias */}
              <div className="flex max-h-[30vh] flex-col border-b border-border/40 bg-muted/5 md:max-h-none md:w-1/3 md:border-b-0 md:border-r">
                <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between">
                  <span className={fieldLabel}>Categorias</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDraft(emptyCatDraft())}
                    title="Nova Categoria"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {isLoading ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Carregando...
                      </div>
                    ) : (data ?? []).length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">
                        Nenhuma categoria.
                      </div>
                    ) : (
                      categoryOptions((data ?? []) as CategoryNode[]).map((opt) => {
                        const c = (data ?? []).find((x) => x.id === opt.id)!;
                        const count = productCounts[c.id] ?? 0;
                        return (
                          <div
                            key={c.id}
                            className={cn(
                              "group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors",
                              draft.id === c.id
                                ? "bg-foreground text-background"
                                : "hover:bg-muted",
                            )}
                            style={{ paddingLeft: `${opt.depth * 14}px` }}
                          >
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left"
                            >
                              <span
                                className={cn(
                                  "truncate",
                                  opt.depth === 0 && "font-medium",
                                  !c.active && "opacity-60",
                                )}
                              >
                                {c.name}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 text-[11px] tabular-nums",
                                  draft.id === c.id
                                    ? "text-background/70"
                                    : "text-muted-foreground",
                                )}
                              >
                                {count}
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir ${c.name}`}
                              onClick={() => remove(c.id)}
                              className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100",
                                draft.id === c.id
                                  ? "text-background/70 hover:bg-white/10"
                                  : "text-destructive hover:bg-destructive/10",
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Main: Formulário de Edição */}
              <div className="flex-1 flex flex-col bg-background">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                          <Info className="h-4 w-4 text-primary" />
                          Informações Gerais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Nome da Categoria *</Label>
                            <Input
                              value={draft.name}
                              onChange={(e) => handleName(e.target.value)}
                              className="bg-muted/30 focus:bg-background h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Slug (URL)</Label>
                            <Input
                              value={draft.slug}
                              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                              className="bg-muted/30 focus:bg-background h-9 font-mono text-xs"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label className={fieldLabel}>Categoria mãe</Label>
                            <CategorySelect
                              value={draft.parent_id}
                              onChange={(v) => setDraft((d) => ({ ...d, parent_id: v }))}
                              categories={categoryOptions(
                                ((data ?? []) as CategoryNode[]).filter(
                                  (c) =>
                                    !draft.id ||
                                    !categoryWithDescendants(
                                      (data ?? []) as CategoryNode[],
                                      draft.id,
                                    ).has(c.id),
                                ),
                              )}
                              emptyLabel="Nenhuma (categoria principal)"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label className={fieldLabel}>Descrição</Label>
                            <Textarea
                              value={draft.description}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, description: e.target.value }))
                              }
                              rows={2}
                              className="bg-muted/30 focus:bg-background text-sm resize-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>URL da Imagem</Label>
                            <Input
                              value={draft.image_url}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, image_url: e.target.value }))
                              }
                              placeholder="https://..."
                              className="bg-muted/30 focus:bg-background h-9 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className={fieldLabel}>Ordem</Label>
                              <Input
                                type="number"
                                value={String(draft.sort_order)}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    sort_order: Number(e.target.value) || 0,
                                  }))
                                }
                                className="bg-muted/30 focus:bg-background h-9"
                              />
                            </div>
                            <div className="flex flex-col justify-end pb-1.5 space-y-2">
                              <Label className={fieldLabel}>Status</Label>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={draft.active}
                                  onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))}
                                  className="scale-90"
                                />
                                <span className="text-xs font-medium">
                                  {draft.active ? "Ativa" : "Inativa"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/40">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-bold flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-primary" />
                            Dados Fiscais Padrão
                          </h3>
                          {editing && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={applyToProducts}
                                    disabled={applying}
                                    className="h-8 text-[10px] font-bold uppercase tracking-tight"
                                  >
                                    {applying ? "Aplicando..." : "Propagar para Produtos"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>
                                    Aplica NCM, CEST e outros dados desta categoria em todos os
                                    produtos vinculados a ela.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className={fieldLabel}>NCM</Label>
                            <Input
                              value={draft.ncm}
                              onChange={(e) => setDraft((d) => ({ ...d, ncm: e.target.value }))}
                              className="bg-muted/30 h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>CEST</Label>
                            <Input
                              value={draft.cest}
                              onChange={(e) => setDraft((d) => ({ ...d, cest: e.target.value }))}
                              className="bg-muted/30 h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Origem</Label>
                            <Input
                              value={draft.origem}
                              onChange={(e) => setDraft((d) => ({ ...d, origem: e.target.value }))}
                              className="bg-muted/30 h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>CFOP</Label>
                            <Input
                              value={draft.cfop}
                              onChange={(e) => setDraft((d) => ({ ...d, cfop: e.target.value }))}
                              className="bg-muted/30 h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={fieldLabel}>Unidade</Label>
                            <Input
                              value={draft.unidade}
                              onChange={(e) => setDraft((d) => ({ ...d, unidade: e.target.value }))}
                              className="bg-muted/30 h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={onClose} disabled={saving}>
                    Fechar
                  </Button>
                  <Button
                    onClick={save}
                    disabled={saving}
                    className="min-w-[120px] shadow-lg shadow-primary/20"
                  >
                    {saving ? "Salvando..." : editing ? "Atualizar Categoria" : "Criar Categoria"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}

/** Seletor de categoria com a hierarquia (subcategorias recuadas). */
function CategorySelect({
  value,
  onChange,
  categories,
  emptyLabel = "Sem categoria",
}: {
  value: string;
  onChange: (v: string) => void;
  categories: CategoryOption[];
  emptyLabel?: string;
}) {
  return (
    <Select
      value={value || NO_CATEGORY}
      onValueChange={(v) => onChange(v === NO_CATEGORY ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CATEGORY}>{emptyLabel}</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {`${"— ".repeat(c.depth)}${c.name}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
