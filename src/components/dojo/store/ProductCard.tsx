import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  compare_at_price?: number | string | null;
  image_url?: string | null;
  category_name?: string | null;
  featured?: boolean | null;
  created_at?: string | null;
};

export function ProductCard({
  product,
  className,
  onClick,
}: {
  product: ProductCardData;
  className?: string;
  onClick?: () => void;
}) {
  const price = Number(product.price);
  const compare = product.compare_at_price ? Number(product.compare_at_price) : null;
  const hasDiscount = compare && compare > price;
  const isNew =
    product.created_at &&
    Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;

  const parcela = price >= 30 ? price / 3 : 0;

  const Content = (
    <>
      <div className="relative aspect-square overflow-hidden bg-[color:var(--dojo-surface-3)]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            Sem imagem
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
              −{Math.round(((compare! - price) / compare!) * 100)}%
            </span>
          )}
          {product.featured && !hasDiscount && (
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-background shadow-sm">
              Destaque
            </span>
          )}
          {isNew && !hasDiscount && !product.featured && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur">
              Novo
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category_name && (
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {product.category_name}
          </div>
        )}
        <div className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
          {product.name}
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">{brl(compare!)}</span>
          )}
          <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
            {brl(price)}
          </span>
        </div>
        {parcela > 0 && (
          <div className="text-[11px] text-muted-foreground">
            ou 3× de <span className="tabular-nums text-foreground">{brl(parcela)}</span> sem juros
          </div>
        )}
      </div>
    </>
  );

  const commonClass = cn(
    "group relative flex flex-col overflow-hidden rounded-2xl border border-[color:var(--dojo-border)] bg-white text-left shadow-[var(--dojo-shadow-xs)] ring-1 ring-inset ring-black/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[var(--dojo-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={commonClass}>
        {Content}
      </button>
    );
  }

  return (
    <Link
      to="/dojo/app/store/produtos/$slug"
      params={{ slug: product.slug }}
      className={commonClass}
    >
      {Content}
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[color:var(--dojo-border)] bg-white">
      <div className="aspect-square animate-pulse bg-[color:var(--dojo-surface-3)]" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
        <div className="h-5 w-1/2 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
      </div>
    </div>
  );
}
