import { PartyPopper, TrendingUp } from "lucide-react";
import { formatBRL } from "@/lib/store/cart-store";

type Props = {
  totalQty: number;
  /** Soma das unidades que ainda faltam para liberar o atacado nas subcategorias iniciadas. */
  missingUnits: number;
  minPerSubcategory: number;
  savings: number;
  unlocked: boolean;
};

/** Barra de economia — comunica em tempo real o quanto falta para liberar o atacado. */
export function WholesaleSavingsBar({ totalQty, missingUnits, minPerSubcategory, savings, unlocked }: Props) {
  if (totalQty === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Monte seu pedido:</span> adicione{" "}
        {minPerSubcategory} unidades da mesma subcategoria para liberar o preço de atacado.
      </div>
    );
  }

  const pct = unlocked
    ? 100
    : Math.min(99, Math.round((totalQty / Math.max(1, totalQty + missingUnits)) * 100));

  return (
    <div
      aria-live="polite"
      className={`rounded-2xl border p-4 ${
        unlocked ? "border-emerald-500/40 bg-emerald-500/10" : "border-primary/40 bg-primary/5"
      }`}
    >
      <div className="flex items-start gap-3">
        {unlocked ? (
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : (
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          {unlocked ? (
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              Parabéns. Você desbloqueou o desconto máximo disponível.
            </p>
          ) : (
            <p className="text-sm font-bold text-foreground">
              Você adicionou {totalQty} {totalQty === 1 ? "produto" : "produtos"}. Faltam apenas{" "}
              {missingUnits} {missingUnits === 1 ? "unidade" : "unidades"} para desbloquear o desconto
              de atacado.
            </p>
          )}
          {savings > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Economia estimada: <strong className="text-foreground">{formatBRL(savings)}</strong>
            </p>
          )}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                unlocked ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
