import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  ZoomIn,
} from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { formatBRL } from "@/lib/store/cart-store";
import { variantLabel, type WholesaleProduct, type WholesaleVariant } from "./WholesaleProductCard";

export type BuilderSub = { key: string; name: string; items: WholesaleProduct[] };
export type BuilderRoot = { id: string; name: string; subs: BuilderSub[] };

type Props = {
  roots: BuilderRoot[];
  variantsOf: (productId: string) => WholesaleVariant[];
  qtyOf: (productId: string, variantId: string | null) => number;
  setQty: (productId: string, variantId: string | null, q: number) => void;
  discountPercentOf: (p: WholesaleProduct) => number;
  subcategoryQty: (subKey: string) => number;
  minPerSubcategory: number;
  activeRoot: string | null;
  onActiveRootChange: (id: string | null) => void;
  onZoom?: (img: { src: string; alt: string }) => void;
  onAdd?: (p: WholesaleProduct, qty: number) => void;
};

const selectClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50";
const labelClass =
  "mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground";

/**
 * Montador de pedidos B2B por etapas: categoria → subcategoria → produto,
 * usando apenas menus dropdown (sem grade de cards) e um painel de compra
 * destacado na mesma página. Nenhuma regra de negócio vive aqui — todo
 * cálculo de quantidade/preço/mínimo continua na rota.
 */
