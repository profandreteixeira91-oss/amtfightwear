import { Minus, Plus, ZoomIn, ShoppingBag, Clock, Sparkles } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { formatBRL } from "@/lib/store/cart-store";

export type WholesaleVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  option_label: string | null;
  sku: string | null;
  price: number | string | null;
  sort_order: number;
  active: boolean;
};

export type WholesaleProduct = {
  id: string;
  name: string;
  slug: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  category_id: string | null;
  short_description: string | null;
  wholesale_discount_percent?: number | string | null;
};

export const variantLabel = (v: WholesaleVariant) => {
  const raw = (v.size ?? v.option_label ?? v.color ?? "Único").replace(/^tamanho:\s*/i, "").trim();
  const m = raw.match(/^([A-Za-z0-9/]+)\s*[-–—]\s*(.+)$/);
  const code = (m?.[1] ?? raw).toUpperCase();
  const detail = m?.[2] ?? "";
  return { code, detail, full: detail ? `${code} · ${detail}` : code };
};

type Props = {
  product: WholesaleProduct;
  variants: WholesaleVariant[];
  /** Quantidade por variante (null = produto sem variantes) */
  qtyOf: (variantId: string | null) => number;
  setQty: (variantId: string | null, q: number) => void;
  discountPercent: number;
  categoryName?: string | null;
  minPerSubcategory: number;
  onZoom?: (img: { src: string; alt: string }) => void;
  onAdd?: () => void;
};

/** Card de produto do montador de pedidos B2B. Apenas apresentação — toda a
 *  lógica de quantidade/preço continua no componente da página. */
export function WholesaleProductCard({
  product: p,
  variants: vs,
  qtyOf,
  setQty,
  discountPercent,
  categoryName,
  minPerSubcategory,
  onZoom,
  onAdd,
}: Props) {
  const hasVariants = vs.length > 0;
  const totalForProduct = hasVariants
    ? vs.reduce((a, v) => a + qtyOf(v.id), 0)
    : qtyOf(null);
  const basePrice = Number(p.price);
  const unitWholesale = basePrice * (1 - discountPercent / 100);
  const selected = totalForProduct > 0;

  const selectedIds = vs.filter((v) => qtyOf(v.id) > 0).map((v) => v.id);
  const availableIds = vs.filter((v) => qtyOf(v.id) === 0).map((v) => v.id);
  const rows: (string | null)[] = [...selectedIds];
  if (availableIds.length > 0) rows.push(null);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-background transition-all duration-200 ${
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
      }`}
    >
      <div className="relative">
        <ProductImage src={p.image_url} alt={p.name} aspect="square" />
        {p.image_url && onZoom && (
          <button
            type="button"
            onClick={() => onZoom({ src: p.image_url!, alt: p.name })}
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 opacity-0 shadow-sm transition focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Ampliar imagem de ${p.name}`}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
            {discountPercent}% OFF
          </span>
          {selected && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase text-background">
              {totalForProduct} un. no pedido
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {categoryName && (
          <div className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {categoryName}
          </div>
        )}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{p.name}</h3>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs text-muted-foreground line-through">{formatBRL(basePrice)}</span>
          <span className="text-base font-black text-primary">{formatBRL(unitWholesale)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">/un.</span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden /> 10 dias úteis
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            <Sparkles className="h-3 w-3" aria-hidden /> Personalizável
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            mín. {minPerSubcategory} un.
          </span>
        </div>

        {hasVariants ? (
          <div className="mt-1 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tamanhos ({vs.length} disponíveis)
            </div>
            <div className="space-y-1">
              {rows.map((vid, idx) => {
                const v = vid ? vs.find((vv) => vv.id === vid) ?? null : null;
                const vq = v ? qtyOf(v.id) : 0;
                return (
                  <div
                    key={vid ?? `add-${idx}`}
                    className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${
                      vq > 0 ? "border-primary/50 bg-primary/5" : "border-dashed"
                    }`}
                  >
                    <select
                      value={vid ?? ""}
                      aria-label={`Tamanho de ${p.name}`}
                      onChange={(e) => {
                        const newId = e.target.value || null;
                        if (newId === vid) return;
                        if (v) setQty(v.id, 0);
                        if (newId) setQty(newId, vq > 0 ? vq : 1);
                      }}
                      className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                    >
                      <option value="">Tamanho</option>
                      {vs.map((opt) => {
                        const { full } = variantLabel(opt);
                        const taken = qtyOf(opt.id) > 0 && opt.id !== vid;
                        return (
                          <option key={opt.id} value={opt.id} disabled={taken}>
                            {full}
                            {taken ? " (já adicionado)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => v && setQty(v.id, vq - 1)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border hover:bg-accent disabled:opacity-40"
                      disabled={!v || vq === 0}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={vq}
                      disabled={!v}
                      aria-label="Quantidade"
                      onChange={(e) => v && setQty(v.id, Number(e.target.value) || 0)}
                      className="h-8 w-12 shrink-0 rounded-md border bg-background text-center text-sm outline-none focus:border-primary disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => v && setQty(v.id, vq + 1)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border hover:bg-accent disabled:opacity-40"
                      disabled={!v}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQty(null, qtyOf(null) - 1)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border hover:bg-accent disabled:opacity-40"
              disabled={qtyOf(null) === 0}
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              value={qtyOf(null)}
              aria-label={`Quantidade de ${p.name}`}
              onChange={(e) => setQty(null, Number(e.target.value) || 0)}
              className="h-10 min-w-0 flex-1 rounded-lg border bg-background text-center text-sm font-semibold outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setQty(null, qtyOf(null) + 1)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border hover:bg-accent"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {totalForProduct > 0 && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-baseline justify-between rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground">{totalForProduct} un. · subtotal</span>
              <span className="font-black text-primary">{formatBRL(unitWholesale * totalForProduct)}</span>
            </div>
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:opacity-90"
            >
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden /> Adicionar ao pedido
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
