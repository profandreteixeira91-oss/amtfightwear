import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsGetCart, dsUpdateCartItem, dsRemoveCartItem, dsClearCart, dsCheckout } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/store/carrinho")({ component: CartPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CartPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetCart);
  const updFn = useServerFn(dsUpdateCartItem);
  const rmFn = useServerFn(dsRemoveCartItem);
  const clrFn = useServerFn(dsClearCart);
  const coFn = useServerFn(dsCheckout);

  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "cart"], queryFn: () => getFn() });

  const refresh = () => qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });
  const upd = useMutation({ mutationFn: (v: { id: string; quantity: number }) => updFn({ data: v }), onSuccess: refresh });
  const rm = useMutation({ mutationFn: (id: string) => rmFn({ data: { id } }), onSuccess: refresh });
  const clr = useMutation({ mutationFn: () => clrFn(), onSuccess: refresh });
  const co = useMutation({
    mutationFn: () => coFn({ data: { shipping_cost: 0 } }),
    onSuccess: (r: any) => {
      toast.success(`Pedido ${r.order_number} criado`);
      refresh();
      nav({ to: "/dojo/app/store/pedidos/$id", params: { id: r.order_id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!data?.items.length) {
    return (
      <Card className="p-12 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <div className="mt-3 text-lg font-semibold">Seu carrinho está vazio</div>
        <Button asChild className="mt-4"><Link to="/dojo/app/store/produtos">Explorar produtos</Link></Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {data.items.map((it) => (
          <Card key={it.id} className="flex gap-3 p-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
              {it.product?.image_url ? <img src={it.product.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{it.product?.name}</div>
                  {it.variant_label && <div className="text-xs text-muted-foreground">{it.variant_label}</div>}
                  {it.customization && (
                    <div className="mt-1 text-[11px] text-primary">
                      ✨ Personalizado{it.customization.name ? `: ${it.customization.name}` : ""}
                    </div>
                  )}
                </div>
                <button className="text-muted-foreground hover:text-destructive" onClick={() => rm.mutate(it.id)}>
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
                  {it.is_wholesale && <div className="text-[10px] text-muted-foreground line-through">{brl(it.unit_retail)}</div>}
                  <div className="text-sm font-bold">{brl(it.line_total)}</div>
                  {it.is_wholesale && <div className="text-[10px] font-medium text-emerald-600">Atacado</div>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        <div className="flex justify-between">
          <Button asChild variant="ghost" size="sm"><Link to="/dojo/app/store/produtos">Continuar comprando</Link></Button>
          <Button variant="ghost" size="sm" onClick={() => clr.mutate()}>Esvaziar</Button>
        </div>
      </div>

      <Card className="h-fit p-4 space-y-3">
        <div className="text-sm font-semibold">Resumo</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (varejo)</span><span className="line-through">{brl(data.retail_total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Seu preço</span><span className="font-medium">{brl(data.subtotal)}</span>
          </div>
          {data.savings > 0 && (
            <div className="flex justify-between rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
              <span>💰 Você economizou</span><span className="font-bold">{brl(data.savings)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">Total</span><span className="font-bold text-primary">{brl(data.subtotal)}</span>
          </div>
        </div>
        {data.has_wholesale && (
          <div className="rounded-md bg-primary/5 p-2 text-xs text-primary">
            🎉 Preço de atacado desbloqueado!
          </div>
        )}
        <Button className="w-full" size="lg" disabled={co.isPending} onClick={() => co.mutate()}>
          {co.isPending ? "Processando…" : "Finalizar pedido"}
        </Button>
        <div className="text-[11px] text-muted-foreground">
          Ao finalizar, o pedido é registrado e você será redirecionado para o pagamento pela loja oficial (Mercado Pago).
        </div>
      </Card>
    </div>
  );
}
