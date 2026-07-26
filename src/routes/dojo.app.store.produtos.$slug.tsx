import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsGetProduct, dsAddToCart } from "@/lib/dojo/store/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dojo/app/store/produtos/$slug")({
  component: PdpPage,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const add = useMutation({
    mutationFn: () =>
      addFn({
        data: {
          product_id: data!.product.id,
          variant_id: variantId,
          quantity: qty,
          customization:
            customizing && (customName || customAcademy || customNotes)
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

  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-[color:var(--dojo-surface-3)]" />
        <div className="space-y-4">
          <div className="h-4 w-1/4 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
          <div className="h-8 w-3/4 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
          <div className="h-6 w-1/3 animate-pulse rounded-full bg-[color:var(--dojo-surface-3)]" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]" />
        </div>
      </div>
    );
  }
  if (!data)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        Produto não encontrado.{" "}
        <Link to="/dojo/app/store" className="text-primary underline">
          Voltar
        </Link>
      </div>
    );

  const { product, variants } = data;
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const price = Number(product.price);
  const parcela = price >= 30 ? price / 3 : 0;

  const backTarget = product.category_slug
    ? {
        to: "/dojo/app/store/c/$categoria" as const,
        params: { categoria: product.category_slug },
      }
    : { to: "/dojo/app/store" as const, params: {} as any };

  return (
    <div className="space-y-10">
      <button
        onClick={() => nav(backTarget as any)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Voltar
      </button>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Galeria */}
        <div className="space-y-3">
          <div
            className="relative aspect-square overflow-hidden rounded-3xl border border-[color:var(--dojo-border)] bg-[color:var(--dojo-surface-3)]"
            onMouseMove={(e) => {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              setZoom({
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              });
            }}
            onMouseLeave={() => setZoom(null)}
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out"
                style={
                  zoom
                    ? {
                        transform: "scale(1.6)",
                        transformOrigin: `${zoom.x}% ${zoom.y}%`,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
                Sem imagem
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[product.image_url].filter((s): s is string => Boolean(s)).map((src, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-xl border border-foreground/20"
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Painel de compra */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {product.category_name}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {product.name}
            </h1>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              {compareAt && compareAt > price && (
                <span className="text-base text-muted-foreground line-through">
                  {brl(compareAt)}
                </span>
              )}
              <span className="text-4xl font-bold tracking-tight text-foreground">
                {brl(price)}
              </span>
              {compareAt && compareAt > price && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  −{Math.round(((compareAt - price) / compareAt) * 100)}%
                </span>
              )}
            </div>
            {parcela > 0 && (
              <div className="text-sm text-muted-foreground">
                em até <span className="font-medium text-foreground">3× de {brl(parcela)}</span> sem juros
              </div>
            )}
          </div>

          {product.short_description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.short_description}
            </p>
          )}

          {variants.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Tamanho / Variação
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label =
                    v.option_label ??
                    [v.size, v.color].filter(Boolean).join(" / ") ??
                    v.id.slice(0, 6);
                  const active = variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id === variantId ? null : v.id)}
                      className={cn(
                        "min-w-14 rounded-full border px-4 py-2 text-sm font-medium transition",
                        active
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "border-[color:var(--dojo-border)] bg-white text-foreground hover:border-foreground/40",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Quantidade
              </div>
              <div className="inline-flex h-11 items-center rounded-full border border-[color:var(--dojo-border)] bg-white">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-11 w-11 place-items-center rounded-l-full transition hover:bg-black/[0.04]"
                  aria-label="Diminuir"
                >
                  <Minus className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <div className="w-10 text-center text-sm font-semibold tabular-nums">
                  {qty}
                </div>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-11 w-11 place-items-center rounded-r-full transition hover:bg-black/[0.04]"
                  aria-label="Aumentar"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
            {product.stock > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" /> Estoque disponível
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setCustomizing((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition hover:opacity-70"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              {customizing ? "Cancelar personalização" : "Personalizar este item"}
            </button>
            {customizing && (
              <div className="space-y-2 rounded-2xl border border-[color:var(--dojo-border)] bg-[color:var(--dojo-surface-2)] p-4">
                <Input
                  placeholder="Nome bordado"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <Input
                  placeholder="Nome da academia"
                  value={customAcademy}
                  onChange={(e) => setCustomAcademy(e.target.value)}
                />
                <Textarea
                  placeholder="Observações (cor, patch, texto...)"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              className="h-12 flex-1 rounded-full bg-foreground text-background hover:opacity-90"
              onClick={() => add.mutate()}
              disabled={add.isPending}
            >
              <ShoppingCart className="mr-2 h-4 w-4" strokeWidth={1.75} />
              {add.isPending ? "Adicionando..." : "Adicionar ao carrinho"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 flex-1 rounded-full border-foreground/20 hover:bg-black/[0.04]"
              onClick={async () => {
                await add.mutateAsync();
                nav({ to: "/dojo/app/store/carrinho" });
              }}
              disabled={add.isPending}
            >
              Comprar agora <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Informações adicionais */}
          <ul className="grid grid-cols-1 gap-2 border-t border-[color:var(--dojo-border)] pt-5 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              Prazo de produção: 5-10 dias úteis
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              Envio para todo o Brasil
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              Garantia de qualidade AMT
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              Troca em até 7 dias
            </li>
          </ul>
        </div>
      </div>

      {product.description && (
        <section className="mx-auto max-w-3xl space-y-3 border-t border-[color:var(--dojo-border)] pt-10">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Descrição</h2>
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      )}

      {/* Modal pós-adicionar */}
      <Dialog open={addedOpen} onOpenChange={setAddedOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
              Produto adicionado
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{product.name}</span> foi
            incluído no seu carrinho.
          </div>
          <div className="mt-2 grid gap-2">
            <Button
              variant="outline"
              onClick={() => setAddedOpen(false)}
              className="rounded-full"
            >
              Continuar comprando
            </Button>
            <Button
              variant="secondary"
              onClick={() => nav({ to: "/dojo/app/store/carrinho" })}
              className="rounded-full"
            >
              Ver carrinho
            </Button>
            <Button
              onClick={() =>
                nav({
                  to: "/dojo/app/store/carrinho",
                  search: { checkout: 1 } as any,
                })
              }
              className="rounded-full bg-foreground text-background hover:opacity-90"
            >
              Finalizar compra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
