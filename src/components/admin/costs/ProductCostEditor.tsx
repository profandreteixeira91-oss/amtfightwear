import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Target } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import type { useConfirm } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { brl, pct } from "@/lib/format";
import { PIX_DISCOUNT_RATE } from "@/lib/store/pricing";
import {
  analyzePrice,
  breakEvenPrice,
  idealPrice,
  parseDecimal,
  productionCost,
  roundToNinety,
} from "@/lib/store/product-costs";
import {
  adminApplyProductPrices,
  adminSaveProductCosts,
  type CostWorkspace,
  type CostWorkspaceProduct,
} from "@/lib/store/product-costs.functions";
import {
  COSTS_QUERY_KEY,
  CostItemsEditor,
  PercentsEditor,
  Row,
  draftEffectivePercents,
  draftToPayload,
  formatMarkup,
  parseDraftItems,
  serializeDraft,
  toDraftItems,
  toDraftPercents,
  toField,
  type DraftItem,
  type DraftPercents,
} from "@/components/admin/costs/cost-shared";

/** Ficha de custo, preço ideal, lucro e projeção de um produto. */
export function ProductCostEditor({
  product,
  categoryName,
  workspace,
  fixedPct,
  onDirtyChange,
  confirm,
}: {
  product: CostWorkspaceProduct;
  categoryName: string | null;
  workspace: CostWorkspace;
  fixedPct: number;
  onDirtyChange: (dirty: boolean) => void;
  confirm: ReturnType<typeof useConfirm>[0];
}) {
  const queryClient = useQueryClient();
  const saveCosts = useServerFn(adminSaveProductCosts);
  const applyPrices = useServerFn(adminApplyProductPrices);
  const defaults = workspace.defaults;

  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(product.items));
  const [percents, setPercents] = useState<DraftPercents>(() => toDraftPercents(product.percents));
  const [baseline, setBaseline] = useState(() => serializeDraft(items, percents));
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const months = workspace.sales.window_days / 30;
  const avgMonthlyUnits = product.units_sold / months;
  const [monthlyQty, setMonthlyQty] = useState(() =>
    String(avgMonthlyUnits > 0 ? Math.max(1, Math.round(avgMonthlyUnits)) : 10),
  );
  const [simulated, setSimulated] = useState("");

  const dirty = serializeDraft(items, percents) !== baseline;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const cost = productionCost(parseDraftItems(items));
  const eff = draftEffectivePercents(percents, defaults);
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

  const copySources = workspace.products
    .filter((p) => p.id !== product.id && p.items.length > 0)
    .map((p) => ({ id: p.id, name: p.name, cost: p.cost }));

  async function copyFrom(id: string) {
    const src = workspace.products.find((p) => p.id === id);
    if (!src) return;
    if (
      items.length > 0 &&
      !(await confirm({
        title: `Copiar a ficha de "${src.name}"?`,
        description:
          "Os itens atuais desta ficha serão substituídos. Nada é salvo até você clicar em Salvar.",
        confirmLabel: "Copiar",
      }))
    )
      return;
    setItems(toDraftItems(src.items));
  }

  async function save() {
    const payload = draftToPayload(items, percents);
    if ("error" in payload) return toast.error(payload.error);
    setSaving(true);
    try {
      await saveCosts({ data: { product_id: product.id, ...payload } });
      setBaseline(serializeDraft(items, percents));
      toast.success("Custos salvos");
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message || "Erro ao salvar os custos");
    } finally {
      setSaving(false);
    }
  }

  async function apply(price: number) {
    const own = product.variant_prices.length;
    const ok = await confirm({
      title: `Mudar o preço na loja para ${brl(price)}?`,
      description: `${product.name}: de ${brl(product.price)} para ${brl(price)}. O novo preço aparece na vitrine na hora, junto com as variações que acompanham o preço do produto.${
        own > 0
          ? ` ${own} ${own === 1 ? "variação tem preço próprio e não muda" : "variações têm preço próprio e não mudam"}: ajuste em Produtos.`
          : ""
      }`,
      confirmLabel: "Mudar preço",
    });
    if (!ok) return;
    setApplying(true);
    try {
      await applyPrices({ data: { items: [{ product_id: product.id, price }] } });
      toast.success(`Preço atualizado para ${brl(price)}`);
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["admin", "store", "products"] });
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

  const variantRange =
    product.variant_prices.length > 0
      ? [Math.min(...product.variant_prices), Math.max(...product.variant_prices)]
      : null;

  return (
    <div className="space-y-4">
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
              {[categoryName ?? "Sem categoria", product.sku].filter(Boolean).join(" · ")} · preço
              atual {brl(product.price)}
              {variantRange
                ? ` · tamanhos com preço próprio: ${
                    variantRange[0] === variantRange[1]
                      ? brl(variantRange[0])
                      : `${brl(variantRange[0])} a ${brl(variantRange[1])}`
                  }`
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
          <SectionCard
            title="Custo de produção por peça"
            description="Tudo que entra na fabricação de uma unidade. A perda soma o desperdício (ex.: 10% de sobra de tecido)."
          >
            <CostItemsEditor
              items={items}
              onChange={setItems}
              copySources={copySources}
              onCopyFrom={copyFrom}
            />
          </SectionCard>

          <SectionCard
            title="Despesas sobre a venda e lucro"
            description="Percentuais do preço de venda. Em branco usa o padrão da loja (Parâmetros)."
          >
            <PercentsEditor
              percents={percents}
              onChange={setPercents}
              defaults={defaults}
              fixedPct={fixedPct}
            />
          </SectionCard>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
              <Target className="h-3.5 w-3.5" /> Preço ideal
            </div>
            {cost <= 0 ? (
              <p className="mt-2 text-sm text-white/70">
                Preencha o custo de produção para calcular.
              </p>
            ) : ideal === null || idealRounded === null ? (
              <p className="mt-2 text-sm text-red-300">
                Os percentuais somam 100% ou mais do preço: não existe preço que cubra tudo. Reduza
                algum deles.
              </p>
            ) : (
              <>
                <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                  {brl(idealRounded)}
                </div>
                <div className="mt-1 text-xs text-white/60 tabular-nums">
                  Exato {brl(ideal)} · markup {formatMarkup(ideal / cost)} · lucro{" "}
                  {brl(analyzePrice(idealRounded, cost, eff, fixedPct).profit)} por peça
                </div>
                {Math.abs(idealRounded - product.price) >= 0.01 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    disabled={applying || dirty}
                    title={dirty ? "Salve os custos antes de mudar o preço" : undefined}
                    onClick={() => apply(idealRounded)}
                  >
                    {dirty ? "Salve os custos para aplicar" : `Usar ${brl(idealRounded)} na loja`}
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
                    <Row label="Markup" value={formatMarkup(current.markup)} />
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
