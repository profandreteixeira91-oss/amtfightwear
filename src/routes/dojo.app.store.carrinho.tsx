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
import { calculateShipping } from "@/lib/store/shipping.functions";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingBag, Truck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/dojo/app/store/carrinho")({ component: CartPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const onlyDigits = (s: string) => s.replace(/\D/g, "");

type ShipOption = { id: number; name: string; company: string; price: number; delivery_time?: number; error?: string };

function CartPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetCart);
  const updFn = useServerFn(dsUpdateCartItem);
  const rmFn = useServerFn(dsRemoveCartItem);
  const clrFn = useServerFn(dsClearCart);
  const handoffFn = useServerFn(dsHandoffToStoreCheckout);
  const shipFn = useServerFn(calculateShipping);

  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "cart"], queryFn: () => getFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });

  const upd = useMutation({ mutationFn: (v: { id: string; quantity: number }) => updFn({ data: v }), onSuccess: refresh });
  const rm = useMutation({ mutationFn: (id: string) => rmFn({ data: { id } }), onSuccess: refresh });
  const clr = useMutation({ mutationFn: () => clrFn(), onSuccess: refresh });

  const [cep, setCep] = useState("");
  const [options, setOptions] = useState<ShipOption[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const shippingCost = useMemo(
    () => options.find((o) => o.id === selected)?.price ?? 0,
    [options, selected],
  );

  const quote = useMutation({
    mutationFn: async () => {
      if (!data?.items.length) throw new Error("Carrinho vazio");
      const clean = onlyDigits(cep);
      if (clean.length !== 8) throw new Error("CEP inválido");
      const res = await shipFn({
        data: {
          to_zip: clean,
          items: data.items.map((it) => ({
            product_id: it.product_id,
            variant_id: it.variant_id ?? undefined,
            quantity: it.quantity,
          })),
        },
      });
      return res.options as ShipOption[];
    },
    onSuccess: (opts) => {
      setOptions(opts);
      const cheapest = opts.filter((o) => !o.error).sort((a, b) => a.price - b.price)[0];
      setSelected(cheapest?.id ?? null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao calcular frete"),
  });

  const checkout = useMutation({
    mutationFn: () => handoffFn(),
    onSuccess: (r: any) => {
      // Subdomínios diferentes (dojomanager x loja) não compartilham
      // localStorage, então o carrinho é enviado via URL para a rota
      // /loja/carrinho, que faz o import e segue para /loja/checkout.
      const payload = { items: r.items };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      refresh();
      toast.success("Redirecionando para o checkout AMT Fight Wear…");
      window.location.href =
        `https://loja.amtfightwear.com.br/loja/carrinho?checkout=1&import=${encodeURIComponent(b64)}`;
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

  const total = Math.round((data.subtotal + shippingCost) * 100) / 100;

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
                  <button className="px-2" onClick={() => upd.mutate({ id: it.id, quantity: Math.max(1, it.quantity - 1) })}>−</button>
                  <div className="w-8 text-center text-sm">{it.quantity}</div>
                  <button className="px-2" onClick={() => upd.mutate({ id: it.id, quantity: it.quantity + 1 })}>+</button>
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
          <Button variant="ghost" size="sm" onClick={() => clr.mutate()}>Esvaziar</Button>
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
          <div className="flex justify-between">
            <span>Frete</span>
            <span className="font-medium">{shippingCost > 0 ? brl(shippingCost) : "—"}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">{brl(total)}</span>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Truck className="h-3.5 w-3.5" /> Calcular frete
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="CEP (00000-000)"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              maxLength={9}
              className="h-9"
              inputMode="numeric"
            />
            <Button size="sm" onClick={() => quote.mutate()} disabled={quote.isPending}>
              {quote.isPending ? "…" : "OK"}
            </Button>
          </div>
          {options.length > 0 && (
            <div className="space-y-1">
              {options.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border p-2 text-xs ${
                    selected === o.id ? "border-primary bg-primary/5" : "border-input"
                  } ${o.error ? "opacity-50" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selected === o.id}
                      onChange={() => setSelected(o.id)}
                      disabled={!!o.error}
                    />
                    <span>
                      <span className="font-medium">{o.company} · {o.name}</span>
                      {o.delivery_time && <span className="ml-1 text-muted-foreground">({o.delivery_time} dias)</span>}
                      {o.error && <span className="ml-1 text-destructive">{o.error}</span>}
                    </span>
                  </span>
                  {!o.error && <span className="font-semibold">{brl(o.price)}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" size="lg" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
          {checkout.isPending ? "Processando…" : (<>Finalizar Compra <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>
        <div className="text-[11px] text-muted-foreground">
          O pagamento e o gerenciamento do pedido são processados pela AMT Fight Wear.
          10+ unidades por subcategoria garantem 25% de desconto automático.
        </div>
      </Card>
    </div>
  );
}
