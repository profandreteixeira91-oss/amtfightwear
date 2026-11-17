import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Layers,
  Package,
  RefreshCw,
  Search,
  Settings2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { brl, pct } from "@/lib/format";
import { fixedExpensePercent, parseDecimal } from "@/lib/store/product-costs";
import { adminGetCostWorkspace } from "@/lib/store/product-costs.functions";
import {
  COSTS_QUERY_KEY,
  HealthPill,
  NO_CATEGORY,
  categoryOptions,
  productHealth,
  productsInCategory,
} from "@/components/admin/costs/cost-shared";
import { ProductCostEditor } from "@/components/admin/costs/ProductCostEditor";
import { CategoryCostEditor } from "@/components/admin/costs/CategoryCostEditor";
import { QuickCostGrid } from "@/components/admin/costs/QuickCostGrid";
import { SettingsSheet } from "@/components/admin/costs/SettingsSheet";

type CostsSearch = { produto?: string; categoria?: string };

export const Route = createFileRoute("/_authenticated/admin/produtos/custos")({
  validateSearch: (s: Record<string, unknown>): CostsSearch => ({
    produto: typeof s.produto === "string" ? s.produto : undefined,
    categoria: typeof s.categoria === "string" ? s.categoria : undefined,
  }),
  component: CostsPage,
  head: () => ({
    meta: [
      { title: "Custos e preço dos produtos | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Ficha de custo de produção por produto ou por categoria, preço ideal, lucro por peça e projeção de faturamento.",
      },
    ],
  }),
});

const LS_REVENUE = "amt.custos.faturamentoMensal";
const LS_INCLUDE_FIXED = "amt.custos.incluirFixas";
const ALL = "__all__";

const lsGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const lsSet = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* sem storage: só não lembra a preferência */
  }
};

type Mode = "produto" | "categoria";

