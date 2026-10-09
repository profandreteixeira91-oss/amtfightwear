import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories, createStoreOrder } from "@/lib/store/store.functions";
import { createMercadopagoPayment, getStoreMpPublicKey } from "@/lib/store/mercadopago.functions";
import { tokenizeStoreCard } from "@/lib/store/mp-card-token";
import { getMyCustomerProfile, saveMyCustomerProfile } from "@/lib/store/customer-profile.functions";
import { useCart, formatBRL } from "@/lib/store/cart-store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ShippingCalculator } from "@/components/store/ShippingCalculator";
import type { ShippingOption } from "@/lib/store/shipping.functions";
import { supabase } from "@/integrations/supabase/client";
import { trackStoreEvent, toAnalyticsItem } from "@/lib/store/analytics";
import { FREE_SHIPPING_THRESHOLD, PIX_DISCOUNT_RATE } from "@/lib/store/pricing";
import { TrustBadges } from "@/components/store/TrustBadges";

/** Rascunho local dos dados de entrega (evita retrabalho do cliente). */
const CHECKOUT_DRAFT_KEY = "amt-checkout-draft-v1";



export const Route = createFileRoute("/loja/checkout")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  },
  head: () => ({ meta: [{ title: "Checkout — AMT Fight Wear" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function CheckoutPage() {
  const { data: categories } = useSuspenseQuery(queryOptions({ queryKey: ["store", "categories"], queryFn: () => listStoreCategories() }));
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const createOrder = useServerFn(createStoreOrder);
  const createPayment = useServerFn(createMercadopagoPayment);
  const loadMpKey = useServerFn(getStoreMpPublicKey);
  const loadProfile = useServerFn(getMyCustomerProfile);
  const saveProfile = useServerFn(saveMyCustomerProfile);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");

  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState({ holderName: "", number: "", expiryMonth: "", expiryYear: "", ccv: "" });
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "", customer_document: "",
    zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });

  useEffect(() => {
    setMounted(true);
    // Restaura frete + CEP pré-selecionados no carrinho.
    try {
      const raw = sessionStorage.getItem("amt-checkout-shipping");
      if (raw) {
        const parsed = JSON.parse(raw) as { zip?: string; option?: ShippingOption };
        if (parsed.option) setShipping(parsed.option);
        if (parsed.zip) setForm((f) => ({ ...f, zip: parsed.zip! }));
      }
    } catch { /* ignore */ }
    supabase.auth.getSession().then(({ data }) => {
      const authed = !!data.session;
      setSignedIn(authed);
      if (!authed) {
        navigate({ to: "/loja/entrar", search: { redirect: "/loja/checkout" }, replace: true });
        return;
      }
      loadProfile().then((p) => {
        if (!p) return;
        setForm((f) => ({
          customer_name: p.full_name ?? f.customer_name,
          customer_email: p.email ?? f.customer_email,
          customer_phone: p.phone ?? f.customer_phone,
          customer_document: p.document ?? f.customer_document,
          zip: f.zip || p.zip || "",
          street: p.street ?? f.street,
          number: p.number ?? f.number,
          complement: p.complement ?? f.complement,
          neighborhood: p.neighborhood ?? f.neighborhood,
          city: p.city ?? f.city,
          state: p.state ?? f.state,
        }));
      }).catch(() => { /* ignore */ });
    });
  }, [loadProfile, navigate]);

  // Autosave dos dados de entrega — se o cliente sair e voltar, nada é perdido.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<typeof form>;
      setForm((f) => {
        const merged = { ...f };
        for (const [k, v] of Object.entries(draft)) {
          if (typeof v === "string" && v && !merged[k as keyof typeof merged]) {
            merged[k as keyof typeof merged] = v;
          }
        }
        return merged;
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try { window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
  }, [form, mounted]);

  useEffect(() => {
    if (!mounted || items.length === 0) return;
    trackStoreEvent("begin_checkout", {
      value: items.reduce((a, i) => a + i.quantity * i.unit_price, 0),
      items: items.map((i) =>
        toAnalyticsItem({ id: i.product_id, name: i.name, price: i.unit_price, quantity: i.quantity, variant: i.variant_label }),
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, items.length]);

  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const shippingCost = shipping?.price ?? 0;
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingDiscount = freeShipping ? shippingCost : 0;
  // Varejo: 5% de desconto à vista no PIX, sobre os produtos (não sobre o frete).
  const pixDiscount =
    paymentMethod === "PIX" ? Math.round(subtotal * PIX_DISCOUNT_RATE * 100) / 100 : 0;
  const total =
    Math.round((subtotal - pixDiscount + shippingCost - shippingDiscount) * 100) / 100;
  const freeShippingPct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);


  const handleZip = async (zip: string) => {
    setForm((f) => ({ ...f, zip }));
    const clean = zip.replace(/\D/g, "");
    if (clean.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const d = await r.json();
        if (!d.erro) {
          setForm((f) => ({
            ...f,
            street: d.logradouro ?? f.street,
            neighborhood: d.bairro ?? f.neighborhood,
            city: d.localidade ?? f.city,
            state: d.uf ?? f.state,
          }));
        }
      } catch { /* ignore */ }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!shipping) return toast.error("Selecione uma opção de frete");
    if (paymentMethod === "CREDIT_CARD") {
      if (!card.holderName || !card.number || !card.expiryMonth || !card.expiryYear || !card.ccv) {
        return toast.error("Preencha os dados do cartão");
      }
      if (!form.customer_document) {
        return toast.error("Informe o CPF do titular para pagar com cartão de crédito");
      }
    }
    setLoading(true);
    try {
      // Cartão: tokeniza no navegador antes de criar o pedido — os dados do
      // cartão nunca passam pelo nosso servidor e a bandeira vem do Mercado Pago.
      let cardToken: Awaited<ReturnType<typeof tokenizeStoreCard>> | null = null;
      if (paymentMethod === "CREDIT_CARD") {
        try {
          const { publicKey } = await loadMpKey({});
          cardToken = await tokenizeStoreCard(publicKey, { ...card, document: form.customer_document });
        } catch (tokErr) {
          toast.error(tokErr instanceof Error ? tokErr.message : "Não foi possível validar o cartão");
          setLoading(false);
          return;
        }
      }
      const res = await createOrder({
        data: {
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          customer_document: form.customer_document,
          shipping_address: {
            zip: form.zip, street: form.street, number: form.number, complement: form.complement,
            neighborhood: form.neighborhood, city: form.city, state: form.state,
          },
          shipping_cost: shipping.price,
          shipping_method: `${shipping.company} ${shipping.name}`,
          shipping_service_id: Number(shipping.id),
          payment_method: paymentMethod,
          items: items.map((i) => ({
            product_id: i.product_id,
            variant_id: i.variant_id ?? undefined,
            quantity: i.quantity,
          })),
        },
      });

      // Salva perfil fiscal
      if (signedIn) {
        try {
          await saveProfile({
            data: {
              full_name: form.customer_name || null,
              phone: form.customer_phone || null,
              document: form.customer_document || null,
              zip: form.zip || null,
              street: form.street || null,
              number: form.number || null,
              complement: form.complement || null,
              neighborhood: form.neighborhood || null,
              city: form.city || null,
              state: form.state ? form.state.toUpperCase() : null,
            },
          });
        } catch { /* não bloqueia o pedido */ }
      }

      // Cria cobrança no Mercado Pago
      try {
        await createPayment({
          data: {
            order_id: res.id,
            method: paymentMethod,
            installments: paymentMethod === "CREDIT_CARD" ? installments : undefined,
            ...(cardToken
              ? {
                  card_token: cardToken.cardToken,
                  payment_method_id: cardToken.paymentMethodId || undefined,
                  issuer_id: cardToken.issuerId ?? undefined,
                  card_last4: cardToken.last4,
                  card_bin: cardToken.bin,
                }
              : {}),
          },
        });
      } catch (payErr) {
        toast.error(payErr instanceof Error ? payErr.message : "Erro no pagamento");
        // Ainda navega para o pedido para permitir retry
        navigate({ to: "/loja/pedido/$id", params: { id: res.id } });
        return;
      }

      // Evento de conversão (purchase) antes de limpar o carrinho.
      trackStoreEvent("purchase", {
        transaction_id: res.order_number,
        value: total,
        shipping: shippingCost - shippingDiscount,
        payment_type: paymentMethod,
        items: items.map((i) =>
          toAnalyticsItem({ id: i.product_id, name: i.name, price: i.unit_price, quantity: i.quantity, variant: i.variant_label }),
        ),
      });
      try { localStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* ignore */ }

      clear();
      toast.success(`Pedido ${res.order_number} criado!`);
      navigate({ to: "/loja/pedido/$id", params: { id: res.id } });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };


  if (!mounted || signedIn !== true) return <StoreShell categories={categories}><div className="p-16 text-center text-sm text-muted-foreground">Redirecionando para login…</div></StoreShell>;

  if (items.length === 0) {
    return (
      <StoreShell categories={categories}>
        <div className="mx-auto max-w-2xl p-12 text-center">
          <p className="text-muted-foreground">Adicione produtos ao carrinho para finalizar.</p>
          <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground">Ir para a loja</Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell categories={categories}>
      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-black">Finalizar compra</h1>

        <div className="mb-6 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          Seus dados serão salvos automaticamente na sua conta para agilizar próximas compras.
        </div>



        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-bold">Seus dados</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome completo" value={form.customer_name} onChange={(v) => setForm((f) => ({ ...f, customer_name: v }))} required />
                <Field label="E-mail" type="email" value={form.customer_email} onChange={(v) => setForm((f) => ({ ...f, customer_email: v }))} required />
                <Field label="Telefone/WhatsApp" value={form.customer_phone} onChange={(v) => setForm((f) => ({ ...f, customer_phone: v }))} />
                <Field label="CPF" value={form.customer_document} onChange={(v) => setForm((f) => ({ ...f, customer_document: v }))} />
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-bold">Endereço de entrega</h2>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <Field label="CEP" value={form.zip} onChange={handleZip} required />
                </div>
                <div className="sm:col-span-4">
                  <Field label="Rua" value={form.street} onChange={(v) => setForm((f) => ({ ...f, street: v }))} required />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Número" value={form.number} onChange={(v) => setForm((f) => ({ ...f, number: v }))} required />
                </div>
                <div className="sm:col-span-4">
                  <Field label="Complemento" value={form.complement} onChange={(v) => setForm((f) => ({ ...f, complement: v }))} />
                </div>
                <div className="sm:col-span-3">
                  <Field label="Bairro" value={form.neighborhood} onChange={(v) => setForm((f) => ({ ...f, neighborhood: v }))} required />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Cidade" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} required />
                </div>
                <div className="sm:col-span-1">
                  <Field label="UF" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v.toUpperCase() }))} maxLength={2} required />
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-bold">Frete</h2>
              <ShippingCalculator
                items={items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id ?? null, quantity: i.quantity, unit_price: Number(i.unit_price) }))}
                initialZip={form.zip}
                selectedId={shipping?.id ?? null}
                onSelect={setShipping}
                compact
              />
            </section>

            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-3 font-bold">Pagamento</h2>
              <div className="mb-4 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                <div className="text-xs leading-relaxed">
                  <div className="font-bold text-foreground">Pagamento processado pelo Mercado Pago</div>
                  <p className="text-muted-foreground">
                    Ambiente 100% seguro com criptografia de ponta a ponta. Seus dados de pagamento
                    são protegidos pelo Mercado Pago — a AMT Fight Wear não armazena números de cartão.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["PIX", "CREDIT_CARD", "BOLETO"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-md border-2 px-3 py-2 text-sm font-bold transition ${paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-input hover:border-primary/50"}`}
                  >
                    {m === "PIX" ? "PIX" : m === "CREDIT_CARD" ? "Cartão de crédito" : "Boleto"}
                  </button>
                ))}
              </div>


              {paymentMethod === "PIX" && (
                <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  5% de desconto aplicado: você economiza {formatBRL(pixDiscount)}.
                </p>
              )}
              {paymentMethod === "PIX" && (
                <p className="mt-1 text-xs text-muted-foreground">Após confirmar, você verá o QR Code e o código Copia e Cola. O pedido é liberado automaticamente após a confirmação do pagamento.</p>
              )}
              {paymentMethod === "BOLETO" && (
                <p className="mt-3 text-xs text-muted-foreground">O boleto será gerado com vencimento em 3 dias úteis. O pedido é liberado após a compensação bancária.</p>
              )}

              {paymentMethod === "CREDIT_CARD" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Nome impresso no cartão" value={card.holderName} onChange={(v) => setCard((c) => ({ ...c, holderName: v.toUpperCase() }))} required />
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Número do cartão" value={card.number} onChange={(v) => setCard((c) => ({ ...c, number: v }))} required />
                  </div>
                  <Field label="Mês (MM)" value={card.expiryMonth} onChange={(v) => setCard((c) => ({ ...c, expiryMonth: v.replace(/\D/g, "").slice(0, 2) }))} maxLength={2} required />
                  <Field label="Ano (AAAA)" value={card.expiryYear} onChange={(v) => setCard((c) => ({ ...c, expiryYear: v.replace(/\D/g, "").slice(0, 4) }))} maxLength={4} required />
                  <Field label="CVV" value={card.ccv} onChange={(v) => setCard((c) => ({ ...c, ccv: v.replace(/\D/g, "").slice(0, 4) }))} maxLength={4} required />
                  <label className="block">
                    <span className="text-xs font-semibold text-muted-foreground">Parcelas *</span>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                        const enabled = n === 1 || (n <= 3 && total >= 200) || (n <= 5 && total >= 600) || (n <= 10 && total >= 1000);
                        if (!enabled) return null;
                        return (
                          <option key={n} value={n}>
                            {n}x de {formatBRL(total / n)}{n === 1 ? " à vista" : " sem juros"}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              )}
            </section>

          </div>

          <aside className="h-fit rounded-lg border bg-card p-5 lg:sticky lg:top-24">
            <h2 className="mb-3 font-bold">Resumo do pedido</h2>

            {/* Barra de progresso do frete grátis */}
            <div className="mb-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                <span className={freeShipping ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                  {freeShipping ? "Frete grátis conquistado!" : `Faltam ${formatBRL(FREE_SHIPPING_THRESHOLD - subtotal)} para frete grátis`}
                </span>
                <span className="text-muted-foreground">{Math.round(freeShippingPct)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${freeShipping ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${freeShippingPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 text-sm">

              {items.map((i) => (
                <div key={`${i.product_id}-${i.variant_id ?? ""}`} className="flex justify-between gap-2">
                  <span className="line-clamp-2 flex-1">{i.name} <span className="text-muted-foreground">×{i.quantity}</span></span>
                  <span className="font-semibold">{formatBRL(i.unit_price * i.quantity)}</span>
                </div>
              ))}
              <div className="mt-3 border-t pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete {shipping ? `(${shipping.company} ${shipping.name})` : ""}</span>
                <span>{shipping ? formatBRL(shippingCost) : "—"}</span>
              </div>
              {freeShipping && shipping && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Frete grátis (acima de {formatBRL(FREE_SHIPPING_THRESHOLD)})</span>
                  <span>−{formatBRL(shippingDiscount)}</span>
                </div>
              )}
              {pixDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                  <span>Desconto PIX (5%)</span>
                  <span>−{formatBRL(pixDiscount)}</span>
                </div>
              )}
              {!freeShipping && (
                <div className="text-xs text-muted-foreground">
                  Faltam {formatBRL(FREE_SHIPPING_THRESHOLD - subtotal)} para ganhar frete grátis.
                </div>
              )}
              <div className="mt-2 border-t pt-2 flex justify-between text-base font-black">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>
            <button disabled={loading} type="submit" className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {loading ? "Processando..." : "Confirmar pedido"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Compra 100% segura · processada pelo Mercado Pago
            </p>
            <div className="mt-4">
              <TrustBadges />
            </div>

          </aside>

        </div>
      </form>
    </StoreShell>
  );
}

function Field({ label, value, onChange, type = "text", required, maxLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}{required && " *"}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
