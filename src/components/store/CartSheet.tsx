import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, ArrowRight, ShoppingBag, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProductImage } from "@/components/store/ProductImage";
import { useCart, formatBRL } from "@/lib/store/cart-store";

export function CartSheet() {
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQuantity = useCart((s) => s.setQuantity);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const count = items.reduce((a, i) => a + i.quantity, 0);

  if (!mounted) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between border-b px-5 py-4 text-left space-y-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5" />
            Seu carrinho
            {count > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{count}</span>
            )}
          </SheetTitle>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Fechar carrinho"
          >
            <X className="h-5 w-5" />
          </button>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Seu carrinho está vazio.</p>
            <button
              type="button"
              onClick={close}
              className="rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90"
            >
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.map((i, idx) => (
                <div key={`${i.product_id}-${i.variant_id ?? ""}-${idx}`} className="flex gap-3 rounded-lg border bg-card p-3">
                  <ProductImage src={i.image_url} alt={i.name} aspect="square" className="h-20 w-20 shrink-0 rounded" />
                  <div className="flex flex-1 flex-col">
                    <div className="text-sm font-semibold leading-tight">{i.name}</div>
                    {i.variant_label && <div className="text-[11px] text-muted-foreground">{i.variant_label}</div>}
                    {i.type === "custom" && (
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">Custom</span>
                        {i.production_days && (
                          <span className="text-muted-foreground">Produção em {i.production_days}d</span>
                        )}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-md border text-sm">
                        <button onClick={() => setQuantity(i.product_id, i.variant_id, i.quantity - 1)} className="px-2 py-0.5">−</button>
                        <div className="w-7 text-center">{i.quantity}</div>
                        <button onClick={() => setQuantity(i.product_id, i.variant_id, i.quantity + 1)} className="px-2 py-0.5">+</button>
                      </div>
                      <div className="text-sm font-bold">{formatBRL(i.unit_price * i.quantity)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(i.product_id, i.variant_id)}
                    className="self-start text-muted-foreground hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t bg-card px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatBRL(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-base font-black">
                <span>Total</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                ou 10x de <strong>{formatBRL(subtotal / 10)}</strong> sem juros · frete no checkout
              </div>
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                  <span>🚀 UPSELL EXCLUSIVO</span>
                  <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] text-white">RECOMENDADO</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-background">
                    <img 
                      src="https://hhrumnnxrwxnandvqnmx.supabase.co/storage/v1/object/public/products/faixa-preta-premium.jpg" 
                      alt="Faixa Premium"
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=Faixa")}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-bold">Faixa Premium AMT</div>
                    <div className="text-[10px] text-muted-foreground">Adicione e ganhe 10% OFF nela</div>
                  </div>
                  <button 
                    type="button"
                    className="rounded bg-primary px-3 py-1.5 text-[10px] font-bold text-white hover:opacity-90"
                  >
                    + R$ 89
                  </button>
                </div>
              </div>
              <Link
                to="/loja/checkout"
                onClick={close}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90"
              >
                Finalizar compra <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={close}
                className="mt-2 block w-full text-center text-sm text-muted-foreground hover:text-primary"
              >
                Continuar comprando
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
