import { Link } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { useRecentProducts } from "@/lib/store/recent";
import { formatMoney } from "@/lib/store/pricing";

/** Vitrine "Vistos recentemente" — aparece somente quando há histórico local. */
export function RecentlyViewed({ excludeId, title = "Vistos recentemente" }: { excludeId?: string; title?: string }) {
  const items = useRecentProducts(excludeId);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed" className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 id="recently-viewed" className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((p) => (
          <Link
            key={p.id}
            to="/loja/produto/$slug"
            params={{ slug: p.slug }}
            className="group w-36 shrink-0 snap-start sm:w-40"
          >
            <div className="overflow-hidden rounded-xl border bg-background">
              <ProductImage
                src={p.image_url}
                alt={p.name}
                aspect="square"
                imgClassName="transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug">{p.name}</p>
            <p className="text-xs font-black text-primary">{formatMoney(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
