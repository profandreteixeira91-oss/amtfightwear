import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsGetProduct, dsAddToCart, dsToggleFavorite } from "@/lib/dojo/store/store.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ShoppingCart, Share2, ArrowLeft, Sparkles } from "lucide-react";
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
  const favFn = useServerFn(dsToggleFavorite);

  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "product", slug], queryFn: () => getFn({ data: { slug } }) });
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customAcademy, setCustomAcademy] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const add = useMutation({
    mutationFn: () => addFn({
      data: {
        product_id: data!.product.id,
        variant_id: variantId,
        quantity: qty,
        customization: customizing && (customName || customAcademy || customNotes)
          ? { name: customName, academy: customAcademy, notes: customNotes } : undefined,
      },
    }),
    onSuccess: () => {
      toast.success("Adicionado ao carrinho");
      qc.invalidateQueries({ queryKey: ["dojo-store", "cart"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const fav = useMutation({
    mutationFn: () => favFn({ data: { product_id: data!.product.id } }),
    onSuccess: (r: any) => toast.success(r?.favorited ? "Favoritado" : "Removido dos favoritos"),
  });

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ url, title: data?.product.name }); } catch {} }
    else { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!data) return <div>Produto não encontrado. <Link to="/dojo/app/store/produtos" className="text-primary underline">Voltar</Link></div>;

  const { product, variants } = data;

  return (
    <div className="space-y-4">
      <button onClick={() => nav({ to: "/dojo/app/store/produtos" })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="aspect-square overflow-hidden bg-muted">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : null}
        </Card>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">{product.category_name}</div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-sm text-muted-foreground line-through">{brl(product.compare_at_price)}</span>
              )}
              <span className="text-3xl font-bold text-primary">{brl(product.price)}</span>
            </div>
            {product.wholesale_enabled && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                💰 Preço atacado: <b>{brl(product.wholesale_price)}</b> · −{product.wholesale_discount_percent}%
              </div>
            )}
          </div>

          {product.short_description && <p className="text-sm text-muted-foreground">{product.short_description}</p>}

          {variants.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium">Variação</div>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((v) => {
                  const label = v.option_label ?? [v.size, v.color].filter(Boolean).join(" / ") ?? v.id.slice(0, 6);
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id === variantId ? null : v.id)}
                      className={`rounded-md border px-3 py-1 text-xs ${variantId === v.id ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="text-xs font-medium">Quantidade</div>
            <div className="flex items-center rounded-md border">
              <button className="px-3 py-1" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <div className="w-10 text-center text-sm">{qty}</div>
              <button className="px-3 py-1" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <span className="text-xs text-muted-foreground">Estoque: {product.stock}</span>
          </div>

          <div>
            <button onClick={() => setCustomizing((v) => !v)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
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

          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={() => add.mutate()} disabled={add.isPending}>
              <ShoppingCart className="mr-2 h-4 w-4" /> Adicionar ao carrinho
            </Button>
            <Button size="lg" variant="outline" onClick={() => fav.mutate()}><Heart className="h-4 w-4" /></Button>
            <Button size="lg" variant="outline" onClick={share}><Share2 className="h-4 w-4" /></Button>
          </div>

          {product.description && (
            <div className="pt-4">
              <h3 className="text-sm font-semibold">Descrição</h3>
              <div className="prose prose-sm mt-2 max-w-none text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
