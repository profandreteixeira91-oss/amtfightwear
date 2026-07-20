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

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import type { ShippingOption } from "@/lib/store/shipping.functions";

export const Route = createFileRoute("/dojo/app/store/carrinho")({ component: CartPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CartPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetCart);
  const updFn = useServerFn(dsUpdateCartItem);
  const rmFn = useServerFn(dsRemoveCartItem);
  const clrFn = useServerFn(dsClearCart);
  const handoffFn = useServerFn(dsHandoffToStoreCheckout);

  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "cart"], queryFn: () => getFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });

  const upd = useMutation({
    mutationFn: (v: { id: string; quantity: number }) => updFn({ data: v }),
    onSuccess: (fresh: any) => {
      // Substitui o cache pelo carrinho recalculado no servidor
      // (preços atacado, progresso etc.), sem refetch adicional.
      if (fresh) qc.setQueryData(["dojo-store", "cart"], fresh);
    },
    onError: () => refresh(),
  });
  const rm = useMutation({ mutationFn: (id: string) => rmFn({ data: { id } }), onSuccess: refresh });
  const clr = useMutation({ mutationFn: () => clrFn(), onSuccess: refresh });

  // Debounce por item: UI atualiza instantaneamente via setQueryData,
  // servidor sincroniza após 400ms de inatividade.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [shipZip, setShipZip] = useState<string>("");
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  const commitQty = (id: string, next: number) => {
    const n = Math.max(1, Math.min(999, Math.floor(next) || 1));
    pending.current[id] = n;

    // Atualização otimista imediata no cache.
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
      // Subdomínios diferentes (dojomanager x loja) não compartilham
      // localStorage — enviamos itens + frete via URL para /loja/carrinho,
      // que grava a seleção no sessionStorage e segue para /loja/checkout.
      const payload: Record<string, unknown> = { items: r.items };
      if (shipping) payload.shipping = shipping;
      if (shipZip) payload.zip = shipZip;
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      refresh();
      const url = `https://loja.amtfightwear.com.br/loja/carrinho?checkout=1&import=${encodeURIComponent(b64)}`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.error("Ative pop-ups para abrir o checkout ou clique novamente.");
      } else {
        toast.success(shipping ? "Checkout aberto com o frete escolhido." : "Checkout aberto em nova janela.");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao finalizar"),
  });


  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!data?.items.length) {
    return (
      <Card className="p-12 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <div className="mt-3 text-lg font-semibold">Seu carrinho está vazio</div>
        <Button asChild className="mt-4"><Link to="/dojo/app/store">Escolher categoria</Link></Button>
      </Card>
    );
  }

  const shippingPrice = shipping?.price ?? 0;
  const total = data.subtotal + shippingPrice;

  return (
    <div className="grid w-full max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-3">

        {data.subcategory_progress && data.subcategory_progress.length > 0 && (
          <div className="space-y-2">
            {data.subcategory_progress.map((c: any) => (
              <div
                key={c.key}
                className={`rounded-md border p-2 text-xs ${
                  c.unlocked
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {c.unlocked ? (
                  <>🎉 <strong>Atacado 25% OFF</strong> aplicado em <strong>{c.name}</strong> ({c.qty} itens)</>
                ) : (
                  <>Faltam <strong>{c.missing}</strong> itens em <strong>{c.name}</strong> para liberar 25% OFF (mín. {c.min}).</>
                )}
              </div>
            ))}
          </div>
        )}

        {data.items.map((it) => (
          <Card key={it.id} className="flex gap-3 p-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              {it.product?.image_url ? (
                <img src={it.product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.product?.name}</div>
                  {it.product?.category_name && (
                    <div className="text-[11px] text-muted-foreground">{it.product.category_name}</div>
                  )}
                  {it.variant_label && (
                    <div className="text-xs text-muted-foreground">Tamanho: {it.variant_label}</div>
                  )}
                  {it.customization && (
                    <div className="mt-1 text-[11px] text-primary">
                      ✨ Personalizado{it.customization.name ? `: ${it.customization.name}` : ""}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Unitário: <span className="font-medium text-foreground">{brl(it.unit_final)}</span>
                  </div>
                </div>
                <button
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => rm.mutate(it.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center rounded-md border overflow-hidden">
                  {(() => {
                    const q = it.quantity;
                    const shown = draft[it.id] ?? String(q);
                    return (
                      <>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-base hover:bg-muted active:bg-muted/70 transition-colors"
                          onClick={() => commitQty(it.id, q - 1)}
                          aria-label="Diminuir"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-12 border-x bg-transparent py-1.5 text-center text-sm tabular-nums outline-none focus:bg-muted/40"
                          value={shown}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                            setDraft((s) => ({ ...s, [it.id]: raw }));
                            const parsed = parseInt(raw, 10);
                            if (!Number.isNaN(parsed) && parsed >= 1) {
                              commitQty(it.id, parsed);
                            }
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
                          className="px-3 py-1.5 text-base hover:bg-muted active:bg-muted/70 transition-colors"
                          onClick={() => commitQty(it.id, q + 1)}
                          aria-label="Aumentar"
                        >
                          +
                        </button>
                      </>
                    );
                  })()}
                </div>
                <div className="text-right">
                  {it.is_wholesale && (
                    <div className="text-[10px] text-muted-foreground line-through">{brl(it.unit_retail * it.quantity)}</div>
                  )}
                  <div className="text-sm font-bold">{brl(it.line_total)}</div>
                  {it.is_wholesale && <div className="text-[10px] font-medium text-emerald-600">Atacado −25%</div>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        <div className="flex flex-wrap justify-between gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/dojo/app/store">Continuar comprando</Link></Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            disabled={clr.isPending}
            onClick={() => {
              if (window.confirm("Tem certeza que deseja limpar o carrinho? Esta ação não pode ser desfeita.")) {
                clr.mutate();
              }
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Limpar carrinho
          </Button>
        </div>
      </div>

      <Card className="h-fit min-w-0 space-y-3 p-4">

        <div className="text-sm font-semibold">Resumo</div>
        <div className="space-y-1 text-sm">
          {data.savings > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal (varejo)</span><span className="line-through">{brl(data.retail_total)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Subtotal</span><span className="font-medium">{brl(data.subtotal)}</span>
          </div>
          {data.savings > 0 && (
            <div className="flex justify-between rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
              <span>💰 Você economizou</span><span className="font-bold">{brl(data.savings)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="min-w-0 truncate text-muted-foreground">Frete {shipping ? `(${shipping.company} ${shipping.name})` : ""}</span>
            <span className={`shrink-0 ${shipping ? "font-medium" : "text-muted-foreground"}`}>{shipping ? brl(shippingPrice) : "Informe o CEP"}</span>
          </div>

          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">{brl(total)}</span>
          </div>
        </div>

        <ShippingCalculator
          items={data.items.map((it: any) => ({ product_id: it.product_id, variant_id: it.variant_id ?? null, quantity: it.quantity }))}
          initialZip={shipZip}
          selectedId={shipping?.id ?? null}
          onSelect={(opt, z) => { setShipping(opt); if (z) setShipZip(z); }}
          compact
        />
        <div className="text-[11px] text-muted-foreground">
          Você pode alterar o CEP no checkout, se preferir.
        </div>


        <Button className="w-full" size="lg" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
          {checkout.isPending ? "Processando…" : (<>Finalizar Compra <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>
        <div className="text-[11px] text-muted-foreground">
          O checkout abrirá em uma nova janela. Seu carrinho fica salvo aqui até você concluir a compra.
          10+ unidades por subcategoria garantem 25% de desconto automático.
        </div>
      </Card>
    </div>
  );
}
