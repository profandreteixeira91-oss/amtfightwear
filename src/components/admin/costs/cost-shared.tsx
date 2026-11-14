import type { ReactNode } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { brl, pct } from "@/lib/format";
import {
  COST_ITEM_TYPES,
  PERCENT_FIELDS,
  analyzePrice,
  costByType,
  itemTotal,
  parseDecimal,
  productionCost,
  type CostItem,
  type PricingPercents,
} from "@/lib/store/product-costs";
import type { CostWorkspace, CostWorkspaceProduct } from "@/lib/store/product-costs.functions";

/** Peças compartilhadas da tela de custos (editor por produto e por categoria). */

export const COSTS_QUERY_KEY = ["product-costs-workspace"];
export const NO_CATEGORY = "__none__";

export type Defaults = CostWorkspace["defaults"];
export type PercentKey = keyof PricingPercents;
export type DraftPercents = Record<PercentKey, string>;
export type SheetItem = CostWorkspaceProduct["items"][number];

export type DraftItem = {
  key: string;
  name: string;
  type: string;
  quantity: string;
  unit_cost: string;
  waste_percent: string;
  unit_of_measure: string;
};

/** Número → texto de campo, com vírgula decimal. */
export const toField = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(Math.round(v * 10000) / 10000).replace(".", ",");

export const newKey = () => Math.random().toString(36).slice(2);

export const toDraftItems = (items: SheetItem[]): DraftItem[] =>
  items.map((it) => ({
    key: newKey(),
    name: it.name,
    type: it.type,
    quantity: toField(it.quantity),
    unit_cost: toField(it.unit_cost),
    waste_percent: it.waste_percent ? toField(it.waste_percent) : "",
    unit_of_measure: it.unit_of_measure ?? "",
  }));

export const toDraftPercents = (p: CostWorkspaceProduct["percents"]): DraftPercents =>
  Object.fromEntries(PERCENT_FIELDS.map(({ key }) => [key, toField(p[key])])) as DraftPercents;

export const emptyDraftPercents = (): DraftPercents =>
  Object.fromEntries(PERCENT_FIELDS.map(({ key }) => [key, ""])) as DraftPercents;

export const serializeDraft = (items: DraftItem[], percents: DraftPercents) =>
  JSON.stringify({ items: items.map(({ key: _k, ...rest }) => rest), percents });

/** Itens do rascunho como números, para o cálculo ao vivo (campos inválidos contam 0). */
export const parseDraftItems = (items: DraftItem[]): CostItem[] =>
  items.map((it) => ({
    name: it.name,
    type: it.type,
    quantity: parseDecimal(it.quantity) ?? 0,
    unit_cost: parseDecimal(it.unit_cost) ?? 0,
    waste_percent: parseDecimal(it.waste_percent) ?? 0,
  }));

export function effectivePercents(
  p: CostWorkspaceProduct["percents"],
  defaults: Defaults,
): PricingPercents {
  return Object.fromEntries(
    PERCENT_FIELDS.map(({ key }) => [key, p[key] ?? defaults[key]]),
  ) as PricingPercents;
}

export const draftEffectivePercents = (draft: DraftPercents, defaults: Defaults): PricingPercents =>
  Object.fromEntries(
    PERCENT_FIELDS.map(({ key }) => [key, parseDecimal(draft[key]) ?? defaults[key]]),
  ) as PricingPercents;

type ItemPayload = {
  name: string;
  type: string;
  quantity: number;
  unit_cost: number;
  waste_percent: number;
  unit_of_measure: string | null;
};