function CostsPage() {
  const search = Route.useSearch();
  const fetchWorkspace = useServerFn(adminGetCostWorkspace);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: COSTS_QUERY_KEY,
    queryFn: () => fetchWorkspace(),
    // Recarregar sozinho apagaria o rascunho em edição.
    refetchOnWindowFocus: false,
  });
  const [confirm, confirmDialog] = useConfirm();

  const [mode, setMode] = useState<Mode>(search.categoria ? "categoria" : "produto");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState(ALL);
  const [filter, setFilter] = useState<"all" | "none" | "attention">("all");
  const [selectedId, setSelectedId] = useState<string | null>(search.produto ?? null);
  const [selectedCat, setSelectedCat] = useState<string | null>(search.categoria ?? null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const dirtyRef = useRef(false);
  const setDirty = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);
  const editorRef = useRef<HTMLDivElement>(null);

  // Rateio das despesas fixas: preferências deste navegador.
  const [revenueOverride, setRevenueOverride] = useState<string>("");
  const [includeFixed, setIncludeFixed] = useState(true);
  useEffect(() => {
    setRevenueOverride(lsGet(LS_REVENUE) ?? "");
    setIncludeFixed(lsGet(LS_INCLUDE_FIXED) !== "0");
  }, []);

  const ws = q.data;
  const months = ws ? ws.sales.window_days / 30 : 3;
  const computedMonthlyRevenue = ws ? ws.sales.revenue / months : 0;
  const monthlyRevenue = parseDecimal(revenueOverride) ?? computedMonthlyRevenue;
  const monthlyFixed = ws ? ws.fixed_expenses.reduce((acc, f) => acc + f.value, 0) : 0;
  const fixedPctRaw = fixedExpensePercent(monthlyFixed, monthlyRevenue);
  const fixedPct = includeFixed && fixedPctRaw !== null ? fixedPctRaw : 0;

  const catOptions = useMemo(() => (ws ? categoryOptions(ws.categories) : []), [ws]);
  const catName = useMemo(() => new Map((ws?.categories ?? []).map((c) => [c.id, c.name])), [ws]);

  const productRows = useMemo(() => {
    if (!ws) return [];
    const t = term.trim().toLowerCase();
    const inCategory =
      category === ALL
        ? null
        : new Set(productsInCategory(ws.products, ws.categories, category).map((p) => p.id));
    return ws.products
      .map((p) => ({ product: p, ...productHealth(p, ws.defaults, fixedPct) }))
      .filter(({ product: p, health }) => {
        if (inCategory && !inCategory.has(p.id)) return false;
        if (filter === "none" && health !== "none") return false;
        if (filter === "attention" && health !== "loss" && health !== "below") return false;
        if (!t) return true;
        return p.name.toLowerCase().includes(t) || (p.sku ?? "").toLowerCase().includes(t);
      });
  }, [ws, term, category, filter, fixedPct]);

  const categoryRows = useMemo(() => {
    if (!ws) return [];
    const rows = [
      ...catOptions.map((c) => ({ id: c.id, name: c.name, depth: c.depth })),
      { id: NO_CATEGORY, name: "Sem categoria", depth: 0 },
    ].map((c) => {
      const prods = productsInCategory(ws.products, ws.categories, c.id);
      const health = prods.map((p) => productHealth(p, ws.defaults, fixedPct));
      return {
        ...c,
        total: prods.length,
        withCost: health.filter((h) => h.health !== "none").length,
        attention: health.filter((h) => h.health === "loss" || h.health === "below").length,
      };
    });
    const t = term.trim().toLowerCase();
    return rows.filter((r) => r.total > 0 && (!t || r.name.toLowerCase().includes(t)));
  }, [ws, catOptions, fixedPct, term]);

  const summary = useMemo(() => {
    if (!ws) return null;
    const withCost = ws.products
      .map((p) => productHealth(p, ws.defaults, fixedPct))
      .filter((h) => h.health !== "none");
    const margins = withCost.map((h) => h.margin ?? 0);
    return {
      withCost: withCost.length,
      total: ws.products.length,
      avgMargin: margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null,
      attention: withCost.filter((h) => h.health === "loss" || h.health === "below").length,
    };
  }, [ws, fixedPct]);

  const selected = ws?.products.find((p) => p.id === selectedId) ?? null;
  const selectedCategoryProducts = useMemo(
    () => (ws && selectedCat ? productsInCategory(ws.products, ws.categories, selectedCat) : []),
    [ws, selectedCat],
  );

  async function guardDirty() {
    if (!dirtyRef.current) return true;
    const ok = await confirm({
      title: "Descartar alterações?",
      description: "A ficha de custo foi alterada e ainda não foi salva.",
      confirmLabel: "Descartar",
      destructive: true,
    });
    if (ok) dirtyRef.current = false;
    return ok;
  }

  const scrollToEditor = () =>
    requestAnimationFrame(() => {
      if (window.innerWidth < 1024)
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  async function selectProduct(id: string) {
    if (id === selectedId || !(await guardDirty())) return;
    setSelectedId(id);
    scrollToEditor();
  }
  async function selectCategory(id: string) {
    if (id === selectedCat || !(await guardDirty())) return;
    setSelectedCat(id);
    scrollToEditor();
  }
  async function switchMode(next: Mode) {
    if (next === mode || !(await guardDirty())) return;
    setMode(next);
    setTerm("");
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });

  return (
    <PageShell
      title="Custos e preço"
      description="Preencha quanto custa produzir cada peça, por produto ou por categoria, e veja o preço ideal, o lucro por venda e a projeção do mês."
      actions={
        <div className="flex gap-2">
          <Button
            variant={quick ? "default" : "outline"}
            disabled={!ws}
            onClick={async () => {
              if (!(await guardDirty())) return;
              setQuick((v) => !v);
            }}
          >
            <Calculator className="mr-2 h-4 w-4" /> {quick ? "Voltar às fichas" : "Preenchimento rápido"}
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)} disabled={!ws}>
            <Settings2 className="mr-2 h-4 w-4" /> Parâmetros
          </Button>
          <Button variant="outline" size="icon" onClick={refresh} aria-label="Atualizar">
            <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
          </Button>
        </div>
      }
    >
      {confirmDialog}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          index={0}
          icon={Package}
          label="Produtos com ficha de custo"
          loading={!summary}
          value={summary ? `${summary.withCost} de ${summary.total}` : ""}
        />
        <StatCard
          index={1}
          icon={TrendingUp}
          label="Lucro médio no preço atual"
          loading={!summary}
          value={summary?.avgMargin == null ? "—" : pct(summary.avgMargin)}
          hint="Dos produtos com custo preenchido"
        />
        <StatCard
          index={2}
          icon={AlertTriangle}
          label="Abaixo da meta ou no prejuízo"
          loading={!summary}
          value={summary ? String(summary.attention) : ""}
        />
        <StatCard
          index={3}
          icon={Wallet}
          label="Despesas fixas / mês"
          loading={!ws}
          value={brl(monthlyFixed)}
          hint={
            fixedPctRaw === null
              ? "Sem faturamento para ratear"
              : `${pct(fixedPctRaw)} do faturamento${includeFixed ? "" : " (fora do cálculo)"}`
          }
        />
      </div>

      {q.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os custos"
          description={(q.error as Error)?.message}
          action={<Button onClick={refresh}>Tentar de novo</Button>}
        />
      ) : quick && ws ? (
        <div className="mt-4">
          <QuickCostGrid workspace={ws} fixedPct={fixedPct} onDirtyChange={setDirty} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Lista */}
          <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-2 border-b border-neutral-100 p-3">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1" role="tablist">
                {(
                  [
                    ["produto", "Por produto", Package],
                    ["categoria", "Por categoria", Layers],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => switchMode(value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                      mode === value
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={mode === "produto" ? "Buscar produto ou SKU" : "Buscar categoria"}
                  className="pl-8"
                />
              </div>
              {mode === "produto" ? (
                <div className="flex gap-2">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 min-w-0 flex-1">
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
                  <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="h-9 w-[132px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="none">Sem custo</SelectItem>
                      <SelectItem value="attention">Atenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="max-h-[45vh] overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
              {q.isPending ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : mode === "produto" ? (
                productRows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado.
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {productRows.map(({ product: p, health, margin }) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectProduct(p.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50",
                            p.id === selectedId && "bg-neutral-100 hover:bg-neutral-100",
                          )}
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p.name}</div>
                            <div className="truncate text-xs text-muted-foreground tabular-nums">
                              {p.cost > 0 ? `${brl(p.cost)} → ${brl(p.price)}` : brl(p.price)}
                              {p.status !== "active" ? " · inativo" : ""}
                            </div>
                          </div>
                          <HealthPill health={health} margin={margin} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : categoryRows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma categoria com produtos.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {categoryRows.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCategory(c.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50",
                          c.id === selectedCat && "bg-neutral-100 hover:bg-neutral-100",
                        )}
                        style={{ paddingLeft: `${12 + c.depth * 16}px` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-sm",
                              c.depth === 0 ? "font-medium" : "text-foreground/80",
                            )}
                          >
                            {c.name}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {c.withCost} de {c.total} com ficha
                          </div>
                        </div>
                        {c.attention > 0 ? (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {c.attention} atenção
                          </span>
                        ) : c.withCost === c.total ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Completa
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Editor */}
          <div ref={editorRef} className="min-w-0 scroll-mt-4">
            {!ws ? (
              <Skeleton className="h-96 w-full rounded-2xl" />
            ) : mode === "produto" ? (
              selected ? (
                <ProductCostEditor
                  key={selected.id}
                  product={selected}
                  categoryName={
                    selected.category_id ? (catName.get(selected.category_id) ?? null) : null
                  }
                  workspace={ws}
                  fixedPct={fixedPct}
                  onDirtyChange={setDirty}
                  confirm={confirm}
                />
              ) : (
                <EmptyState
                  icon={Calculator}
                  title="Escolha um produto"
                  description="Selecione um produto na lista para preencher os custos de produção e ver o preço ideal e o lucro."
                />
              )
            ) : selectedCat && selectedCategoryProducts.length > 0 ? (
              <CategoryCostEditor
                key={selectedCat}
                categoryName={
                  selectedCat === NO_CATEGORY
                    ? "Sem categoria"
                    : (catName.get(selectedCat) ?? "Categoria")
                }
                products={selectedCategoryProducts}
                workspace={ws}
                fixedPct={fixedPct}
                onDirtyChange={setDirty}
                confirm={confirm}
              />
            ) : (
              <EmptyState
                icon={Layers}
                title="Escolha uma categoria"
                description="Monte uma ficha de custo para a categoria inteira (inclui as subcategorias), aplique nos produtos e ajuste os preços de uma vez."
              />
            )}
          </div>
        </div>
      )}

      {ws ? (
        <SettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workspace={ws}
          computedMonthlyRevenue={computedMonthlyRevenue}
          revenueOverride={revenueOverride}
          onRevenueOverride={(v) => {
            setRevenueOverride(v);
            lsSet(LS_REVENUE, v.trim() ? v : null);
          }}
          includeFixed={includeFixed}
          onIncludeFixed={(v) => {
            setIncludeFixed(v);
            lsSet(LS_INCLUDE_FIXED, v ? "1" : "0");
          }}
          fixedPct={fixedPctRaw}
        />
      ) : null}
    </PageShell>
  );
}
