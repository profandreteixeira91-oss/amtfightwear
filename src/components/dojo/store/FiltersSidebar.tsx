import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Sidebar visual de filtros. Não introduz novas queries no servidor:
 * a filtragem por busca/preço é feita 100% no cliente sobre a mesma
 * lista que a rota já buscava (o pai passa "items" e recebe callbacks).
 */
export function FiltersSidebar({
  search,
  onSearchChange,
  min,
  max,
  priceRange,
  onPriceChange,
  onReset,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  min: number;
  max: number;
  priceRange: [number, number];
  onPriceChange: (v: [number, number]) => void;
  onReset: () => void;
}) {
  const [openPrice, setOpenPrice] = useState(true);
  const disabled = min >= max;

  return (
    <aside className="space-y-4 rounded-2xl border border-[color:var(--dojo-border)] bg-white p-5 shadow-[var(--dojo-shadow-xs)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} /> Filtros
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-3 w-3" /> Limpar
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Buscar nesta lista
        </label>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Nome do produto..."
          className="h-10 w-full rounded-full border border-[color:var(--dojo-border)] bg-white px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="border-t border-[color:var(--dojo-border)] pt-4">
        <button
          type="button"
          onClick={() => setOpenPrice((v) => !v)}
          className="flex w-full items-center justify-between text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          Faixa de preço
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              openPrice ? "rotate-180" : "rotate-0",
            )}
            strokeWidth={1.75}
          />
        </button>
        {openPrice && !disabled && (
          <div className="mt-3 space-y-2">
            <div className="flex items-baseline justify-between text-xs text-foreground">
              <span className="tabular-nums">{brl(priceRange[0])}</span>
              <span className="tabular-nums text-muted-foreground">{brl(priceRange[1])}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={priceRange[0]}
              onChange={(e) => {
                const next = Number(e.target.value);
                onPriceChange([Math.min(next, priceRange[1]), priceRange[1]]);
              }}
              className="w-full accent-primary"
              aria-label="Preço mínimo"
            />
            <input
              type="range"
              min={min}
              max={max}
              value={priceRange[1]}
              onChange={(e) => {
                const next = Number(e.target.value);
                onPriceChange([priceRange[0], Math.max(next, priceRange[0])]);
              }}
              className="w-full accent-primary"
              aria-label="Preço máximo"
            />
          </div>
        )}
        {disabled && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Faixa de preço fica disponível quando houver mais de um produto.
          </p>
        )}
      </div>
    </aside>
  );
}
