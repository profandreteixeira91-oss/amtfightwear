import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { brl, pct } from "@/lib/format";
import { analyzePrice, parseDecimal } from "@/lib/store/product-costs";
import { adminQuickSaveCosts, type CostWorkspace } from "@/lib/store/product-costs.functions";
import {
  COSTS_QUERY_KEY,
  HealthPill,
  effectivePercents,
  productHealth,
} from "@/components/admin/costs/cost-shared";

/**
 * Preenchimento rápido: uma tabela com todos os produtos e UM campo de custo por peça.
 * O lucro por peça aparece na hora, ao digitar. Produtos com ficha detalhada ficam só leitura
 * (edite pela ficha). Um único botão salva tudo que foi alterado.
 */
export function QuickCostGrid({
  workspace,
  fixedPct,
  onDirtyChange,
}: {
  workspace: CostWorkspace;
  fixedPct: number;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(adminQuickSaveCosts);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [term, setTerm] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    return workspace.products
      .filter((p) => !onlyMissing || !(p.cost > 0) || p.id in drafts)
      .filter(
        (p) => !t || p.name.toLowerCase().includes(t) || (p.sku ?? "").toLowerCase().includes(t),
      );
  }, [workspace.products, term, onlyMissing, drafts]);

  const changed = Object.entries(drafts).filter(([id, v]) => {
    const p = workspace.products.find((x) => x.id === id);
    const n = parseDecimal(v);
    return p && p.items.length <= 1 && n !== null && n >= 0 && Math.abs(n - p.cost) >= 0.005;
  });
  const dirty = changed.length > 0;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  async function saveAll() {
    setSaving(true);
    try {
      const res = await save({
        data: {
          rows: changed.map(([product_id, v]) => ({ product_id, cost: parseDecimal(v) ?? 0 })),
        },
      });
      toast.success(`${res.saved} ${res.saved === 1 ? "custo salvo" : "custos salvos"}`);
      if (res.skipped.length > 0)
        toast.warning(`${res.skipped.length} produto(s) têm ficha detalhada e não foram alterados.`);
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: COSTS_QUERY_KEY });
    } catch (e) {
      toast.error((e as Error).message || "Erro ao salvar os custos");
    } finally {
      setSaving(false);
    }
  }

  const missing = workspace.products.filter((p) => !(p.cost > 0)).length;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">Preenchimento rápido</div>
          <p className="text-sm text-muted-foreground">
            Digite quanto custa produzir cada peça. O lucro aparece na hora.{" "}
            {missing > 0 ? `${missing} produto(s) ainda sem custo.` : "Todos os produtos têm custo."}
          </p>
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar produto ou SKU"
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Só sem custo
        </label>
        <Button onClick={saveAll} disabled={!dirty || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando…" : dirty ? `Salvar ${changed.length}` : "Salvar"}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {onlyMissing
            ? "Nenhum produto sem custo. Desmarque “Só sem custo” para ver todos."
            : "Nenhum produto encontrado."}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {rows.map((p) => {
            const detailed = p.items.length > 1;
            const draft = drafts[p.id];
            const typed = draft !== undefined ? parseDecimal(draft) : null;
            const cost = detailed ? p.cost : (typed ?? p.cost);
            const eff = effectivePercents(p.percents, workspace.defaults);
            const a = cost > 0 ? analyzePrice(p.price, cost, eff, fixedPct) : null;
            const health = productHealth({ ...p, cost }, workspace.defaults, fixedPct);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 basis-40">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">Venda {brl(p.price)}</div>
                </div>
                <div className="w-36">
                  {detailed ? (
                    <div className="text-sm tabular-nums" title="Ficha detalhada: edite em Por produto">
                      {brl(p.cost)} <span className="text-xs text-muted-foreground">(ficha)</span>
                    </div>
                  ) : (
                    <Input
                      inputMode="decimal"
                      aria-label={`Custo por peça de ${p.name}`}
                      placeholder="Custo R$"
                      value={draft ?? (p.cost > 0 ? String(p.cost).replace(".", ",") : "")}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      className="tabular-nums"
                    />
                  )}
                </div>
                <div
                  className={cn("w-32 text-right text-sm tabular-nums", a && a.profit < 0 && "text-destructive")}
                >
                  {a ? (
                    <>
                      <div className="font-semibold">{brl(a.profit)}</div>
                      <div className="text-xs text-muted-foreground">
                        lucro por peça · {pct(a.margin)}
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <HealthPill health={health.health} margin={health.margin} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