/** Valida o rascunho para gravar. Devolve a mensagem de erro ou os dados. */
export function draftToPayload(
  items: DraftItem[],
  percents: DraftPercents,
): { error: string } | { items: ItemPayload[]; percents: Record<PercentKey, number | null> } {
  const out: ItemPayload[] = [];
  for (const it of items) {
    const name = it.name.trim();
    const quantity = parseDecimal(it.quantity);
    const unitCost = parseDecimal(it.unit_cost);
    const waste = it.waste_percent.trim() ? parseDecimal(it.waste_percent) : 0;
    if (!name) return { error: "Dê um nome a todos os itens de custo." };
    if (quantity === null || quantity < 0) return { error: `Quantidade inválida em "${name}".` };
    if (unitCost === null || unitCost < 0)
      return { error: `Custo unitário inválido em "${name}".` };
    if (waste === null || waste < 0 || waste > 100)
      return { error: `Perda inválida em "${name}" (0 a 100%).` };
    out.push({
      name,
      type: it.type,
      quantity,
      unit_cost: unitCost,
      waste_percent: waste,
      unit_of_measure: it.unit_of_measure.trim() || null,
    });
  }
  const pcts = {} as Record<PercentKey, number | null>;
  for (const { key, label } of PERCENT_FIELDS) {
    const raw = percents[key].trim();
    const v = raw ? parseDecimal(raw) : null;
    if (raw && (v === null || v < 0 || v > 100))
      return { error: `${label}: use um valor de 0 a 100%.` };
    pcts[key] = v;
  }
  return { items: out, percents: pcts };
}

/* ───────────── Saúde do preço de um produto ───────────── */

export type Health = "none" | "loss" | "below" | "ok";

export function productHealth(
  p: Pick<CostWorkspaceProduct, "cost" | "price" | "percents">,
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

export const HEALTH_STYLE: Record<Health, { label: string; className: string }> = {
  none: { label: "Sem custo", className: "bg-neutral-100 text-neutral-600" },
  loss: { label: "Prejuízo", className: "bg-red-50 text-red-700" },
  below: { label: "Abaixo da meta", className: "bg-amber-50 text-amber-800" },
  ok: { label: "Na meta", className: "bg-emerald-50 text-emerald-700" },
};

export function HealthPill({ health, margin }: { health: Health; margin: number | null }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        HEALTH_STYLE[health].className,
      )}
      title={HEALTH_STYLE[health].label}
    >
      {margin === null ? HEALTH_STYLE.none.label : pct(margin)}
    </span>
  );
}

/* ───────────── Árvore de categorias ───────────── */

export type CategoryNode = CostWorkspace["categories"][number];

