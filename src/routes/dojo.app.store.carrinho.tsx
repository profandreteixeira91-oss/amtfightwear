import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  dsGetCart,
  dsUpdateCartItem,
  dsRemoveCartItem,
  dsClearCart,
  dsHandoffToStoreCheckout,
} from "@/lib/dojo/store/store.functions";

import { Button } from "@/components/ui/button";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import type { ShippingOption } from "@/lib/store/shipping.functions";
import { EmptyState } from "@/components/dojo/store/EmptyState";

export const Route = createFileRoute("/dojo/app/store/carrinho")({
  component: CartPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CartPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetCart);
  const updFn = useServerFn(dsUpdateCartItem);
  const rmFn = useServerFn(dsRemoveCartItem);
  const clrFn = useServerFn(dsClearCart);
  const handoffFn = useServerFn(dsHandoffToStoreCheckout);

  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "cart"],
    queryFn: () => getFn(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });

  const upd = useMutation({
    mutationFn: (v: { id: string; quantity: number }) => updFn({ data: v }),
    onSuccess: (fresh: any) => {
      if (fresh) qc.setQueryData(["dojo-store", "cart"], fresh);
    },
    onError: () => refresh(),
  });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const rm = useMutation({
    mutationFn: (id: string) => rmFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Item removido do carrinho.");
      setRemovingId(null);
    },
    onError: () => setRemovingId(null),
  });
  const clr = useMutation({
    mutationFn: () => clrFn(),
    onSuccess: () => {
      refresh();
      toast.success("Carrinho limpo.");
    },
  });

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [shipZip, setShipZip] = useState<string>("");
  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    [],
  );

  const commitQty = (id: string, next: number) => {
    const n = Math.max(1, Math.min(999, Math.floor(next) || 1));
    pending.current[id] = n;

    qc.setQueryData(["dojo-store", "cart"], (old: any) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((it: any) =>
          it.id === id
            ? { ...it, quantity: n, line_total: Number((it.unit_final * n).toFixed(2)) }
            : it,
        ),
      };
    });

    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      upd.mutate({ id, quantity: pending.current[id] });
    }, 400);
  };

  const checkout = useMutation({
    mutationFn: () => handoffFn(),
    onSuccess: (r: any) => {
      const payload: Record<string, unknown> = { items: r.items };
      if (shipping) payload.shipping = shipping;
      if (shipZip) payload.zip = shipZip;
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      refresh();
      const url = `https://amtfightwear.com.br/loja/carrinho?checkout=1&import=${encodeURIComponent(b64)}`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.error(
          "Ative pop-ups para abrir o checkout ou clique novamente.",
        );
      } else {
        toast.success(
          shipping
            ? "Checkout aberto com o frete escolhido."
            : "Checkout aberto em nova janela.",
        );
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao finalizar"),
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]" />
      </div>
    );
  }
  if (!data?.items.length) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Seu carrinho está vazio"
        description="Explore as coleções e adicione produtos para começar a montar seu pedido."
        action={
          <Link
            to="/dojo/app/store"
            className="inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90"
          >
            Explorar loja
          </Link>
        }
      />
    );
  }

  const shippingPrice = shipping?.price ?? 0;
  const total = data.subtotal + shippingPrice;

  return (
    <div className="grid w-full max-w-full gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <header className="space-y-0.5 px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Carrinho
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Revise seu pedido
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {data.items.length} {data.items.length === 1 ? "item" : "itens"} · atacado
            automático (−25% a partir de 10 un).
          </p>
        </header>

        {data.subcategory_progress && data.subcategory_progress.length > 0 && (
          <div className="space-y-2">
            {data.subcategory_progress.map((c: any) => (
              <div
                key={c.key}
                className={`rounded-2xl border p-3 text-xs ${
                  c.unlocked
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {c.unlocked ? (
                  <>
                    🎉 <strong>Atacado 25% OFF</strong> aplicado em{" "}
                    <strong>{c.name}</strong> ({c.qty} itens)
                  </>
                ) : (
                  <>
                    Faltam <strong>{c.missing}</strong> itens em{" "}
                    <strong>{c.name}</strong> para liberar 25% OFF (mín. {c.min}).
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <ul className="space-y-3">
          {data.items.map((it) => {
            const q = it.quantity;
            const shown = draft[it.id] ?? String(q);
            const isRemoving = removingId === it.id;
            return (
              <li
                key={it.id}
                className={`flex gap-4 rounded-2xl border border-[color:var(--dojo-border)] bg-white p-4 shadow-[var(--dojo-shadow-xs)] transition-all duration-300 ${
                  isRemoving ? "scale-95 opacity-0" : "opacity-100"
                }`}
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[color:var(--dojo-surface-3)] sm:h-28 sm:w-28">
                  {it.product?.image_url ? (
                    <img
                      src={it.product.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm sm:text-base font-semibold tracking-tight text-foreground">
                        {it.product?.name}
                      </div>
                      {it.product?.category_name && (
                        <div className="truncate text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                          {it.product.category_name}
                        </div>
                      )}
                      {it.variant_label && (
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          Tam: <span className="text-foreground">{it.variant_label}</span>
                        </div>
                      )}
                      {it.customization && (
                        <div className="mt-0.5 truncate text-[10px] font-medium text-primary">
                          ✨ {it.customization.name || "Personalizado"}
                        </div>
                      )}
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Unitário:{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {brl(it.unit_final)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setRemovingId(it.id);
                        setTimeout(() => rm.mutate(it.id), 180);
                      }}
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3">
                    <div className="inline-flex h-8 items-center rounded-full border border-[color:var(--dojo-border)] bg-white">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-l-full transition hover:bg-black/[0.04]"
                        onClick={() => commitQty(it.id, q - 1)}
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3 w-3" strokeWidth={1.75} />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-8 bg-transparent text-center text-xs tabular-nums outline-none"
                        value={shown}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                          setDraft((s) => ({ ...s, [it.id]: raw }));
                          const parsed = parseInt(raw, 10);
                          if (!Number.isNaN(parsed) && parsed >= 1) commitQty(it.id, parsed);
                        }}
                        onBlur={() => {
                          setDraft((s) => {
                            const { [it.id]: _, ...rest } = s;
                            return rest;
                          });
                          const parsed = parseInt(shown, 10);
                          if (!parsed || parsed < 1) commitQty(it.id, 1);
                        }}
                        aria-label="Quantidade"
                      />
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-r-full transition hover:bg-black/[0.04]"
                        onClick={() => commitQty(it.id, q + 1)}
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="ml-auto text-right min-w-fit">
                      {it.is_wholesale && (
                        <div className="text-[9px] text-muted-foreground line-through leading-none">
                          {brl(it.unit_retail * it.quantity)}
                        </div>
                      )}
                      <div className="text-sm sm:text-base font-bold tabular-nums text-foreground leading-tight">
                        {brl(it.line_total)}
                      </div>
                      {it.is_wholesale && (
                        <div className="text-[9px] font-medium text-emerald-600 leading-none">
                          −25% OFF
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-full text-xs">
            <Link to="/dojo/app/store">Continuar comprando</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-[11px] text-destructive hover:bg-destructive/10"
            disabled={clr.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Tem certeza que deseja limpar o carrinho?",
                )
              ) {
                clr.mutate();
              }
            }}
          >
            <Trash2 className="mr-1.5 h-3 w-3" strokeWidth={1.75} />
            Limpar carrinho
          </Button>
        </div>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        <div className="rounded-2xl border border-[color:var(--dojo-border)] bg-white p-5 shadow-[var(--dojo-shadow-sm)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Resumo do pedido
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {data.savings > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (varejo)</span>
                <span className="line-through">{brl(data.retail_total)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{brl(data.subtotal)}</span>
            </div>
            {data.savings > 0 && (
              <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                <span>💰 Você economizou</span>
                <span className="font-bold tabular-nums">{brl(data.savings)}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="min-w-0 truncate text-muted-foreground">
                Frete{" "}
                {shipping ? (
                  <span className="text-foreground">
                    ({shipping.company} {shipping.name})
                  </span>
                ) : null}
              </span>
              <span
                className={`shrink-0 tabular-nums ${shipping ? "font-medium" : "text-muted-foreground"}`}
              >
                {shipping ? brl(shippingPrice) : "Informe o CEP"}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-[color:var(--dojo-border)] pt-3">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {brl(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--dojo-border)] bg-white p-5 shadow-[var(--dojo-shadow-sm)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Calcular frete
          </div>
          <div className="mt-3">
            <ShippingCalculator
              items={data.items.map((it: any) => ({
                product_id: it.product_id,
                variant_id: it.variant_id ?? null,
                quantity: it.quantity,
                unit_price: Number(it.unit_final),
              }))}
              initialZip={shipZip}
              selectedId={shipping?.id ?? null}
              onSelect={(opt, z) => {
                setShipping(opt);
                if (z) setShipZip(z);
              }}
              compact
            />
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Você pode alterar o CEP no checkout, se preferir.
          </div>
        </div>

        <Button
          className="h-12 w-full rounded-full bg-foreground text-background hover:opacity-90"
          size="lg"
          disabled={checkout.isPending}
          onClick={() => checkout.mutate()}
        >
          {checkout.isPending ? (
            "Processando..."
          ) : (
            <>
              Finalizar compra <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.75} />
            </>
          )}
        </Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          O checkout abrirá em uma nova janela. Seu carrinho fica salvo aqui até você
          concluir a compra. 10+ unidades por subcategoria garantem 25% de desconto
          automático.
        </p>
      </aside>
    </div>
  );
}
