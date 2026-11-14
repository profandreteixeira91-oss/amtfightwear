import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Layers, Target } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import type { useConfirm } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { brl, pct } from "@/lib/format";
import {
  analyzePrice,
  idealPrice,
  productionCost,
  roundToNinety,
  type PricingPercents,
} from "@/lib/store/product-costs";
import {
  adminApplyCategoryCosts,
  adminApplyProductPrices,
  type CostWorkspace,
  type CostWorkspaceProduct,
} from "@/lib/store/product-costs.functions";
import {
  COSTS_QUERY_KEY,
  CostItemsEditor,
  HealthPill,
  PercentsEditor,
  draftEffectivePercents,
  draftToPayload,
  effectivePercents,
  emptyDraftPercents,
  formatMarkup,
  parseDraftItems,
  productHealth,
  serializeDraft,
  toDraftItems,
  toDraftPercents,
  type DraftItem,
  type DraftPercents,
} from "@/components/admin/costs/cost-shared";

const sheetKey = (items: CostWorkspaceProduct["items"]) =>
  JSON.stringify(
    items.map((i) => [i.name, i.type, i.quantity, i.unit_cost, i.waste_percent, i.unit_of_measure]),
  );

/**
 * Ficha de custo de uma categoria inteira: monta uma ficha (partindo da mais usada entre os
 * produtos da categoria), aplica nos produtos escolhidos e, depois, o preço ideal de cada um.
 */
