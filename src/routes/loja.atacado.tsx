import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import {
  listStoreCategories,
  listWholesaleCatalog,
  createWholesaleOrder,
} from "@/lib/store/store.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { ProductImage } from "@/components/store/ProductImage";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Upload, X, CheckCircle2, AlertCircle, Package, Search, ChevronDown, ChevronUp, ZoomIn, ShoppingBag, ArrowRight } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const catalogQuery = queryOptions({
  queryKey: ["store", "wholesale-catalog"],
  queryFn: () => listWholesaleCatalog(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

export const Route = createFileRoute("/loja/atacado")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Atacado — AMT Fight Wear | 25% OFF a partir de 10 unidades" },
      { name: "description", content: "Compre no atacado com 25% de desconto e etiqueta personalizada grátis. Mínimo 10 unidades por subcategoria." },
      { property: "og:title", content: "Atacado AMT Fight Wear" },
      { property: "og:description", content: "25% OFF em pedidos de atacado com etiqueta personalizada grátis." },
    ],
  }),
  component: WholesalePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

type Cat = { id: string; slug: string; name: string; parent_id: string | null };
type Prod = {
  id: string;
  name: string;
  slug: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  category_id: string | null;
  short_description: string | null;
};
type Variant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  option_label: string | null;
  sku: string | null;
  price: number | string | null;
  sort_order: number;
  active: boolean;
};

const WHOLESALE_DISCOUNT = 0.25;
const MIN_PER_SUBCAT = 10;
const NO_VARIANT = "__none__";
const keyOf = (pid: string, vid: string | null) => `${pid}::${vid ?? NO_VARIANT}`;

