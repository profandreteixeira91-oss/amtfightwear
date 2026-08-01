import { cn } from "@/lib/utils";

/** Skeleton de card de produto — evita CLS enquanto a vitrine carrega. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse overflow-hidden rounded-2xl border bg-background", className)} aria-hidden>
      <div className="aspect-square w-full bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Carregando produtos">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid animate-pulse gap-8 lg:grid-cols-2" role="status" aria-label="Carregando produto">
      <div className="aspect-square rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-6 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-10 w-1/2 rounded bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
        <div className="h-12 w-full rounded bg-muted" />
      </div>
    </div>
  );
}