export function WholesaleBuilder({
  roots,
  variantsOf,
  qtyOf,
  setQty,
  discountPercentOf,
  subcategoryQty,
  minPerSubcategory,
  activeRoot,
  onActiveRootChange,
  onZoom,
  onAdd,
}: Props) {
  const [subKey, setSubKey] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  const root = roots.find((r) => r.id === activeRoot) ?? null;
  const sub = root?.subs.find((s) => s.key === subKey) ?? null;
  const product = sub?.items.find((p) => p.id === productId) ?? null;

  // Auto-avança quando existe apenas uma opção, mantendo o fluxo mais curto.
  useEffect(() => {
    if (!root) {
      setSubKey(null);
      setProductId(null);
      return;
    }
    if (!root.subs.some((s) => s.key === subKey)) {
      setSubKey(root.subs.length === 1 ? root.subs[0].key : null);
      setProductId(null);
    }
  }, [root, subKey]);

  useEffect(() => {
    if (!sub) {
      setProductId(null);
      return;
    }
    if (!sub.items.some((p) => p.id === productId)) {
      setProductId(sub.items.length === 1 ? sub.items[0].id : null);
    }
  }, [sub, productId]);

  const subQty = sub ? subcategoryQty(sub.key) : 0;
  const subOk = subQty >= minPerSubcategory;

  return (
    <section className="space-y-4" aria-labelledby="montador-atacado">
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="montador-atacado" className="text-lg font-black">
              Monte seu pedido em 3 passos
            </h2>
            <p className="text-sm text-muted-foreground">
              Escolha a categoria, a subcategoria e o produto. Sem rolagem infinita.
            </p>
          </div>
          {sub && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${
                subQty === 0
                  ? "bg-muted text-muted-foreground"
                  : subOk
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {subQty === 0 ? (
                <>Mínimo {minPerSubcategory} un.</>
              ) : subOk ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {subQty} un. · OK
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" /> {subQty}/{minPerSubcategory} un.
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <span className={labelClass}>
              <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-[9px] text-primary">1</span>
              Categoria
            </span>
            <select
              aria-label="Categoria"
              className={selectClass}
              value={activeRoot ?? ""}
              onChange={(e) => onActiveRootChange(e.target.value || null)}
            >
              <option value="">Selecione a categoria</option>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={labelClass}>
              <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-[9px] text-primary">2</span>
              Subcategoria
            </span>
            <select
              aria-label="Subcategoria"
              className={selectClass}
              disabled={!root}
              value={subKey ?? ""}
              onChange={(e) => {
                setSubKey(e.target.value || null);
                setProductId(null);
              }}
            >
              <option value="">{root ? "Selecione a subcategoria" : "Escolha a categoria"}</option>
              {(root?.subs ?? []).map((s) => {
                const q = subcategoryQty(s.key);
                return (
                  <option key={s.key} value={s.key}>
                    {s.name}
                    {q > 0 ? ` · ${q} un.` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <span className={labelClass}>
              <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/10 text-[9px] text-primary">3</span>
              Produto
            </span>
            <select
              aria-label="Produto"
              className={selectClass}
              disabled={!sub}
              value={productId ?? ""}
              onChange={(e) => setProductId(e.target.value || null)}
            >
              <option value="">{sub ? "Selecione o produto" : "Escolha a subcategoria"}</option>
              {(sub?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <span>{root?.name ?? "Categoria"}</span>
          <ChevronRight className="h-3 w-3" />
          <span>{sub?.name ?? "Subcategoria"}</span>
          <ChevronRight className="h-3 w-3" />
          <span className={product ? "text-primary" : undefined}>{product?.name ?? "Produto"}</span>
        </div>
      </div>

      {product ? (
        <BuyPanel
          key={product.id}
          product={product}
          variants={variantsOf(product.id)}
          qtyOf={(vid) => qtyOf(product.id, vid)}
          setQty={(vid, q) => setQty(product.id, vid, q)}
          discountPercent={discountPercentOf(product)}
          categoryName={sub?.name ?? null}
          minPerSubcategory={minPerSubcategory}
          onZoom={onZoom}
          onAdd={onAdd}
        />
      ) : (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Selecione um produto acima para abrir a área de compra.
        </div>
      )}
    </section>
  );
}

/** Área de compra destacada — tamanhos, quantidade e subtotal do produto atual. */
function BuyPanel({
  product: p,
  variants: vs,
  qtyOf,
  setQty,
  discountPercent,
  categoryName,
  minPerSubcategory,
  onZoom,
  onAdd,
}: {
  product: WholesaleProduct;
  variants: WholesaleVariant[];
  qtyOf: (variantId: string | null) => number;
  setQty: (variantId: string | null, q: number) => void;
  discountPercent: number;
  categoryName: string | null;
  minPerSubcategory: number;
  onZoom?: (img: { src: string; alt: string }) => void;
  onAdd?: (p: WholesaleProduct, qty: number) => void;
}) {
  const hasVariants = vs.length > 0;
  const basePrice = Number(p.price);
  const unitWholesale = basePrice * (1 - discountPercent / 100);
  const total = hasVariants ? vs.reduce((a, v) => a + qtyOf(v.id), 0) : qtyOf(null);

  const selectedIds = useMemo(() => vs.filter((v) => qtyOf(v.id) > 0).map((v) => v.id), [vs, qtyOf]);
  const rows: (string | null)[] = [...selectedIds];
  if (vs.some((v) => qtyOf(v.id) === 0)) rows.push(null);

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-primary bg-background shadow-lg ring-4 ring-primary/10">
      <header className="flex items-center justify-between gap-3 border-b bg-primary/5 px-4 py-2.5">
        <span className="text-[11px] font-black uppercase tracking-widest text-primary">
          Área de compra
        </span>
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
          {discountPercent}% OFF
        </span>
      </header>

      <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="relative mx-auto w-full max-w-xs">
          <ProductImage src={p.image_url} alt={p.name} aspect="square" />
          {p.image_url && onZoom && (
            <button
              type="button"
              onClick={() => onZoom({ src: p.image_url!, alt: p.name })}
              className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow-sm"
              aria-label={`Ampliar imagem de ${p.name}`}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          {categoryName && (
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {categoryName}
            </div>
          )}
          <h3 className="text-xl font-black leading-tight">{p.name}</h3>
          {p.short_description && (
            <p className="text-sm text-muted-foreground">{p.short_description}</p>
          )}

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-muted-foreground line-through">{formatBRL(basePrice)}</span>
            <span className="text-2xl font-black text-primary">{formatBRL(unitWholesale)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              /un. no atacado
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden /> 10 dias úteis
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              <Sparkles className="h-3 w-3" aria-hidden /> Personalizável
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              mín. {minPerSubcategory} un. por subcategoria
            </span>
          </div>

          {hasVariants ? (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Escolha o tamanho ({vs.length} disponíveis)
              </div>
              {rows.map((vid, idx) => {
                const v = vid ? vs.find((vv) => vv.id === vid) ?? null : null;
                const vq = v ? qtyOf(v.id) : 0;
                const selectId = `buy-size-${p.id}-${vid ?? `new-${idx}`}`;
                return (
                  <div
                    key={vid ?? `add-${idx}`}
                    className={`grid gap-2 rounded-lg border p-2.5 sm:grid-cols-2 ${
                      vq > 0 ? "border-primary/50 bg-primary/5" : "border-dashed"
                    }`}
                  >
                    <div className="min-w-0">
                      <label htmlFor={selectId} className={labelClass}>
                        Tamanho
                      </label>
                      <select
                        id={selectId}
                        value={vid ?? ""}
                        className={selectClass}
                        onChange={(e) => {
                          const newId = e.target.value || null;
                          if (newId === vid) return;
                          if (v) setQty(v.id, 0);
                          if (newId) setQty(newId, vq > 0 ? vq : 1);
                        }}
                      >
                        <option value="">Selecione o tamanho</option>
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
                    </div>
                    <div className="min-w-0">
                      <span className={labelClass}>Quantidade</span>
                      <QtyStepper
                        value={vq}
                        disabled={!v}
                        onChange={(q) => v && setQty(v.id, q)}
                        ariaLabel={`Quantidade de ${p.name}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="max-w-xs">
              <span className={labelClass}>Quantidade</span>
              <QtyStepper
                value={qtyOf(null)}
                onChange={(q) => setQty(null, q)}
                ariaLabel={`Quantidade de ${p.name}`}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">{total} un. · subtotal </span>
              <strong className="text-lg font-black text-primary">
                {formatBRL(unitWholesale * total)}
              </strong>
            </div>
            <button
              type="button"
              disabled={total === 0}
              onClick={() => onAdd?.(p, total)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden /> Adicionar ao pedido
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function QtyStepper({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (q: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value === 0}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border hover:bg-accent disabled:opacity-40"
        aria-label="Diminuir quantidade"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-11 min-w-0 flex-1 rounded-lg border bg-background text-center text-sm font-semibold outline-none focus:border-primary disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border hover:bg-accent disabled:opacity-40"
        aria-label="Aumentar quantidade"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