function WholesalePage() {
  const { data: catalog } = useSuspenseQuery(catalogQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const navigate = useNavigate();
  const createOrder = useServerFn(createWholesaleOrder);

  const categories = catalog.categories as Cat[];
  const products = catalog.products as Prod[];
  const variants = (catalog.variants ?? []) as Variant[];

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, Variant[]>();
    for (const v of variants) {
      const arr = m.get(v.product_id) ?? [];
      arr.push(v);
      m.set(v.product_id, arr);
    }
    return m;
  }, [variants]);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Resolve the root (top-level) ancestor for any category id
  const rootOf = useMemo(() => {
    const m = new Map<string, Cat>();
    const resolve = (id: string): Cat | null => {
      const seen = new Set<string>();
      let cur = catById.get(id) ?? null;
      while (cur && cur.parent_id && !seen.has(cur.id)) {
        seen.add(cur.id);
        const parent = catById.get(cur.parent_id);
        if (!parent) break;
        cur = parent;
      }
      return cur;
    };
    for (const c of categories) {
      const r = resolve(c.id);
      if (r) m.set(c.id, r);
    }
    return m;
  }, [categories, catById]);

  // Group products by leaf subcategory (their direct category_id)
  const grouped = useMemo(() => {
    const m = new Map<string, { cat: Cat | null; items: Prod[] }>();
    for (const p of products) {
      const key = p.category_id ?? "__none__";
      const g = m.get(key) ?? { cat: p.category_id ? catById.get(p.category_id) ?? null : null, items: [] };
      g.items.push(p);
      m.set(key, g);
    }
    return Array.from(m.entries()).sort((a, b) => {
      const an = a[1].cat?.name ?? "zz";
      const bn = b[1].cat?.name ?? "zz";
      return an.localeCompare(bn);
    });
  }, [products, catById]);

  // Group subcategories by their root (top-level) category
  const rootGroups = useMemo(() => {
    const m = new Map<string, { root: Cat | null; subs: typeof grouped; totalProducts: number }>();
    for (const [key, g] of grouped) {
      const rid = g.cat ? (rootOf.get(g.cat.id)?.id ?? g.cat.id) : "__none__";
      const cur = m.get(rid) ?? {
        root: g.cat ? rootOf.get(g.cat.id) ?? g.cat : null,
        subs: [] as typeof grouped,
        totalProducts: 0,
      };
      cur.subs.push([key, g]);
      cur.totalProducts += g.items.length;
      m.set(rid, cur);
    }
    return Array.from(m.entries()).sort((a, b) => {
      const an = a[1].root?.name ?? "zz";
      const bn = b[1].root?.name ?? "zz";
      return an.localeCompare(bn);
    });
  }, [grouped, rootOf]);

  // qty keyed by `${productId}::${variantId|__none__}`
  const [qty, setQty] = useState<Record<string, number>>({});
  const setLineQty = (pid: string, vid: string | null, q: number) =>
    setQty((s) => ({ ...s, [keyOf(pid, vid)]: Math.max(0, q) }));
  const productTotal = (pid: string) => {
    const vs = variantsByProduct.get(pid);
    if (!vs || vs.length === 0) return qty[keyOf(pid, null)] ?? 0;
    return vs.reduce((a, v) => a + (qty[keyOf(pid, v.id)] ?? 0), 0);
  };


  // Visualization controls
  const [search, setSearch] = useState("");
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [zoomImg, setZoomImg] = useState<{ src: string; alt: string } | null>(null);
  const toggleCollapse = (key: string) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));


  // Totals per subcategory (aggregating variant-level quantities)
  const catTotals = useMemo(() => {
    const m = new Map<string, { qty: number; original: number; discounted: number }>();
    for (const p of products) {
      const vs = variantsByProduct.get(p.id);
      const lines = vs && vs.length > 0
        ? vs.map((v) => ({ q: qty[keyOf(p.id, v.id)] ?? 0, unit: Number(v.price ?? p.price) }))
        : [{ q: qty[keyOf(p.id, null)] ?? 0, unit: Number(p.price) }];
      for (const { q, unit } of lines) {
        if (q <= 0) continue;
        const key = p.category_id ?? "__none__";
        const original = unit * q;
        const discounted = original * (1 - WHOLESALE_DISCOUNT);
        const cur = m.get(key) ?? { qty: 0, original: 0, discounted: 0 };
        cur.qty += q;
        cur.original += original;
        cur.discounted += discounted;
        m.set(key, cur);
      }
    }
    return m;
  }, [qty, products, variantsByProduct]);


  const selectedCats = [...catTotals.entries()];
  const totalQty = selectedCats.reduce((a, [, v]) => a + v.qty, 0);
  const subtotalOriginal = selectedCats.reduce((a, [, v]) => a + v.original, 0);
  const subtotal = selectedCats.reduce((a, [, v]) => a + v.discounted, 0);
  const savings = subtotalOriginal - subtotal;
  const invalidCats = selectedCats.filter(([, v]) => v.qty < MIN_PER_SUBCAT);
  const canProceed = selectedCats.length > 0 && invalidCats.length === 0;

  const [labelLogo, setLabelLogo] = useState<{ data_url: string; filename: string } | null>(null);
  const onUploadLogo = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 4 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLabelLogo({ data_url: reader.result as string, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [sheetOpen, setSheetOpen] = useState(false);
  const prevTotalQtyRef = useRef(0);
  useEffect(() => {
    if (totalQty > prevTotalQtyRef.current) {
      setSheetOpen(true);
    }
    prevTotalQtyRef.current = totalQty;
  }, [totalQty]);
  // Force-open when jumping to checkout step so the user sees the form summary.
  useEffect(() => {
    if (step === "checkout") setSheetOpen(false);
  }, [step]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_document: "",
    zip: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleZip = async (zip: string) => {
    setForm((f) => ({ ...f, zip }));
    const clean = zip.replace(/\D/g, "");
    if (clean.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const d = await r.json();
        if (!d.erro) {
          setForm((f) => ({
            ...f,
            street: d.logradouro ?? f.street,
            neighborhood: d.bairro ?? f.neighborhood,
            city: d.localidade ?? f.city,
            state: d.uf ?? f.state,
          }));
        }
      } catch { /* ignore */ }
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return toast.error("Regra de atacado não atendida");
    setLoading(true);
    try {
      const items = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([k, quantity]) => {
          const [product_id, vidRaw] = k.split("::");
          return { product_id, variant_id: vidRaw === NO_VARIANT ? null : vidRaw, quantity };
        });
      const res = await createOrder({
        data: {
          customer_email: form.customer_email,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone || null,
          customer_document: form.customer_document || null,
          shipping_address: {
            zip: form.zip,
            street: form.street,
            number: form.number,
            complement: form.complement || null,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          },
          items,
          label_logo: labelLogo,
          notes: form.notes || null,
        },
      });
      toast.success("Pedido de atacado criado!");
      navigate({ to: "/loja/pedido/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StoreShell categories={cats}>
      {/* Hero */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Atacado AMT</div>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">
            25% OFF em pedidos de atacado
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-background/80 sm:text-base">
            Compre no mínimo <strong>10 unidades por subcategoria</strong> e receba desconto de
            <strong> 25% em todos os produtos</strong>. Etiqueta personalizada <strong>grátis</strong>.
            Prazo padrão de produção: <strong>10 dias úteis</strong>.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-background/20 bg-background/5 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Regra</div>
              <div className="mt-1 text-sm">Mínimo 10 por subcategoria</div>
            </div>
            <div className="rounded-lg border border-background/20 bg-background/5 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Desconto</div>
              <div className="mt-1 text-sm">25% OFF no valor total</div>
            </div>
            <div className="rounded-lg border border-background/20 bg-background/5 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">Bônus</div>
              <div className="mt-1 text-sm">Etiqueta personalizada grátis</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <ShoppingBag className="h-4 w-4" /> Ver pedido
            {totalQty > 0 && (
              <span className="ml-1 grid h-6 min-w-[24px] place-items-center rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary">
                {totalQty}
              </span>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-6">

        {/* Left - catalog / checkout */}
        <div>
          {step === "cart" ? (
            <div className="space-y-6">
              {activeRoot === null ? (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-black">Escolha uma categoria</h2>
                    <p className="text-sm text-muted-foreground">Selecione a categoria para ver os produtos e subcategorias disponíveis.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rootGroups.map(([rid, rg]) => {
                      const rootQty = rg.subs.reduce((a, [k]) => a + (catTotals.get(k)?.qty ?? 0), 0);
                      return (
                        <button
                          key={rid}
                          type="button"
                          onClick={() => { setActiveRoot(rid); setActiveCatFilter(null); }}
                          className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
                        >
                          <span>
                            <span className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</span>
                            <span className="block text-base font-black">{rg.root?.name ?? "Sem categoria"}</span>
                            <span className="block text-xs text-muted-foreground">
                              {rg.subs.length} subcategoria{rg.subs.length === 1 ? "" : "s"} · {rg.totalProducts} produtos
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            {rootQty > 0 && (
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{rootQty} un.</span>
                            )}
                            <ChevronDown className="h-5 w-5 -rotate-90 text-muted-foreground transition group-hover:text-primary" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {rootGroups.length === 0 && (
                    <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                      Nenhum produto disponível no momento.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    const rg = rootGroups.find(([rid]) => rid === activeRoot)?.[1];
                    if (!rg) return null;
                    return (
                      <>
                        {/* Header: back + search + subcategory chips */}
                        <div className="sticky top-[calc(var(--header-h,140px))] z-10 space-y-2 rounded-xl border bg-card/95 p-2 backdrop-blur">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setActiveRoot(null); setActiveCatFilter(null); }}
                              className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-accent"
                            >
                              ← Categorias
                            </button>
                            <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3">
                              <Search className="h-4 w-4 text-muted-foreground" />
                              <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Buscar em ${rg.root?.name ?? "categoria"}...`}
                                className="w-full bg-transparent px-1 py-2 text-sm outline-none"
                              />
                              {search && (
                                <button type="button" onClick={() => setSearch("")} className="rounded p-1 hover:bg-accent" aria-label="Limpar">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <select
                            value={activeCatFilter ?? ""}
                            onChange={(e) => setActiveCatFilter(e.target.value || null)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                          >
                            <option value="">Todas as subcategorias ({rg.subs.length})</option>
                            {rg.subs.map(([key, g]) => {
                              const qty = catTotals.get(key)?.qty ?? 0;
                              return (
                                <option key={key} value={key}>
                                  {g.cat?.name ?? "Sem categoria"}{qty > 0 ? ` · ${qty} un.` : ""}
                                </option>
                              );
                            })}
                          </select>

                        </div>

                        {rg.subs
                          .filter(([key]) => activeCatFilter === null || activeCatFilter === key)
                          .map(([key, g]) => {
                            const totals = catTotals.get(key);
                            const groupQty = totals?.qty ?? 0;
                            const ok = groupQty >= MIN_PER_SUBCAT;
                            const q = search.trim().toLowerCase();
                            const items = q ? g.items.filter((p) => p.name.toLowerCase().includes(q)) : g.items;
                            if (items.length === 0) return null;
                            const isCollapsed = collapsed[key];
                            return (

                    <section key={key} id={`cat-${key}`} className="rounded-xl border bg-card">
                      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(key)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-md border">
                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </span>
                          <span>
                            <span className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Subcategoria</span>
                            <span className="block text-lg font-black">{g.cat?.name ?? "Sem categoria"}</span>
                            <span className="block text-xs text-muted-foreground">{items.length} produtos</span>
                          </span>
                        </button>
                        <div
                          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold ${
                            groupQty === 0
                              ? "bg-muted text-muted-foreground"
                              : ok
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {groupQty === 0 ? (
                            <>Mínimo {MIN_PER_SUBCAT} unidades</>
                          ) : ok ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> {groupQty} un. · OK
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" /> {groupQty}/{MIN_PER_SUBCAT} un.
                            </>
                          )}
                        </div>
                      </header>
                      {!isCollapsed && (
                        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 xl:grid-cols-4">
                          {items.map((p) => {
                            const vs = variantsByProduct.get(p.id) ?? [];
                            const hasVariants = vs.length > 0;
                            const totalForProduct = productTotal(p.id);
                            const basePrice = Number(p.price);
                            const selected = totalForProduct > 0;
                            return (
                              <div
                                key={p.id}
                                className={`group flex flex-col overflow-hidden rounded-lg border bg-background transition ${
                                  selected ? "border-primary ring-1 ring-primary/40" : "hover:border-primary/40 hover:shadow-md"
                                }`}
                              >
                                <div className="relative">
                                  <ProductImage src={p.image_url} alt={p.name} aspect="square" />
                                  {p.image_url && (
                                    <button
                                      type="button"
                                      onClick={() => setZoomImg({ src: p.image_url!, alt: p.name })}
                                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 opacity-0 shadow-sm transition group-hover:opacity-100"
                                      aria-label="Ampliar imagem"
                                    >
                                      <ZoomIn className="h-4 w-4" />
                                    </button>
                                  )}
                                  {selected && (
                                    <div className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                                      {totalForProduct} un.
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-1 flex-col gap-2 p-3">
                                  <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">{p.name}</div>
                                  <div className="flex flex-wrap items-baseline gap-2 text-xs">
                                    <span className="text-muted-foreground line-through">{formatBRL(basePrice)}</span>
                                    <span className="text-sm font-bold text-primary">{formatBRL(basePrice * (1 - WHOLESALE_DISCOUNT))}</span>
                                  </div>

                                  {hasVariants ? (() => {
                                    // Show one row per already-selected size + a single empty row to add another.
                                    const selectedIds = vs.filter((v) => (qty[keyOf(p.id, v.id)] ?? 0) > 0).map((v) => v.id);
                                    const availableIds = vs.filter((v) => (qty[keyOf(p.id, v.id)] ?? 0) === 0).map((v) => v.id);
                                    const rows: (string | null)[] = [...selectedIds];
                                    if (availableIds.length > 0) rows.push(null); // trailing "add" row
                                    const labelOf = (v: Variant) => {
                                      const raw = (v.size ?? v.option_label ?? v.color ?? "Único").replace(/^tamanho:\s*/i, "").trim();
                                      const m = raw.match(/^([A-Za-z0-9/]+)\s*[-–—]\s*(.+)$/);
                                      const code = (m?.[1] ?? raw).toUpperCase();
                                      const detail = m?.[2] ?? "";
                                      return { code, detail, full: detail ? `${code} · ${detail}` : code };
                                    };
                                    return (
                                      <div className="mt-1 space-y-1.5">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                          Tamanhos ({vs.length} disponíveis)
                                        </div>
                                        <div className="space-y-1">
                                          {rows.map((vid, idx) => {
                                            const v = vid ? vs.find((vv) => vv.id === vid) : null;
                                            const vq = v ? qty[keyOf(p.id, v.id)] ?? 0 : 0;
                                            return (
                                              <div
                                                key={vid ?? `add-${idx}`}
                                                className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-xs ${vq > 0 ? "border-primary/50 bg-primary/5" : "border-dashed"}`}
                                              >
                                                <select
                                                  value={vid ?? ""}
                                                  onChange={(e) => {
                                                    const newId = e.target.value || null;
                                                    if (newId === vid) return;
                                                    // Move current qty (if any) to the new variant; keep at least 1 for a fresh pick.
                                                    if (v) setLineQty(p.id, v.id, 0);
                                                    if (newId) setLineQty(p.id, newId, vq > 0 ? vq : 1);
                                                  }}
                                                  className="min-w-0 flex-1 rounded border bg-background px-2 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                                                >
                                                  <option value="">Tamanho</option>

                                                  {vs.map((opt) => {
                                                    const { full } = labelOf(opt);
                                                    const taken = (qty[keyOf(p.id, opt.id)] ?? 0) > 0 && opt.id !== vid;
                                                    return (
                                                      <option key={opt.id} value={opt.id} disabled={taken}>
                                                        {full}{taken ? " (já adicionado)" : ""}
                                                      </option>
                                                    );
                                                  })}
                                                </select>
                                                <button
                                                  type="button"
                                                  onClick={() => v && setLineQty(p.id, v.id, vq - 1)}
                                                  className="grid h-6 w-6 shrink-0 place-items-center rounded border hover:bg-accent disabled:opacity-40"
                                                  disabled={!v || vq === 0}
                                                  aria-label="Diminuir"
                                                >
                                                  <Minus className="h-3 w-3" />
                                                </button>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={vq}
                                                  disabled={!v}
                                                  onChange={(e) => v && setLineQty(p.id, v.id, Number(e.target.value) || 0)}
                                                  className="h-6 w-10 shrink-0 rounded border bg-background text-center text-xs outline-none focus:border-primary disabled:opacity-50"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => v && setLineQty(p.id, v.id, vq + 1)}
                                                  className="grid h-6 w-6 shrink-0 place-items-center rounded border hover:bg-accent disabled:opacity-40"
                                                  disabled={!v}
                                                  aria-label="Aumentar"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    <div className="mt-auto flex items-center justify-between gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setLineQty(p.id, null, (qty[keyOf(p.id, null)] ?? 0) - 1)}
                                        className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent disabled:opacity-40"
                                        disabled={(qty[keyOf(p.id, null)] ?? 0) === 0}
                                        aria-label="Diminuir"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={qty[keyOf(p.id, null)] ?? 0}
                                        onChange={(e) => setLineQty(p.id, null, Number(e.target.value) || 0)}
                                        className="h-8 min-w-0 flex-1 rounded-md border bg-background text-center text-sm outline-none focus:border-primary"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setLineQty(p.id, null, (qty[keyOf(p.id, null)] ?? 0) + 1)}
                                        className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent"
                                        aria-label="Aumentar"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                  {totalForProduct > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setSheetOpen(true)}
                                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                                    >
                                      <ShoppingBag className="h-3.5 w-3.5" /> Adicionar ao carrinho
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                          })}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Dados do cliente</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input required placeholder="Nome / Razão social" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input required type="email" placeholder="E-mail" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input placeholder="Telefone / WhatsApp" value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input placeholder="CPF / CNPJ" value={form.customer_document} onChange={(e) => setForm((f) => ({ ...f, customer_document: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Endereço de entrega</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <input required placeholder="CEP" value={form.zip} onChange={(e) => handleZip(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required placeholder="Rua" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-3" />
                  <input required placeholder="Nº" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input placeholder="Complemento" value={form.complement} onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required placeholder="Bairro" value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required placeholder="Cidade" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required maxLength={2} placeholder="UF" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} className="rounded-md border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-primary" />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Observações</h2>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Instruções específicas de fabricação, cores, tamanhos, etc."
                  className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStep("cart")} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent">
                  ← Voltar ao pedido
                </button>
                <button type="submit" disabled={loading || !canProceed} className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {loading ? "Enviando..." : `Finalizar pedido · ${formatBRL(subtotal)}`}
                </button>
              </div>
            </form>
          )}
        </div>

        </div>
      </div>

      {/* Slide-right cart drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="flex items-center gap-2 text-base font-black">
              <ShoppingBag className="h-5 w-5" /> Resumo do atacado
              {totalQty > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{totalQty}</span>
              )}
            </h3>
          </div>

          <div className="flex-1 space-y-3 px-5 py-4">
            {/* Label logo */}
            <div className="rounded-lg border border-dashed p-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Etiqueta personalizada · Grátis</div>
              <div className="mt-1 text-xs text-muted-foreground">Envie o logotipo (PNG/JPG, até 4 MB) para aplicarmos na etiqueta.</div>
              {labelLogo ? (
                <div className="mt-2 flex items-center gap-2 rounded-md border bg-background p-2">
                  <img src={labelLogo.data_url} alt="Logo" className="h-10 w-10 rounded object-contain" />
                  <div className="min-w-0 flex-1 truncate text-xs">{labelLogo.filename}</div>
                  <button type="button" onClick={() => setLabelLogo(null)} className="rounded p-1 hover:bg-accent" aria-label="Remover">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" />
                  Enviar logotipo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadLogo(f);
                    }}
                  />
                </label>
              )}
            </div>

            {selectedCats.length === 0 ? (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Selecione produtos para ver o resumo.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {selectedCats.map(([key, v]) => {
                  const cat = key === "__none__" ? null : catById.get(key);
                  const ok = v.qty >= MIN_PER_SUBCAT;
                  return (
                    <div key={key} className={`rounded-md border p-2 text-xs ${ok ? "" : "border-amber-500/40 bg-amber-500/5"}`}>
                      <div className="font-medium">{cat?.name ?? "Sem categoria"}</div>
                      <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                        <span>
                          {v.qty} un. {ok ? "" : `· faltam ${MIN_PER_SUBCAT - v.qty}`}
                        </span>
                        <span className="font-semibold text-foreground">{formatBRL(v.discounted)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Itens</span>
                <span>{totalQty}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sem desconto</span>
                <span className="line-through">{formatBRL(subtotalOriginal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Desconto atacado (25%)</span>
                <span>− {formatBRL(savings)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t pt-2 text-base font-black">
                <span>Total</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
              <Package className="h-4 w-4 text-primary" />
              <span>Prazo padrão de produção: <strong className="text-foreground">10 dias úteis</strong></span>
            </div>

            {!canProceed && selectedCats.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>É necessário ter no mínimo {MIN_PER_SUBCAT} unidades por subcategoria para prosseguir.</span>
              </div>
            )}
          </div>

          <div className="border-t bg-card px-5 py-4">
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => { setStep("checkout"); setSheetOpen(false); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Finalizar compra <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-2 block w-full text-center text-sm text-muted-foreground hover:text-primary"
            >
              Continuar comprando
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {zoomImg && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setZoomImg(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-background text-foreground shadow-lg hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={zoomImg.src}
            alt={zoomImg.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </StoreShell>
  );
}
