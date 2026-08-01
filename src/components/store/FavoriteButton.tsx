import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useFavorites } from "@/lib/store/recent";
import { trackStoreEvent, toAnalyticsItem } from "@/lib/store/analytics";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  product: { id: string; name: string; slug: string; image_url?: string | null; price: number };
  className?: string;
  withLabel?: boolean;
}

/** Botão de favoritar com microinteração (escala + preenchimento). */
export function FavoriteButton({ product, className, withLabel = false }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(product);
    trackStoreEvent(added ? "add_to_wishlist" : "remove_from_wishlist", {
      items: [toAnalyticsItem({ id: product.id, name: product.name, price: product.price })],
    });
    toast.success(added ? "Adicionado aos favoritos" : "Removido dos favoritos");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border bg-background px-3 text-sm font-semibold transition-all duration-200 active:scale-95",
        active ? "border-primary text-primary" : "border-input text-muted-foreground hover:text-foreground",
        withLabel ? "min-w-11 px-4" : "w-11 min-w-11",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform", active && "scale-110 fill-current")} />
      {withLabel && <span>{active ? "Favoritado" : "Favoritar"}</span>}
    </button>
  );
}
