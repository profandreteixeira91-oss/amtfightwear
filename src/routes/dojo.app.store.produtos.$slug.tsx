import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsGetProduct, dsAddToCart } from "@/lib/dojo/store/store.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dojo/app/store/produtos/$slug")({ component: PdpPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PdpPage() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(dsGetProduct);
  const addFn = useServerFn(dsAddToCart);

  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "product", slug],
    queryFn: () => getFn({ data: { slug } }),
  });
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customAcademy, setCustomAcademy] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [addedOpen, setAddedOpen] = useState(false);

  const add = useMutation({
    mutationFn: () => addFn({
      data: {
        product_id: data!.product.id,
        variant_id: variantId,
        quantity: qty,
        customization: customizing && (customName || customAcademy || customNotes)
          ? { name: customName, academy: customAcademy, notes: customNotes }
          : undefined,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });
      setAddedOpen(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao adicionar"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!data)
    return (
      <div>
        Produto não encontrado.{" "}
        <Link to="/dojo/app/store" className="text-primary underline">Voltar</Link>
      </div>
    );

  const { product, variants } = data;

  const backTarget = product.category_slug
    ? { to: "/dojo/app/store/c/$categoria" as const, params: { categoria: product.category_slug } }
    : { to: "/dojo/app/store" as const, params: {} as any };

  return (
    <div className="space-y-6">
      <button
        onClick={() => nav(backTarget as any)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </Card>

        <div className="space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{product.category_name}</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-2">
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-muted-foreground line-through">{brl(product.compare_at_price)}</span>
            )}
            <span className="text-3xl font-bold text-primary">{brl(product.price)}</span>
          </div>

          {product.short_description && (
            <p className="text-sm text-muted-foreground">{product.short_description}</p>
          )}

          {variants.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium">Tamanho / Variação</div>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((v) => {
                  const label = v.option_label ?? [v.size, v.color].filter(Boolean).join(" / ") ?? v.id.slice(0, 6);
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id === variantId ? null : v.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs ${
                        variantId === v.id ? "border-primary bg-primary text-primary-foreground" : "border-input"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="text-xs font-medium">Quantidade</div>
            <div className="flex items-center rounded-md border">
              <button className="px-3 py-1.5" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <div className="w-10 text-center text-sm">{qty}</div>
              <button className="px-3 py-1.5" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            {product.stock > 0 && (
              <span className="text-xs text-muted-foreground">Estoque: {product.stock}</span>
            )}
          </div>

          <div>
            <button
              onClick={() => setCustomizing((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" /> {customizing ? "Cancelar personalização" : "Personalizar"}
            </button>
            {customizing && (
              <div className="mt-2 space-y-2 rounded-lg border p-3">
                <Input placeholder="Nome bordado" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                <Input placeholder="Nome da academia" value={customAcademy} onChange={(e) => setCustomAcademy(e.target.value)} />
                <Textarea placeholder="Observações (cor, patch, texto...)" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={2} />
              </div>
            )}
          </div>

          <Button size="lg" className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {add.isPending ? "Adicionando…" : "Adicionar ao Carrinho"}
          </Button>

          {product.description && (
            <div className="pt-4">
              <h3 className="text-sm font-semibold">Descrição</h3>
              <div
                className="prose prose-sm mt-2 max-w-none text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal pós-adicionar */}
      <Dialog open={addedOpen} onOpenChange={setAddedOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Produto adicionado
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{product.name}</span> foi incluído no seu carrinho.
          </div>
          <div className="mt-2 grid gap-2">
            <Button
              variant="outline"
              onClick={() => setAddedOpen(false)}
            >
              Continuar comprando
            </Button>
            <Button
              variant="secondary"
              onClick={() => nav({ to: "/dojo/app/store/carrinho" })}
            >
              Ver carrinho
            </Button>
            <Button onClick={() => nav({ to: "/dojo/app/store/carrinho", search: { checkout: 1 } as any })}>
              Finalizar compra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
