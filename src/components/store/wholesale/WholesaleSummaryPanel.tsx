import { AlertCircle, ArrowRight, Package, ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/store/cart-store";

export type SummaryLine = { key: string; name: string; qty: number; total: number; ok: boolean };

type Props = {
  lines: SummaryLine[];
  totalQty: number;
  subtotalOriginal: number;
  subtotal: number;
  savings: number;
  minPerSubcategory: number;
  canProceed: boolean;
  signedIn: boolean | null;
  onCheckout: () => void;
  onOpenDetails: () => void;
};

/** Resumo do pedido sempre visível (coluna fixa no desktop). */
export function WholesaleSummaryPanel({
  lines,
  totalQty,
  subtotalOriginal,
  subtotal,
  savings,
  minPerSubcategory,
  canProceed,
  signedIn,
  onCheckout,
  onOpenDetails,
}: Props) {
  return (
    <aside
      aria-label="Resumo do pedido"
      className="sticky top-[calc(var(--header-h,140px)+1rem)] rounded-2xl border bg-card p-4 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
        <ShoppingBag className="h-4 w-4 text-primary" aria-hidden /> Seu pedido
        {totalQty > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary tabular-nums">
            {totalQty} un.
          </span>
        )}
      </h2>

      {lines.length === 0 ? (
        <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Selecione produtos para ver o resumo em tempo real.
        </p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {lines.map((l) => (
            <li
              key={l.key}
              className={`rounded-xl border p-2 text-xs ${l.ok ? "" : "border-amber-500/40 bg-amber-500/5"}`}
            >
              <div className="truncate font-semibold">{l.name}</div>
              <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                <span className="tabular-nums">
                  {l.qty} un.{l.ok ? "" : ` · faltam ${minPerSubcategory - l.qty}`}
                </span>
                <span className="font-bold text-foreground">{formatBRL(l.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <dt>Itens</dt>
          <dd className="tabular-nums">{totalQty}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Sem desconto</dt>
          <dd className="line-through tabular-nums">{formatBRL(subtotalOriginal)}</dd>
        </div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <dt>Desconto atacado</dt>
          <dd className="tabular-nums">− {formatBRL(savings)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t pt-2 text-base font-black">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatBRL(subtotal)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted p-2 text-xs text-muted-foreground">
        <Package className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Frete calculado na etapa final · produção em{" "}
          <strong className="text-foreground">10 dias úteis</strong>
        </span>
      </div>

      {!canProceed && lines.length > 0 && (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Mínimo de {minPerSubcategory} unidades por subcategoria para prosseguir.
        </p>
      )}

      <button
        type="button"
        disabled={!canProceed}
        onClick={onCheckout}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {signedIn === false ? "Entrar para finalizar" : "Finalizar pedido"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onOpenDetails}
        className="mt-2 block w-full text-center text-xs font-semibold text-muted-foreground transition hover:text-primary"
      >
        Ver detalhes e etiqueta personalizada
      </button>
    </aside>
  );
}

/** Barra inferior fixa no mobile com o mesmo resumo, recolhida. */
export function WholesaleMobileBar({
  totalQty,
  subtotal,
  savings,
  canProceed,
  onOpenDetails,
  onCheckout,
  signedIn,
}: Pick<Props, "totalQty" | "subtotal" | "savings" | "canProceed" | "onOpenDetails" | "onCheckout" | "signedIn">) {
  if (totalQty === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button type="button" onClick={onOpenDetails} className="min-w-0 flex-1 text-left">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {totalQty} un. · economia {formatBRL(savings)}
          </div>
          <div className="truncate text-base font-black tabular-nums">{formatBRL(subtotal)}</div>
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onCheckout}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          {signedIn === false ? "Entrar" : "Finalizar"} <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
