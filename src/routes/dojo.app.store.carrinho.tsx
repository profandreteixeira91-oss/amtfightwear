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
    onSuccess: refresh,
  });
  const rm = useMutation({ mutationFn: (id: string) => rmFn({ data: { id } }), onSuccess: refresh });
  const clr = useMutation({ mutationFn: () => clrFn(), onSuccess: refresh });

  // Optimistic local quantities: keep server in sync via debounced flush.
  const [localQty, setLocalQty] = useState<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  const bumpQty = (id: string, current: number, delta: number) => {
    const next = Math.max(1, current + delta);
    if (next === current) return;
    setLocalQty((s) => ({ ...s, [id]: next }));
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => {
      upd.mutate(
        { id, quantity: next },
        {
          onSettled: () => {
            setLocalQty((s) => {
              const { [id]: _, ...rest } = s;
              return rest;
            });
          },
        },
      );
    }, 350);
  };

  const checkout = useMutation({
    mutationFn: () => handoffFn(),
    onSuccess: (r: any) => {
      // Subdomínios diferentes (dojomanager x loja) não compartilham
      // localStorage, então o carrinho é enviado via URL para a rota
      // /loja/carrinho, que faz o import e segue para /loja/checkout.
      // O frete é calculado lá no checkout oficial.
      const payload = { items: r.items };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      refresh();
      const url = `https://loja.amtfightwear.com.br/loja/carrinho?checkout=1&import=${encodeURIComponent(b64)}`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.error("Ative pop-ups para abrir o checkout ou clique novamente.");
      } else {
        toast.success("Checkout aberto em nova janela. O frete será calculado lá.");
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

  const total = data.subtotal;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
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
                <div className="flex items-center rounded-md border">
                  {(() => {
                    const q = localQty[it.id] ?? it.quantity;
                    return (
                      <>
                        <button type="button" className="px-2 py-1 text-base" onClick={() => bumpQty(it.id, q, -1)}>−</button>
                        <div className="w-8 text-center text-sm tabular-nums">{q}</div>
                        <button type="button" className="px-2 py-1 text-base" onClick={() => bumpQty(it.id, q, +1)}>+</button>
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
        <div className="flex justify-between">
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

      <Card className="h-fit space-y-3 p-4">
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
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">{brl(total)}</span>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
            🚚 O frete será calculado na próxima etapa (checkout AMT Fight Wear).
          </div>
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
