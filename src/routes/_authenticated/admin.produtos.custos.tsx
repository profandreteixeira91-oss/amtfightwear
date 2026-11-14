import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calculator,
  Copy,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { brl, pct } from "@/lib/format";
import { PIX_DISCOUNT_RATE } from "@/lib/store/pricing";
import {
  COST_ITEM_TYPES,
  PERCENT_FIELDS,
  analyzePrice,
  breakEvenPrice,
  costByType,
  fixedExpensePercent,
  idealPrice,
  itemTotal,
  parseDecimal,
  productionCost,
  roundToNinety,
  type CostItem,
  type PricingPercents,
} from "@/lib/store/product-costs";
import {
  adminApplyProductPrice,
  adminGetCostWorkspace,
  adminSaveFixedExpenses,
  adminSavePricingDefaults,
  adminSaveProductCosts,
  type CostWorkspace,
  type CostWorkspaceProduct,
} from "@/lib/store/product-costs.functions";

export const Route = createFileRoute("/_authenticated/admin/produtos/custos")({
  component: CostsPage,
  head: () => ({
    meta: [
      { title: "Custos e preço dos produtos | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Ficha de custo de produção de cada produto, preço ideal, lucro por peça e projeção de faturamento.",
      },
    ],
  }),
});

const QUERY_KEY = ["product-costs-workspace"];
const LS_REVENUE = "amt.custos.faturamentoMensal";
const LS_INCLUDE_FIXED = "amt.custos.incluirFixas";

type Defaults = CostWorkspace["defaults"];

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

/** Número → texto de campo, com vírgula decimal. */
const toField = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(Math.round(v * 10000) / 10000).replace(".", ",");

function effectivePercents(
  p: CostWorkspaceProduct["percents"],
  defaults: Defaults,
): PricingPercents {
  return {
    taxes: p.taxes ?? defaults.taxes,
    gateway: p.gateway ?? defaults.gateway,
    commission: p.commission ?? defaults.commission,
    marketing: p.marketing ?? defaults.marketing,
    reserve: p.reserve ?? defaults.reserve,
    profit: p.profit ?? defaults.profit,
  };
}

type Health = "none" | "loss" | "below" | "ok";

function productHealth(
  p: CostWorkspaceProduct,
  defaults: Defaults,
  fixedPct: number,
): { health: Health; margin: number | null } {
  if (!(p.cost > 0)) return { health: "none", margin: null };
  const percents = effectivePercents(p.percents, defaults);
  const a = analyzePrice(p.price, p.cost, percents, fixedPct);
  if (a.profit < 0) return { health: "loss", margin: a.margin };
  if (a.margin + 0.05 < percents.profit) return { health: "below", margin: a.margin };
  return { health: "ok", margin: a.margin };
}

const HEALTH_STYLE: Record<Health, { label: string; className: string }> = {
  none: { label: "Sem custo", className: "bg-neutral-100 text-neutral-600" },
  loss: { label: "Prejuízo", className: "bg-red-50 text-red-700" },
  below: { label: "Abaixo da meta", className: "bg-amber-50 text-amber-800" },
  ok: { label: "Na meta", className: "bg-emerald-50 text-emerald-700" },
};