export function CategoryCostEditor({
  categoryName,
  products,
  workspace,
  fixedPct,
  onDirtyChange,
  confirm,
}: {
  categoryName: string;
  products: CostWorkspaceProduct[];
  workspace: CostWorkspace;
  fixedPct: number;
  onDirtyChange: (dirty: boolean) => void;
  confirm: ReturnType<typeof useConfirm>[0];
}) {
  const queryClient = useQueryClient();
  const applyCosts = useServerFn(adminApplyCategoryCosts);
  const applyPrices = useServerFn(adminApplyProductPrices);
  const defaults = workspace.defaults;

  // Modelo inicial: a ficha que mais se repete entre os produtos da categoria.
  const model = useMemo(() => {
    const groups = new Map<string, CostWorkspaceProduct[]>();
    for (const p of products) {
      if (p.items.length === 0) continue;
      const k = sheetKey(p.items);
      groups.set(k, [...(groups.get(k) ?? []), p]);
    }
    const best = [...groups.values()].sort((a, b) => b.length - a.length)[0];
    return best ? { product: best[0], count: best.length } : null;
    // Só na montagem: depois de aplicar, o rascunho continua sendo o que o usuário editou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [items, setItems] = useState<DraftItem[]>(() =>
    model ? toDraftItems(model.product.items) : [],
  );
  const [percents, setPercents] = useState<DraftPercents>(() =>
    model ? toDraftPercents(model.product.percents) : emptyDraftPercents(),
  );
  const [withPercents, setWithPercents] = useState(true);
  const [baseline, setBaseline] = useState(() => serializeDraft(items, percents));
  const [selected, setSelected] = useState<Set<string>>(() => {
    const noSheet = products.filter((p) => p.items.length === 0).map((p) => p.id);
    return new Set(noSheet.length > 0 ? noSheet : products.map((p) => p.id));
  });
  const [busy, setBusy] = useState<"costs" | "prices" | null>(null);

  const dirty = serializeDraft(items, percents) !== baseline;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const cost = productionCost(parseDraftItems(items));
  const draftEff = draftEffectivePercents(percents, defaults);
  const sheetIdeal = idealPrice(cost, draftEff, fixedPct);

  const rows = products.map((p) => {
    const eff: PricingPercents = withPercents ? draftEff : effectivePercents(p.percents, defaults);
    const ideal = idealPrice(cost, eff, fixedPct);
    const after = cost > 0 ? analyzePrice(p.price, cost, eff, fixedPct) : null;
    return {
      product: p,
      ideal: ideal === null ? null : roundToNinety(ideal),
      after,
      before: productHealth(p, defaults, fixedPct),
      sheetApplied: p.items.length > 0 && Math.abs(p.cost - cost) < 0.005,
    };
  });
  const selectedRows = rows.filter((r) => selected.has(r.product.id));
  const pricable = selectedRows.filter(
    (r) => r.sheetApplied && r.ideal !== null && Math.abs(r.ideal - r.product.price) >= 0.01,
  );
  const notApplied = selectedRows.filter((r) => !r.sheetApplied).length;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const selectWhere = (pred: (p: CostWorkspaceProduct) => boolean) =>
    setSelected(new Set(products.filter(pred).map((p) => p.id)));

  async function submitCosts() {
    const payload = draftToPayload(items, percents);
    if ("error" in payload) return toast.error(payload.error);
    if (payload.items.length === 0) return toast.error("Adicione ao menos um item de custo.");
    if (selected.size === 0) return toast.error("Escolha os produtos que recebem a ficha.");
    const replacing = selectedRows.filter((r) => r.product.items.length > 0).length;
    const ok = await confirm({
      title: `Aplicar a ficha em ${selected.size} ${selected.size === 1 ? "produto" : "produtos"}?`,
      description: `Custo por peça ${brl(cost)}${withPercents ? ", com os percentuais desta ficha" : ""}.${
        replacing > 0
          ? ` ${replacing} ${replacing === 1 ? "produto já tem ficha e ela será substituída" : "produtos já têm ficha e elas serão substituídas"}.`
          : ""
      } Os preços da loja não mudam agora.`,
      confirmLabel: "Aplicar ficha",
    });
    if (!ok) return;
    setBusy("costs");
    try {
      const res = await applyCosts({
        data: {
          product_ids: [...selected],
          items: payload.items,
          ...(withPercents ? { percents: payload.percents } : {}),
        },
      });
      setBaseline(serializeDraft(items, percents));
      toast.success(`Ficha aplicada em ${res.count} ${res.count === 1 ? "produto" : "produtos"}`);
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message || "Erro ao aplicar a ficha");
    } finally {
      setBusy(null);
    }
  }

  async function submitPrices() {
    if (pricable.length === 0) return;
    const up = pricable.filter((r) => r.ideal! > r.product.price).length;
    const down = pricable.length - up;
    const ok = await confirm({
      title: `Usar o preço ideal em ${pricable.length} ${pricable.length === 1 ? "produto" : "produtos"}?`,
      description: `${up} ${up === 1 ? "sobe" : "sobem"} e ${down} ${down === 1 ? "desce" : "descem"}. Os novos preços aparecem na vitrine na hora, junto com as variações que acompanham o preço do produto; preços próprios por tamanho não mudam.`,
      confirmLabel: "Mudar preços",
    });
    if (!ok) return;
    setBusy("prices");
    try {
      const res = await applyPrices({
        data: { items: pricable.map((r) => ({ product_id: r.product.id, price: r.ideal! })) },
      });
      toast.success(
        `${res.updated} ${res.updated === 1 ? "preço atualizado" : "preços atualizados"}${
          res.ownPriced > 0 ? ` · ${res.ownPriced} variações com preço próprio mantidas` : ""
        }`,
      );
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message || "Erro ao mudar os preços");
    } finally {
      setBusy(null);
    }
  }

  const withSheet = products.filter((p) => p.items.length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-neutral-100">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{categoryName}</div>
            <div className="text-xs text-muted-foreground">
              {products.length} {products.length === 1 ? "produto" : "produtos"} · {withSheet} com
              ficha de custo
              {model && model.count > 1
                ? ` · ficha carregada de "${model.product.name}" (igual em ${model.count})`
                : model
                  ? ` · ficha carregada de "${model.product.name}"`
                  : ""}
            </div>
          </div>
        </div>
        {dirty ? (
          <Badge
            variant="outline"
            className="self-start border-amber-300 bg-amber-50 text-amber-800 sm:self-center"
          >
            Ficha não aplicada
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <SectionCard
            title="Ficha de custo da categoria"
            description="Os mesmos itens de custo para todos os produtos escolhidos abaixo."
          >
            <CostItemsEditor items={items} onChange={setItems} />
          </SectionCard>

          <SectionCard
            title="Despesas sobre a venda e lucro"
            description="Em branco usa o padrão da loja."
            action={
              <div className="flex items-center gap-2">
                <Switch
                  id="cat-with-percents"
                  checked={withPercents}
                  onCheckedChange={setWithPercents}
                />
                <Label htmlFor="cat-with-percents" className="text-xs">
                  Aplicar nos produtos
                </Label>
              </div>
            }
          >
            <div className={cn(!withPercents && "pointer-events-none opacity-50")}>
              <PercentsEditor
                percents={percents}
                onChange={setPercents}
                defaults={defaults}
                fixedPct={fixedPct}
              />
            </div>
            {!withPercents ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Desligado: cada produto mantém os próprios percentuais.
              </p>
            ) : null}
          </SectionCard>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
              <Target className="h-3.5 w-3.5" /> Preço ideal da categoria
            </div>
            {cost <= 0 ? (
              <p className="mt-2 text-sm text-white/70">Preencha a ficha para calcular.</p>
            ) : sheetIdeal === null ? (
              <p className="mt-2 text-sm text-red-300">
                Os percentuais somam 100% ou mais do preço. Reduza algum deles.
              </p>
            ) : (
              <>
                <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                  {brl(roundToNinety(sheetIdeal))}
                </div>
                <div className="mt-1 text-xs text-white/60 tabular-nums">
                  Custo {brl(cost)} · markup {formatMarkup(sheetIdeal / cost)} · lucro{" "}
                  {pct(draftEff.profit)}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-4">
            <Button
              className="w-full"
              onClick={submitCosts}
              disabled={busy !== null || cost <= 0 || selected.size === 0}
            >
              {busy === "costs"
                ? "Aplicando…"
                : `Aplicar ficha em ${selected.size} ${selected.size === 1 ? "produto" : "produtos"}`}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={submitPrices}
              disabled={busy !== null || pricable.length === 0 || dirty}
            >
              {busy === "prices"
                ? "Mudando preços…"
                : `Usar preço ideal em ${pricable.length} ${pricable.length === 1 ? "produto" : "produtos"}`}
            </Button>
            <p className="text-xs text-muted-foreground">
              {dirty
                ? "Aplique a ficha antes de mudar os preços."
                : notApplied > 0
                  ? `${notApplied} dos escolhidos ainda não têm esta ficha: aplique-a para incluí-los na troca de preço.`
                  : "Primeiro a ficha, depois os preços. Cada passo pede confirmação."}
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="Produtos da categoria"
        description="Marque quem recebe a ficha. Lucro e preço ideal já calculados com a ficha acima."
        action={
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => selectWhere(() => true)}
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => selectWhere((p) => p.items.length === 0)}
            >
              Sem ficha
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Nenhum
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-8 pb-2" />
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 text-right font-medium">Custo atual</th>
                <th className="pb-2 text-right font-medium">Preço atual</th>
                <th className="pb-2 text-right font-medium">Lucro hoje</th>
                <th className="pb-2 text-right font-medium">Lucro com a ficha</th>
                <th className="pb-2 text-right font-medium">Preço ideal</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.product.id} className="border-t border-neutral-100">
                  <td className="py-2">
                    <Checkbox
                      checked={selected.has(r.product.id)}
                      onCheckedChange={(v) => toggle(r.product.id, !!v)}
                      aria-label={`Incluir ${r.product.name}`}
                    />
                  </td>
                  <td className="max-w-[240px] py-2">
                    <div className="truncate font-medium">{r.product.name}</div>
                    {r.product.variant_prices.length > 0 ? (
                      <div className="text-[11px] text-muted-foreground">
                        {r.product.variant_prices.length} variações com preço próprio
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 text-right">
                    {r.product.cost > 0 ? brl(r.product.cost) : "—"}
                    {r.sheetApplied ? (
                      <div className="text-[11px] text-emerald-700">ficha aplicada</div>
                    ) : null}
                  </td>
                  <td className="py-2 text-right">{brl(r.product.price)}</td>
                  <td className="py-2 text-right">
                    <HealthPill health={r.before.health} margin={r.before.margin} />
                  </td>
                  <td
                    className={cn(
                      "py-2 text-right",
                      r.after && r.after.profit < 0 && "text-destructive",
                    )}
                  >
                    {r.after ? `${brl(r.after.profit)} (${pct(r.after.margin)})` : "—"}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {r.ideal !== null ? brl(r.ideal) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