/** Categorias em ordem de árvore, com a profundidade de cada uma. */
export function categoryOptions(categories: CategoryNode[]) {
  const byParent = new Map<string | null, CategoryNode[]>();
  for (const c of categories) {
    const k = c.parent_id && categories.some((x) => x.id === c.parent_id) ? c.parent_id : null;
    byParent.set(k, [...(byParent.get(k) ?? []), c]);
  }
  const out: (CategoryNode & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      out.push({ ...c, depth });
      if (depth < 8) walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** A categoria e todas as descendentes. */
export function categoryWithDescendants(categories: CategoryNode[], id: string): Set<string> {
  const acc = new Set([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of categories) {
      if (c.parent_id === cur && !acc.has(c.id)) {
        acc.add(c.id);
        stack.push(c.id);
      }
    }
  }
  return acc;
}

export function productsInCategory(
  products: CostWorkspaceProduct[],
  categories: CategoryNode[],
  categoryId: string,
) {
  if (categoryId === NO_CATEGORY)
    return products.filter(
      (p) => !p.category_id || !categories.some((c) => c.id === p.category_id),
    );
  const ids = categoryWithDescendants(categories, categoryId);
  return products.filter((p) => p.category_id && ids.has(p.category_id));
}

/* ───────────── Editor dos itens de custo ───────────── */

const QUICK_ITEMS: { name: string; type: string; unit: string }[] = [
  { name: "Tecido", type: "material", unit: "m" },
  { name: "Costura", type: "labor", unit: "un" },
  { name: "Corte", type: "labor", unit: "un" },
  { name: "Bordado", type: "print", unit: "un" },
  { name: "Etiqueta", type: "trim", unit: "un" },
  { name: "Linha", type: "trim", unit: "un" },
  { name: "Embalagem", type: "packaging", unit: "un" },
];

const GRID = "md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_64px_56px_88px_60px_88px_32px]";

export const typeLabel = (t: string) => COST_ITEM_TYPES.find((x) => x.value === t)?.label ?? t;

export function CostItemsEditor({
  items,
  onChange,
  copySources,
  onCopyFrom,
}: {
  items: DraftItem[];
  onChange: (next: DraftItem[]) => void;
  copySources?: { id: string; name: string; cost: number }[];
  onCopyFrom?: (id: string) => void;
}) {
  const parsed = parseDraftItems(items);
  const cost = productionCost(parsed);
  const update = (key: string, patch: Partial<DraftItem>) =>
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const add = (seed?: { name: string; type: string; unit: string }) =>
    onChange([
      ...items,
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

  return (
    <div>
      {copySources && copySources.length > 0 && onCopyFrom ? (
        <div className="mb-3 flex justify-end">
          <Select value="" onValueChange={onCopyFrom}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[240px]">
              <Copy className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="Copiar ficha de outro produto" />
            </SelectTrigger>
            <SelectContent>
              {copySources.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({brl(p.cost)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-2">
          <div
            className={cn(
              "hidden gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid",
              GRID,
            )}
          >
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
              className={cn(
                "grid grid-cols-2 gap-2 rounded-xl border border-neutral-100 p-2 md:items-center md:border-0 md:p-0",
                GRID,
              )}
            >
              <Input
                className="col-span-2 md:col-span-1"
                value={it.name}
                placeholder="Ex.: Tecido trançado"
                aria-label="Item"
                onChange={(e) => update(it.key, { name: e.target.value })}
              />
              <Select value={it.type} onValueChange={(v) => update(it.key, { type: v })}>
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
                  onChange={(e) => update(it.key, { quantity: e.target.value })}
                />
              </LabeledMobile>
              <LabeledMobile label="Unid.">
                <Input
                  value={it.unit_of_measure}
                  placeholder="un"
                  aria-label="Unidade"
                  onChange={(e) => update(it.key, { unit_of_measure: e.target.value })}
                />
              </LabeledMobile>
              <LabeledMobile label="Custo unit. (R$)">
                <Input
                  inputMode="decimal"
                  value={it.unit_cost}
                  placeholder="0,00"
                  aria-label="Custo unitário"
                  onChange={(e) => update(it.key, { unit_cost: e.target.value })}
                />
              </LabeledMobile>
              <LabeledMobile label="Perda %">
                <Input
                  inputMode="decimal"
                  value={it.waste_percent}
                  placeholder="0"
                  aria-label="Perda em %"
                  onChange={(e) => update(it.key, { waste_percent: e.target.value })}
                />
              </LabeledMobile>
              <div className="flex items-center text-sm font-semibold tabular-nums md:justify-end">
                {brl(itemTotal(parsed[idx]))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 justify-self-end"
                aria-label={`Remover ${it.name || "item"}`}
                onClick={() => onChange(items.filter((x) => x.key !== it.key))}
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
        <Button size="sm" variant="outline" onClick={() => add()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Item
        </Button>
        {QUICK_ITEMS.map((q) => (
          <Button
            key={q.name}
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            onClick={() => add(q)}
          >
            + {q.name}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-100 pt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {costByType(parsed).map((r) => (
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
    </div>
  );
}

/* ───────────── Editor dos percentuais ───────────── */

export function PercentsEditor({
  percents,
  onChange,
  defaults,
  fixedPct,
}: {
  percents: DraftPercents;
  onChange: (next: DraftPercents) => void;
  defaults: Defaults;
  fixedPct: number;
}) {
  const eff = draftEffectivePercents(percents, defaults);
  const percentSum = PERCENT_FIELDS.reduce((acc, { key }) => acc + eff[key], 0) + fixedPct;
  return (
    <div>
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
                    onClick={() => onChange({ ...percents, [key]: "" })}
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
                  onChange={(e) => onChange({ ...percents, [key]: e.target.value })}
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
          Total sobre o preço: <span className="font-medium tabular-nums">{pct(percentSum)}</span>
        </span>
      </div>
    </div>
  );
}

/* ───────────── Pequenos blocos ───────────── */

export function LabeledMobile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1 md:space-y-0">
      <span className="text-[11px] text-muted-foreground md:hidden">{label}</span>
      {children}
    </div>
  );
}

export function Row({
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

export const formatMarkup = (v: number) => `${v.toFixed(2).replace(".", ",")}x`;