function CostsPage() {
  const fetchWorkspace = useServerFn(adminGetCostWorkspace);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchWorkspace(),
    // Recarregar sozinho apagaria o rascunho em edição.
    refetchOnWindowFocus: false,
  });
  const [confirm, confirmDialog] = useConfirm();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("__all__");
  const [filter, setFilter] = useState<"all" | "none" | "attention">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const categories = useMemo(
    () =>
      [...new Set((ws?.products ?? []).map((p) => p.category).filter(Boolean) as string[])].sort(),
    [ws],
  );

  const rows = useMemo(() => {
    if (!ws) return [];
    const term = search.trim().toLowerCase();
    return ws.products
      .map((p) => ({ product: p, ...productHealth(p, ws.defaults, fixedPct) }))
      .filter(({ product: p, health }) => {
        if (category !== "__all__" && p.category !== category) return false;
        if (filter === "none" && health !== "none") return false;
        if (filter === "attention" && health !== "loss" && health !== "below") return false;
        if (!term) return true;
        return p.name.toLowerCase().includes(term) || (p.sku ?? "").toLowerCase().includes(term);
      });
  }, [ws, search, category, filter, fixedPct]);

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

  async function selectProduct(id: string) {
    if (id === selectedId) return;
    if (
      dirtyRef.current &&
      !(await confirm({
        title: "Descartar alterações?",
        description: "Os custos deste produto foram alterados e ainda não foram salvos.",
        confirmLabel: "Descartar",
        destructive: true,
      }))
    )
      return;
    dirtyRef.current = false;
    setSelectedId(id);
    // No celular a ficha fica abaixo da lista.
    requestAnimationFrame(() => {
      if (window.innerWidth < 1024)
        editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  return (
    <PageShell
      title="Custos e preço"
      description="Preencha quanto custa produzir cada peça e veja o preço ideal, o lucro por venda e a projeção do mês."
      actions={
        <div className="flex gap-2">
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
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Lista de produtos */}
          <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-2 border-b border-neutral-100 p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto ou SKU"
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 min-w-0 flex-1">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as categorias</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
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
            </div>
            <div className="max-h-[45vh] overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
              {q.isPending ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {rows.map(({ product: p, health, margin }) => (
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
                            {p.status !== "active" ? " · rascunho" : ""}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                            HEALTH_STYLE[health].className,
                          )}
                          title={HEALTH_STYLE[health].label}
                        >
                          {margin === null ? HEALTH_STYLE.none.label : pct(margin)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Ficha do produto */}
          <div ref={editorRef} className="min-w-0 scroll-mt-4">
            {!ws ? (
              <Skeleton className="h-96 w-full rounded-2xl" />
            ) : selected ? (
              <ProductCostEditor
                key={selected.id}
                product={selected}
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

/* ───────────────────────── Ficha de custo de um produto ───────────────────────── */

type DraftItem = {
  key: string;
  name: string;
  type: string;
  quantity: string;
  unit_cost: string;
  waste_percent: string;
  unit_of_measure: string;
};

const newKey = () => Math.random().toString(36).slice(2);

const toDraftItems = (items: CostWorkspaceProduct["items"]): DraftItem[] =>
  items.map((it) => ({
    key: newKey(),
    name: it.name,
    type: it.type,
    quantity: toField(it.quantity),
    unit_cost: toField(it.unit_cost),
    waste_percent: it.waste_percent ? toField(it.waste_percent) : "",
    unit_of_measure: it.unit_of_measure ?? "",
  }));

const toDraftPercents = (p: CostWorkspaceProduct["percents"]) =>
  Object.fromEntries(PERCENT_FIELDS.map(({ key }) => [key, toField(p[key])])) as Record<
    keyof PricingPercents,
    string
  >;

const QUICK_ITEMS: { name: string; type: string; unit: string }[] = [
  { name: "Tecido", type: "material", unit: "m" },
  { name: "Costura", type: "labor", unit: "un" },
  { name: "Corte", type: "labor", unit: "un" },
  { name: "Bordado", type: "print", unit: "un" },
  { name: "Etiqueta", type: "trim", unit: "un" },
  { name: "Linha", type: "trim", unit: "un" },
  { name: "Embalagem", type: "packaging", unit: "un" },
];

const serialize = (items: DraftItem[], percents: Record<string, string>) =>
  JSON.stringify({ items: items.map(({ key: _k, ...rest }) => rest), percents });

function ProductCostEditor({
  product,
  workspace,
  fixedPct,
  onDirtyChange,
  confirm,
}: {
  product: CostWorkspaceProduct;
  workspace: CostWorkspace;
  fixedPct: number;
  onDirtyChange: (dirty: boolean) => void;
  confirm: ReturnType<typeof useConfirm>[0];
}) {
  const queryClient = useQueryClient();
  const saveCosts = useServerFn(adminSaveProductCosts);
  const applyPrice = useServerFn(adminApplyProductPrice);
  const defaults = workspace.defaults;

  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(product.items));
  const [percents, setPercents] = useState(() => toDraftPercents(product.percents));
  const [baseline, setBaseline] = useState(() =>
    serialize(toDraftItems(product.items), toDraftPercents(product.percents)),
  );
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const months = workspace.sales.window_days / 30;
  const avgMonthlyUnits = product.units_sold / months;
  const [monthlyQty, setMonthlyQty] = useState(() =>
    String(avgMonthlyUnits > 0 ? Math.max(1, Math.round(avgMonthlyUnits)) : 10),
  );
  const [simulated, setSimulated] = useState("");

  const dirty = serialize(items, percents) !== baseline;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const parsedItems: CostItem[] = items.map((it) => ({
    name: it.name,
    type: it.type,
    quantity: parseDecimal(it.quantity) ?? 0,
    unit_cost: parseDecimal(it.unit_cost) ?? 0,
    waste_percent: parseDecimal(it.waste_percent) ?? 0,
  }));
  const cost = productionCost(parsedItems);
  const eff: PricingPercents = Object.fromEntries(
    PERCENT_FIELDS.map(({ key }) => [key, parseDecimal(percents[key]) ?? defaults[key]]),
  ) as PricingPercents;

  const ideal = idealPrice(cost, eff, fixedPct);
  const idealRounded = ideal === null ? null : roundToNinety(ideal);
  const breakEven = breakEvenPrice(cost, eff, fixedPct);
  const current = analyzePrice(product.price, cost, eff, fixedPct);
  const pix = analyzePrice(product.price * (1 - PIX_DISCOUNT_RATE), cost, eff, fixedPct);
  const wholesaleDiscount =
    product.wholesale_discount_percent ?? defaults.wholesale_discount_percent;
  const wholesale = product.wholesale_enabled
    ? analyzePrice(product.price * (1 - wholesaleDiscount / 100), cost, eff, fixedPct)
    : null;
  const simulatedPrice = parseDecimal(simulated);
  const percentSum = PERCENT_FIELDS.reduce((acc, { key }) => acc + eff[key], 0) + fixedPct;

  const updateItem = (key: string, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = (seed?: { name: string; type: string; unit: string }) =>
    setItems((prev) => [
      ...prev,
      {
        key: newKey(),
        name: seed?.name ?? "",
        type: seed?.type ?? "material",
        quantity: "1",
        unit_cost: "",
        waste_percent: "",
        unit_of_measure: seed?.unit ?? "un",
      },
    ]);

  const copySources = workspace.products.filter((p) => p.id !== product.id && p.items.length > 0);
  async function copyFrom(id: string) {
    const src = workspace.products.find((p) => p.id === id);
    if (!src) return;
    if (
      items.length > 0 &&
      !(await confirm({
        title: `Copiar custos de "${src.name}"?`,
        description:
          "Os itens atuais desta ficha serão substituídos. Nada é salvo até você clicar em Salvar.",
        confirmLabel: "Copiar",
      }))
    )
      return;
    setItems(toDraftItems(src.items));
  }

  async function save() {
    const payloadItems = [];
    for (const it of items) {
      const name = it.name.trim();
      const quantity = parseDecimal(it.quantity);
      const unitCost = parseDecimal(it.unit_cost);
      const waste = it.waste_percent.trim() ? parseDecimal(it.waste_percent) : 0;
      if (!name) return toast.error("Dê um nome a todos os itens de custo.");
      if (quantity === null || quantity < 0)
        return toast.error(`Quantidade inválida em "${name}".`);
      if (unitCost === null || unitCost < 0)
        return toast.error(`Custo unitário inválido em "${name}".`);
      if (waste === null || waste < 0 || waste > 100)
        return toast.error(`Perda inválida em "${name}" (0 a 100%).`);
      payloadItems.push({
        name,
        type: it.type,
        quantity,
        unit_cost: unitCost,
        waste_percent: waste,
        unit_of_measure: it.unit_of_measure.trim() || null,
      });
    }
    const payloadPercents = {} as Record<keyof PricingPercents, number | null>;
    for (const { key, label } of PERCENT_FIELDS) {
      const raw = percents[key].trim();
      const v = raw ? parseDecimal(raw) : null;
      if (raw && (v === null || v < 0 || v > 100))
        return toast.error(`${label}: use um valor de 0 a 100%.`);
      payloadPercents[key] = v;
    }

    setSaving(true);
    try {
      await saveCosts({
        data: { product_id: product.id, items: payloadItems, percents: payloadPercents },
      });
      setBaseline(serialize(items, percents));
      toast.success("Custos salvos");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message || "Erro ao salvar os custos");
    } finally {
      setSaving(false);
    }
  }

  async function apply(price: number) {
    const ownPriced = product.variant_prices.length;
    const ok = await confirm({
      title: `Mudar o preço na loja para ${brl(price)}?`,
      description: (
        <>
          {product.name}: de {brl(product.price)} para {brl(price)}. O novo preço aparece na vitrine
          na hora.
          {ownPriced > 0
            ? ` ${ownPriced} ${ownPriced === 1 ? "variação tem" : "variações têm"} preço próprio e não ${ownPriced === 1 ? "muda" : "mudam"}: ajuste em Produtos.`
            : ""}
        </>
      ),
      confirmLabel: "Mudar preço",
    });
    if (!ok) return;
    setApplying(true);
    try {
      await applyPrice({ data: { product_id: product.id, price } });
      toast.success(`Preço atualizado para ${brl(price)}`);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message || "Erro ao mudar o preço");
    } finally {
      setApplying(false);
    }
  }

  const qty = Math.max(0, parseDecimal(monthlyQty) ?? 0);
  const scenarios = [
    { label: "Preço atual", price: product.price },
    ...(idealRounded !== null ? [{ label: "Preço ideal", price: idealRounded }] : []),
    ...(simulatedPrice && simulatedPrice > 0 ? [{ label: "Simulado", price: simulatedPrice }] : []),
  ].map((s) => ({ ...s, a: analyzePrice(s.price, cost, eff, fixedPct) }));

  const typeLabel = (t: string) => COST_ITEM_TYPES.find((x) => x.value === t)?.label ?? t;
  const variantRange =
    product.variant_prices.length > 0
      ? [Math.min(...product.variant_prices), Math.max(...product.variant_prices)]
      : null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{product.name}</div>
            <div className="text-xs text-muted-foreground">
              {[product.category, product.sku].filter(Boolean).join(" · ") || "Sem categoria"} ·
              preço atual {brl(product.price)}
              {variantRange
                ? ` · variações ${variantRange[0] === variantRange[1] ? brl(variantRange[0]) : `${brl(variantRange[0])} a ${brl(variantRange[1])}`}`
                : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
              Não salvo
            </Badge>
          ) : null}
          <Button onClick={save} disabled={!dirty || saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {/* Itens de custo */}
          <SectionCard
            title="Custo de produção por peça"
            description="Tudo que entra na fabricação de uma unidade. A perda soma o desperdício (ex.: 10% de sobra de tecido)."
            action={
              copySources.length > 0 ? (
                <Select value="" onValueChange={copyFrom}>
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    <SelectValue placeholder="Copiar de outro produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {copySources.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({brl(p.cost)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : undefined
            }
          >
            {items.length > 0 ? (
              <div className="space-y-2">
                <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_64px_56px_88px_60px_88px_32px] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <span>Item</span>
                  <span>Tipo</span>
                  <span>Qtd</span>
                  <span>Unid.</span>
                  <span>Custo unit.</span>
                  <span>Perda %</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>
                {items.map((it, idx) => (
                  <div
                    key={it.key}
                    className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-100 p-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_64px_56px_88px_60px_88px_32px] md:items-center md:border-0 md:p-0"
                  >
                    <Input
                      className="col-span-2 md:col-span-1"
                      value={it.name}
                      placeholder="Ex.: Tecido trançado"
                      aria-label="Item"
                      onChange={(e) => updateItem(it.key, { name: e.target.value })}
                    />
                    <Select value={it.type} onValueChange={(v) => updateItem(it.key, { type: v })}>
                      <SelectTrigger className="col-span-2 md:col-span-1" aria-label="Tipo">
                        <SelectValue>{typeLabel(it.type)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {COST_ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <LabeledMobile label="Qtd">
                      <Input
                        inputMode="decimal"
                        value={it.quantity}
                        aria-label="Quantidade"
                        onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                      />
                    </LabeledMobile>
                    <LabeledMobile label="Unid.">
                      <Input
                        value={it.unit_of_measure}
                        placeholder="un"
                        aria-label="Unidade"
                        onChange={(e) => updateItem(it.key, { unit_of_measure: e.target.value })}
                      />
                    </LabeledMobile>
                    <LabeledMobile label="Custo unit. (R$)">
                      <Input
                        inputMode="decimal"
                        value={it.unit_cost}
                        placeholder="0,00"
                        aria-label="Custo unitário"
                        onChange={(e) => updateItem(it.key, { unit_cost: e.target.value })}
                      />
                    </LabeledMobile>
                    <LabeledMobile label="Perda %">
                      <Input
                        inputMode="decimal"
                        value={it.waste_percent}
                        placeholder="0"
                        aria-label="Perda em %"
                        onChange={(e) => updateItem(it.key, { waste_percent: e.target.value })}
                      />
                    </LabeledMobile>
                    <div className="flex items-center text-sm font-semibold tabular-nums md:justify-end">
                      {brl(itemTotal(parsedItems[idx]))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 justify-self-end"
                      aria-label={`Remover ${it.name || "item"}`}
                      onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-sm text-muted-foreground">
                Nenhum custo preenchido. Comece pelos atalhos abaixo ou adicione um item.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => addItem()}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Item
              </Button>
              {QUICK_ITEMS.map((q) => (
                <Button
                  key={q.name}
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => addItem(q)}
                >
                  + {q.name}
                </Button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-100 pt-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {costByType(parsedItems).map((r) => (
                  <span key={r.type}>
                    {typeLabel(r.type)}:{" "}
                    <span className="font-medium text-foreground tabular-nums">{brl(r.total)}</span>
                  </span>
                ))}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Custo por peça</div>
                <div className="text-2xl font-semibold tabular-nums">{brl(cost)}</div>
              </div>
            </div>
          </SectionCard>

          {/* Percentuais */}
          <SectionCard
            title="Despesas sobre a venda e lucro"
            description="Percentuais do preço de venda. Em branco usa o padrão da loja (Parâmetros)."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PERCENT_FIELDS.map(({ key, label, hint }) => {
                const overridden = percents[key].trim() !== "";
                return (
                  <div key={key} className="min-w-0 space-y-1">
                    <Label className="flex items-center justify-between gap-1 text-xs">
                      <span className="truncate">{label}</span>
                      {overridden ? (
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-normal text-muted-foreground underline-offset-2 hover:underline"
                          onClick={() => setPercents((p) => ({ ...p, [key]: "" }))}
                        >
                          usar padrão
                        </button>
                      ) : null}
                    </Label>
                    <div className="relative">
                      <Input
                        inputMode="decimal"
                        value={percents[key]}
                        placeholder={toField(defaults[key])}
                        onChange={(e) => setPercents((p) => ({ ...p, [key]: e.target.value }))}
                        className={cn("pr-7", key === "profit" && "font-semibold")}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground" title={hint}>
                      {overridden ? hint : `Padrão ${pct(defaults[key])}`}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-muted-foreground">
              <span>
                Rateio de despesas fixas:{" "}
                <span className="font-medium text-foreground">{pct(fixedPct)}</span>
              </span>
              <span className={cn(percentSum >= 100 && "font-semibold text-destructive")}>
                Total sobre o preço:{" "}
                <span className="font-medium tabular-nums">{pct(percentSum)}</span>
              </span>
            </div>
          </SectionCard>
        </div>

        {/* Resultado */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
              <Target className="h-3.5 w-3.5" /> Preço ideal
            </div>
            {cost <= 0 ? (
              <p className="mt-2 text-sm text-white/70">
                Preencha o custo de produção para calcular.
              </p>
            ) : ideal === null ? (
              <p className="mt-2 text-sm text-red-300">
                Os percentuais somam {pct(percentSum)} do preço: não existe preço que cubra tudo.
                Reduza algum deles.
              </p>
            ) : (
              <>
                <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                  {brl(idealRounded!)}
                </div>
                <div className="mt-1 text-xs text-white/60 tabular-nums">
                  Exato {brl(ideal)} · markup {(ideal / cost).toFixed(2).replace(".", ",")}x · lucro{" "}
                  {brl(analyzePrice(idealRounded!, cost, eff, fixedPct).profit)} por peça
                </div>
                {Math.abs(idealRounded! - product.price) >= 0.01 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    disabled={applying || dirty}
                    title={dirty ? "Salve os custos antes de mudar o preço" : undefined}
                    onClick={() => apply(idealRounded!)}
                  >
                    {dirty ? "Salve os custos para aplicar" : `Usar ${brl(idealRounded!)} na loja`}
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-emerald-300">O preço da loja já é o ideal.</p>
                )}
              </>
            )}
          </div>

          {cost > 0 ? (
            <SectionCard title="No preço atual">
              <dl className="space-y-1.5 text-sm">
                <Row label="Preço de venda" value={brl(product.price)} />
                <Row label="Custo de produção" value={`− ${brl(cost)}`} />
                <Row
                  label="Impostos, taxas e marketing"
                  value={`− ${brl(current.variableCosts)}`}
                />
                {current.fixedShare > 0 ? (
                  <Row label="Despesas fixas (rateio)" value={`− ${brl(current.fixedShare)}`} />
                ) : null}
                <div className="border-t border-neutral-100 pt-1.5">
                  <Row
                    label="Lucro por peça"
                    value={brl(current.profit)}
                    strong
                    tone={
                      current.profit < 0
                        ? "bad"
                        : current.margin + 0.05 < eff.profit
                          ? "warn"
                          : "good"
                    }
                  />
                  <Row
                    label="Margem de lucro"
                    value={`${pct(current.margin)} (meta ${pct(eff.profit)})`}
                  />
                  {current.markup ? (
                    <Row label="Markup" value={`${current.markup.toFixed(2).replace(".", ",")}x`} />
                  ) : null}
                </div>
                <div className="space-y-1.5 border-t border-neutral-100 pt-1.5 text-xs">
                  {breakEven !== null ? (
                    <Row label="Preço mínimo (lucro zero)" value={brl(breakEven)} />
                  ) : null}
                  <Row
                    label={`No PIX (−${Math.round(PIX_DISCOUNT_RATE * 100)}%)`}
                    value={`${brl(pix.price)} · lucro ${brl(pix.profit)}`}
                    tone={pix.profit < 0 ? "bad" : undefined}
                  />
                  {wholesale ? (
                    <Row
                      label={`Atacado (−${toField(wholesaleDiscount)}%)`}
                      value={`${brl(wholesale.price)} · lucro ${brl(wholesale.profit)}`}
                      tone={wholesale.profit < 0 ? "bad" : undefined}
                    />
                  ) : null}
                </div>
              </dl>
            </SectionCard>
          ) : null}
        </div>
      </div>

      {/* Projeção */}
      {cost > 0 ? (
        <SectionCard
          title="Projeção do mês"
          description={
            avgMonthlyUnits > 0
              ? `Média dos últimos ${workspace.sales.window_days} dias: ${avgMonthlyUnits.toFixed(1).replace(".", ",")} peças/mês.`
              : `Sem vendas pagas nos últimos ${workspace.sales.window_days} dias: ajuste a quantidade estimada.`
          }
        >
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="w-36 space-y-1">
              <Label className="text-xs">Peças vendidas no mês</Label>
              <Input
                inputMode="numeric"
                value={monthlyQty}
                onChange={(e) => setMonthlyQty(e.target.value)}
              />
            </div>
            <div className="w-36 space-y-1">
              <Label className="text-xs">Simular outro preço</Label>
              <Input
                inputMode="decimal"
                value={simulated}
                placeholder="R$"
                onChange={(e) => setSimulated(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium" />
                  {scenarios.map((s) => (
                    <th key={s.label} className="pb-2 text-right font-medium">
                      {s.label}
                      <div className="font-normal tabular-nums">{brl(s.price)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <ProjectionRow label="Faturamento" values={scenarios.map((s) => s.price * qty)} />
                <ProjectionRow
                  label="Custo de produção"
                  values={scenarios.map(() => -cost * qty)}
                />
                <ProjectionRow
                  label="Impostos, taxas e marketing"
                  values={scenarios.map((s) => -s.a.variableCosts * qty)}
                />
                {fixedPct > 0 ? (
                  <ProjectionRow
                    label="Despesas fixas (rateio)"
                    values={scenarios.map((s) => -s.a.fixedShare * qty)}
                  />
                ) : null}
                <ProjectionRow
                  label="Lucro"
                  values={scenarios.map((s) => s.a.profit * qty)}
                  strong
                />
                <tr className="text-xs text-muted-foreground">
                  <td className="pt-1">Margem</td>
                  {scenarios.map((s) => (
                    <td key={s.label} className="pt-1 text-right">
                      {pct(s.a.margin)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function LabeledMobile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1 md:space-y-0">
      <span className="text-[11px] text-muted-foreground md:hidden">{label}</span>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right tabular-nums",
          strong && "text-base font-semibold",
          tone === "good" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ProjectionRow({
  label,
  values,
  strong,
}: {
  label: string;
  values: number[];
  strong?: boolean;
}) {
  return (
    <tr className={cn("border-t border-neutral-100", strong && "font-semibold")}>
      <td className="py-1.5 text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            "py-1.5 text-right",
            strong && v < 0 && "text-destructive",
            strong && v > 0 && "text-emerald-700",
          )}
        >
          {brl(v)}
        </td>
      ))}
    </tr>
  );
}

/* ───────────────────────── Parâmetros da loja ───────────────────────── */

function SettingsSheet({
  open,
  onOpenChange,
  workspace,
  computedMonthlyRevenue,
  revenueOverride,
  onRevenueOverride,
  includeFixed,
  onIncludeFixed,
  fixedPct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: CostWorkspace;
  computedMonthlyRevenue: number;
  revenueOverride: string;
  onRevenueOverride: (v: string) => void;
  includeFixed: boolean;
  onIncludeFixed: (v: boolean) => void;
  fixedPct: number | null;
}) {
  const queryClient = useQueryClient();
  const saveDefaults = useServerFn(adminSavePricingDefaults);
  const saveFixed = useServerFn(adminSaveFixedExpenses);

  const editable = ["taxes", "gateway", "marketing", "profit"] as const;
  const [defaults, setDefaults] = useState<Record<(typeof editable)[number], string>>(
    () =>
      Object.fromEntries(editable.map((k) => [k, toField(workspace.defaults[k])])) as Record<
        (typeof editable)[number],
        string
      >,
  );
  const [fixed, setFixed] = useState(() =>
    workspace.fixed_expenses.map((f) => ({ ...f, key: f.id, value: toField(f.value) })),
  );
  const [busy, setBusy] = useState<"defaults" | "fixed" | null>(null);

  // Ao abrir, parte do que está salvo.
  useEffect(() => {
    if (!open) return;
    setDefaults(
      Object.fromEntries(
        editable.map((k) => [k, toField(workspace.defaults[k])]),
      ) as typeof defaults,
    );
    setFixed(workspace.fixed_expenses.map((f) => ({ ...f, key: f.id, value: toField(f.value) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fixedTotal = fixed.reduce((acc, f) => acc + (parseDecimal(f.value) ?? 0), 0);

  async function submitDefaults() {
    const out = {} as Record<(typeof editable)[number], number>;
    for (const k of editable) {
      const v = parseDecimal(defaults[k]);
      if (v === null || v < 0 || v > 100) return toast.error("Use percentuais de 0 a 100.");
      out[k] = v;
    }
    setBusy("defaults");
    try {
      await saveDefaults({ data: out });
      toast.success("Percentuais padrão salvos");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submitFixed() {
    const items = [];
    for (const f of fixed) {
      const value = parseDecimal(f.value);
      if (!f.name.trim()) return toast.error("Dê nome a todas as despesas.");
      if (value === null || value < 0) return toast.error(`Valor inválido em "${f.name}".`);
      items.push({ ...(f.id ? { id: f.id } : {}), name: f.name.trim(), value });
    }
    setBusy("fixed");
    try {
      await saveFixed({ data: { items } });
      toast.success("Despesas fixas salvas");
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const labels: Record<(typeof editable)[number], string> = {
    taxes: "Impostos",
    gateway: "Taxa de pagamento",
    marketing: "Marketing",
    profit: "Lucro desejado",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Parâmetros da loja</SheetTitle>
          <SheetDescription>
            Valem para todos os produtos que não têm percentual próprio.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Percentuais padrão sobre a venda</h3>
            <div className="grid grid-cols-2 gap-3">
              {editable.map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{labels[k]} (%)</Label>
                  <Input
                    inputMode="decimal"
                    value={defaults[k]}
                    onChange={(e) => setDefaults((d) => ({ ...d, [k]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão e reserva começam em 0% e podem ser preenchidas em cada produto.
            </p>
            <Button size="sm" onClick={submitDefaults} disabled={busy !== null}>
              {busy === "defaults" ? "Salvando…" : "Salvar percentuais"}
            </Button>
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">Despesas fixas mensais</h3>
              <span className="text-sm font-semibold tabular-nums">{brl(fixedTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Aluguel, salários, sistemas, contador… o que se paga todo mês, vendendo ou não.
            </p>
            <div className="space-y-2">
              {fixed.map((f) => (
                <div key={f.key} className="flex gap-2">
                  <Input
                    value={f.name}
                    placeholder="Ex.: Aluguel"
                    onChange={(e) =>
                      setFixed((list) =>
                        list.map((x) => (x.key === f.key ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    inputMode="decimal"
                    className="w-28"
                    value={f.value}
                    placeholder="R$"
                    onChange={(e) =>
                      setFixed((list) =>
                        list.map((x) => (x.key === f.key ? { ...x, value: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${f.name || "despesa"}`}
                    onClick={() => setFixed((list) => list.filter((x) => x.key !== f.key))}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setFixed((list) => [...list, { id: "", key: newKey(), name: "", value: "" }])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Despesa
              </Button>
              <Button size="sm" onClick={submitFixed} disabled={busy !== null}>
                {busy === "fixed" ? "Salvando…" : "Salvar despesas"}
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Rateio das despesas fixas</h3>
            <p className="text-xs text-muted-foreground">
              As despesas fixas entram no preço como percentual do faturamento: despesas do mês ÷
              faturamento médio do mês.
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
              <Label htmlFor="include-fixed" className="text-sm">
                Incluir no preço ideal e no lucro
              </Label>
              <Switch id="include-fixed" checked={includeFixed} onCheckedChange={onIncludeFixed} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Faturamento médio mensal (R$)</Label>
              <Input
                inputMode="decimal"
                value={revenueOverride}
                placeholder={toField(Math.round(computedMonthlyRevenue * 100) / 100)}
                onChange={(e) => onRevenueOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Em branco usa a loja online: {brl(computedMonthlyRevenue)}/mês nos últimos{" "}
                {workspace.sales.window_days} dias (sem frete). Some vendas de atacado e encomendas
                se elas não passam pela loja. Fica salvo só neste navegador.
              </p>
            </div>
            <p className="text-sm">
              Rateio atual:{" "}
              <span className="font-semibold">
                {fixedPct === null ? "sem faturamento" : pct(fixedPct)}
              </span>
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
