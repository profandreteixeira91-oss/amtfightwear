import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl, pct } from "@/lib/format";
import { parseDecimal } from "@/lib/store/product-costs";
import {
  adminSaveFixedExpenses,
  adminSavePricingDefaults,
  type CostWorkspace,
} from "@/lib/store/product-costs.functions";
import { COSTS_QUERY_KEY, newKey, toField } from "@/components/admin/costs/cost-shared";

/** Parâmetros da loja: percentuais padrão, despesas fixas e rateio. */
export function SettingsSheet({
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
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
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
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
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
