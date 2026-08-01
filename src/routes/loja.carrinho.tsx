import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductImage } from "@/components/store/ProductImage";
import { listStoreCategories } from "@/lib/store/store.functions";
import { useCart, formatBRL } from "@/lib/store/cart-store";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import { KimonoGuideCallout, isKimonoContext } from "@/components/store/KimonoGuideLink";
import { CartUpsell } from "@/components/store/CartUpsell";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import { TrustBadges } from "@/components/store/TrustBadges";
import { trackStoreEvent, toAnalyticsItem } from "@/lib/store/analytics";
import type { ShippingOption } from "@/lib/store/shipping.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ArrowRight, Minus, Plus, ShieldCheck, Lock, Tag, Truck, ShoppingBag, Mail, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SHIPPING_KEY = "amt-checkout-shipping";
const GUEST_EMAIL_KEY = "amt-guest-email";
const FREE_SHIPPING_THRESHOLD = 399;

export const Route = createFileRoute("/loja/carrinho")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  },
  head: () => ({ meta: [{ title: "Carrinho — AMT Fight Wear" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function CartPage() {
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQuantity = useCart((s) => s.setQuantity);
  const addCart = useCart((s) => s.add);
  const clearCart = useCart((s) => s.clear);
  const [mounted, setMounted] = useState(false);
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [zip, setZip] = useState<string>("");
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [identifyOpen, setIdentifyOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(SHIPPING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { zip?: string; option?: ShippingOption };
        if (parsed.zip) setZip(parsed.zip);
        if (parsed.option) setShipping(parsed.option);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shipping) sessionStorage.setItem(SHIPPING_KEY, JSON.stringify({ zip, option: shipping }));
  }, [shipping, zip]);

  const handleShippingSelect = (opt: ShippingOption, selectedZip: string) => {
    setShipping(opt);
    if (selectedZip) setZip(selectedZip);
  };

  // Handoff vindo do AMT Dojo Manager.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payload = params.get("import");
    if (payload) {
      try {
        const json = JSON.parse(decodeURIComponent(escape(atob(payload))));
        if (Array.isArray(json?.items) && json.items.length > 0) {
          clearCart();
          for (const it of json.items) {
            addCart({
              product_id: it.product_id,
              variant_id: it.variant_id ?? null,
              name: it.name,
              slug: it.slug,
              image_url: it.image_url ?? null,
              variant_label: it.variant_label ?? null,
              unit_price: Number(it.unit_price),
              quantity: Number(it.quantity),
              type: "product",
            });
          }
        }
        if (json?.shipping || json?.zip) {
          if (json.zip) setZip(String(json.zip));
          if (json.shipping) setShipping(json.shipping as ShippingOption);
          try { sessionStorage.setItem(SHIPPING_KEY, JSON.stringify({ zip: json.zip, option: json.shipping })); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      const goCheckout = params.get("checkout") === "1";
      const url = new URL(window.location.href);
      url.searchParams.delete("import");
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
      if (goCheckout) window.location.href = "/loja/checkout";
    }
  }, [addCart, clearCart]);

  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const discount = couponApplied === "AMT10" ? subtotal * 0.1 : 0;
  const subtotalAfterDiscount = subtotal - discount;
  const shippingCost = shipping?.price ?? 0;
  const freeShipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD && !!shipping;
  const total = subtotalAfterDiscount + (freeShipping ? 0 : shippingCost);
  const progressPct = Math.min(100, (subtotalAfterDiscount / FREE_SHIPPING_THRESHOLD) * 100);
  const missingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalAfterDiscount);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (code === "AMT10") {
      setCouponApplied(code);
      setCouponError(null);
    } else {
      setCouponApplied(null);
      setCouponError("Cupom inválido");
    }
  };

  // Analytics de e-commerce: visualização do carrinho (uma vez por composição).
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    trackStoreEvent("view_cart", {
      value: subtotal,
      items: items.map((i) =>
        toAnalyticsItem({ id: i.product_id, name: i.name, price: i.unit_price, quantity: i.quantity, variant: i.variant_label }),
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, items.length]);

  const openIdentify = () => {
    trackStoreEvent("begin_checkout", {
      value: total,
      items: items.map((i) =>
        toAnalyticsItem({ id: i.product_id, name: i.name, price: i.unit_price, quantity: i.quantity, variant: i.variant_label }),
      ),
    });
    setIdentifyOpen(true);
  };


  const proceedAsGuest = () => {
    const email = guestEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    try { sessionStorage.setItem(GUEST_EMAIL_KEY, email); } catch { /* ignore */ }
    setIdentifyOpen(false);
    navigate({ to: "/loja/checkout" });
  };

  const signInAndProceed = async () => {
    setLoginError(null);
    if (!loginEmail || !loginPassword) { setLoginError("Preencha e-mail e senha"); return; }
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);
    if (error) { setLoginError(error.message); return; }
    setIdentifyOpen(false);
    navigate({ to: "/loja/checkout" });
  };

  if (!mounted) return <StoreShell categories={categories}><div className="p-16" /></StoreShell>;

  return (
    <StoreShell categories={categories}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Seu carrinho</h1>
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "Vazio" : `${items.length} ${items.length === 1 ? "item" : "itens"}`}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <p className="text-muted-foreground">Seu carrinho está vazio.</p>
              <Button asChild className="mt-6 rounded-full px-8">
                <Link to="/">Ir para a loja</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* ============ ESQUERDA — Lista de produtos ============ */}
            <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Produtos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {items.map((i, idx) => (
                    <li key={`${i.product_id}-${i.variant_id ?? ""}-${idx}`} className="flex gap-4 p-4 sm:gap-5 sm:p-6">
                      <ProductImage
                        src={i.image_url}
                        alt={i.name}
                        aspect="square"
                        className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted sm:h-28 sm:w-28"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        {i.type === "custom" ? (
                          <div className="line-clamp-2 text-sm font-bold leading-snug tracking-tight sm:text-base">{i.name}</div>
                        ) : (
                          <Link
                            to="/loja/produto/$slug"
                            params={{ slug: i.slug }}
                            className="line-clamp-2 text-sm font-bold leading-snug tracking-tight hover:text-primary sm:text-base"
                          >
                            {i.name}
                          </Link>
                        )}
                        {i.variant_label && (
                          <div className="mt-1 text-xs text-muted-foreground">{i.variant_label}</div>
                        )}
                        {i.type === "custom" && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">Custom Shop</span>
                            {i.production_days && (
                              <span className="text-muted-foreground">Produção em {i.production_days} dias</span>
                            )}
                            {i.custom_config?.fabric?.name && (
                              <span className="text-muted-foreground">· {i.custom_config.fabric.name}</span>
                            )}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          {formatBRL(i.unit_price)} <span className="opacity-60">un.</span>
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                          <div className="inline-flex items-center rounded-full border bg-background">
                            <button
                              type="button"
                              onClick={() => setQuantity(i.product_id, i.variant_id, i.quantity - 1)}
                              className="grid h-9 w-9 place-items-center rounded-l-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Diminuir quantidade"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-8 select-none text-center text-sm font-semibold tabular-nums">
                              {i.quantity}
                            </div>
                            <button
                              type="button"
                              onClick={() => setQuantity(i.product_id, i.variant_id, i.quantity + 1)}
                              className="grid h-9 w-9 place-items-center rounded-r-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm font-black tabular-nums sm:text-base">
                              {formatBRL(i.unit_price * i.quantity)}
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(i.product_id, i.variant_id)}
                              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Remover item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {items.some((i) => isKimonoContext(i.name)) && <KimonoGuideCallout />}

            <CartUpsell subtotal={subtotalAfterDiscount} />
            <RecentlyViewed />
            </div>



            {/* ============ DIREITA — Resumo ============ */}
            <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
              {/* Frete */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Truck className="h-4 w-4 text-primary" /> Calcular frete
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ShippingCalculator
                    items={items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id ?? null, quantity: i.quantity, unit_price: Number(i.unit_price) }))}
                    initialZip={zip}
                    selectedId={shipping?.id ?? null}
                    onSelect={handleShippingSelect}
                    compact
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">Você poderá alterar o CEP no checkout.</p>
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Resumo do pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  {/* Barra de progresso — Frete grátis */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        {freeShipping || subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? (
                          <span className="text-emerald-600">Frete grátis desbloqueado</span>
                        ) : (
                          <span>Falta <strong>{formatBRL(missingForFreeShipping)}</strong> para frete grátis</span>
                        )}
                      </span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                  </div>

                  {/* Cupom — oculto por padrão para não induzir abandono */}
                  <div className="space-y-2">
                    {!couponOpen && !couponApplied ? (
                      <button
                        type="button"
                        onClick={() => setCouponOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline"
                      >
                        <Tag className="h-3.5 w-3.5" /> Tenho um cupom de desconto
                      </button>
                    ) : (
                      <>
                        <Label htmlFor="coupon" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          <Tag className="h-3.5 w-3.5" /> Cupom de desconto
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="coupon"
                            value={coupon}
                            onChange={(e) => setCoupon(e.target.value)}
                            placeholder="Ex.: AMT10"
                            className="rounded-lg uppercase"
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                          />
                          <Button type="button" variant="outline" onClick={applyCoupon} className="rounded-lg">
                            Aplicar
                          </Button>
                        </div>
                      </>
                    )}
                    {couponApplied && (
                      <p className="text-xs text-emerald-600">Cupom <strong>{couponApplied}</strong> aplicado (−10%).</p>
                    )}
                    {couponError && !couponApplied && (
                      <p className="text-xs text-destructive">{couponError}</p>
                    )}
                  </div>


                  <Separator />

                  {/* Valores */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold tabular-nums">{formatBRL(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Desconto ({couponApplied})</span>
                        <span className="font-semibold tabular-nums">− {formatBRL(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Frete{shipping ? ` · ${shipping.company}` : ""}
                      </span>
                      <span className={shipping ? "font-semibold tabular-nums" : "text-muted-foreground"}>
                        {shipping
                          ? freeShipping
                            ? <><span className="mr-1 line-through opacity-60">{formatBRL(shippingCost)}</span><span className="text-emerald-600">Grátis</span></>
                            : formatBRL(shippingCost)
                          : "A calcular"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-end justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tight tabular-nums">{formatBRL(total)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        ou 10x de <strong className="text-foreground">{formatBRL(total / 10)}</strong> sem juros
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={openIdentify}
                    size="lg"
                    className="mt-2 w-full rounded-full text-sm font-bold uppercase tracking-widest"
                  >
                    Finalizar compra <ArrowRight className="h-4 w-4" />
                  </Button>

                  <Link
                    to="/"
                    className="block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Continuar comprando
                  </Link>

                  {/* Trust signals */}
                  <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>Ambiente 100% seguro processado pelo <strong className="text-foreground">Mercado Pago</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>Criptografia de ponta a ponta</span>
                    </div>
                  </div>

                  <TrustBadges />


                  {/* Métodos de pagamento */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 border-t pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {["Pix", "Visa", "Master", "Elo", "Amex", "Boleto"].map((m) => (
                      <span key={m} className="rounded-md border bg-background px-2 py-1">{m}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ============ Dialog de identificação ============ */}
      <Dialog open={identifyOpen} onOpenChange={setIdentifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">Como deseja continuar?</DialogTitle>
            <DialogDescription>
              Escolha a forma mais rápida para fechar seu pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-5">
            {/* Guest (foco principal) */}
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Mail className="h-4 w-4 text-primary" /> Continuar como Visitante
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Não é necessário criar uma senha para fechar seu pedido.
              </p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-email" className="text-xs font-semibold">E-mail</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    autoComplete="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="rounded-lg"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); proceedAsGuest(); } }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={proceedAsGuest}
                  disabled={!/^\S+@\S+\.\S+$/.test(guestEmail.trim())}
                  className="w-full rounded-full text-xs font-bold uppercase tracking-widest"
                >
                  Continuar para a entrega <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Login (secundário) */}
            <Accordion type="single" collapsible>
              <AccordionItem value="login" className="rounded-2xl border">
                <AccordionTrigger className="px-5 py-4 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> Já tenho cadastro
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-5 pb-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs font-semibold">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs font-semibold">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="rounded-lg"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void signInAndProceed(); } }}
                    />
                  </div>
                  {loginError && <p className="text-xs text-destructive">{loginError}</p>}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void signInAndProceed()}
                    disabled={loginLoading}
                    className="w-full rounded-full text-xs font-bold uppercase tracking-widest"
                  >
                    {loginLoading ? "Entrando..." : "Entrar e comprar"}
                  </Button>
                  <div className="text-center text-[11px] text-muted-foreground">
                    <Link to="/auth" search={{ redirect: "/loja/checkout" }} className="hover:text-primary">
                      Esqueci minha senha
                    </Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex items-center justify-center gap-4 border-t pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Mercado Pago</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-600" /> Criptografia E2E</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </StoreShell>
  );
}
