import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import {
  listStoreCategories,
  listWholesaleCatalog,
  createWholesaleOrder,
} from "@/lib/store/store.functions";
import { createMercadopagoPayment } from "@/lib/store/mercadopago.functions";
import { getMyCustomerProfile, saveMyCustomerProfile } from "@/lib/store/customer-profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, useCart } from "@/lib/store/cart-store";
import { KimonoGuideCallout } from "@/components/store/KimonoGuideLink";
import { ProductImage } from "@/components/store/ProductImage";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Upload, X, CheckCircle2, AlertCircle, Package, Search, ChevronDown, ChevronUp, ZoomIn, ShoppingBag, ArrowRight, LogIn } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { z } from "zod";
import { WholesaleProductCard } from "@/components/store/wholesale/WholesaleProductCard";
import { WholesaleHero } from "@/components/store/wholesale/WholesaleHero";
import { WholesaleSteps } from "@/components/store/wholesale/WholesaleSteps";
import { WholesaleSavingsBar } from "@/components/store/wholesale/WholesaleSavingsBar";
import {
  WholesaleSummaryPanel,
  WholesaleMobileBar,
} from "@/components/store/wholesale/WholesaleSummaryPanel";
import {
  WholesaleTiers,
  WholesaleComparison,
  WholesaleQuality,
  WholesaleWhyAmt,
  WholesaleFaq,
  WholesaleCta,
  WholesaleFooterLinks,
} from "@/components/store/wholesale/WholesaleSections";

const catalogQuery = queryOptions({
  queryKey: ["store", "wholesale-catalog"],
  queryFn: () => listWholesaleCatalog(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

const DRAFT_KEY = "amt.wholesale.draft.v1";

export const Route = createFileRoute("/loja/atacado")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ resume: z.union([z.literal("1"), z.literal(1), z.boolean()]).optional() }).parse(s),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(catalogQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Atacado AMT Fight Wear | Compre direto da fábrica com 25% OFF" },
      { name: "description", content: "Monte pedidos B2B de faixas, kimonos, patches e rashguards com 25% OFF, personalização profissional e etiqueta grátis. Mínimo 10 unidades por subcategoria." },
      { property: "og:title", content: "Atacado AMT Fight Wear — direto da fábrica" },
      { property: "og:description", content: "Montador de pedidos B2B para academias, equipes e revendedores: 25% OFF, personalização e entrega para todo Brasil." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://amtfightwear.com.br/loja/atacado" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/loja/atacado" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: "https://amtfightwear.com.br/" },
                { "@type": "ListItem", position: 2, name: "Atacado", item: "https://amtfightwear.com.br/loja/atacado" },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "Qual é a quantidade mínima para atacado?", acceptedAnswer: { "@type": "Answer", text: "São 10 unidades por subcategoria, podendo misturar modelos e tamanhos." } },
                { "@type": "Question", name: "Qual o prazo de produção?", acceptedAnswer: { "@type": "Answer", text: "10 dias úteis após a confirmação do pagamento, mais o prazo de transporte." } },
                { "@type": "Question", name: "Quais formas de pagamento?", acceptedAnswer: { "@type": "Answer", text: "PIX, boleto e cartão de crédito com parcelamento sem juros conforme o valor." } },
                { "@type": "Question", name: "Como funciona a personalização?", acceptedAnswer: { "@type": "Answer", text: "Envie o logotipo no resumo do pedido para aplicarmos na etiqueta personalizada, sem custo adicional." } },
              ],
            },
          ],
        }),
      },
    ],
  }),


  component: WholesalePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

type Cat = { id: string; slug: string; name: string; parent_id: string | null };
type Prod = {
  id: string;
  name: string;
  slug: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  category_id: string | null;
  short_description: string | null;
  wholesale_discount_percent?: number | string | null;
};
type Variant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  option_label: string | null;
  sku: string | null;
  price: number | string | null;
  sort_order: number;
  active: boolean;
};

const NO_VARIANT = "__none__";
const keyOf = (pid: string, vid: string | null) => `${pid}::${vid ?? NO_VARIANT}`;

function WholesalePage() {
  const { data: catalog } = useSuspenseQuery(catalogQuery);
  const { data: cats } = useSuspenseQuery(catsQuery);
  const navigate = useNavigate();
  const createOrder = useServerFn(createWholesaleOrder);

  const categories = catalog.categories as Cat[];
  const products = catalog.products as Prod[];
  const variants = (catalog.variants ?? []) as Variant[];
  const settings = (catalog as { settings?: { enabled: boolean; default_discount_percent: number; min_qty_per_subcategory: number; conditions: string } }).settings ?? {
    enabled: true, default_discount_percent: 25, min_qty_per_subcategory: 10, conditions: "",
  };
  const DEFAULT_PCT = settings.default_discount_percent;
  const MIN_PER_SUBCAT = settings.min_qty_per_subcategory;
  const productPct = (p: Prod) => {
    const v = p.wholesale_discount_percent;
    if (v == null || v === "") return DEFAULT_PCT;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(90, n)) : DEFAULT_PCT;
  };

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, Variant[]>();
    for (const v of variants) {
      const arr = m.get(v.product_id) ?? [];
      arr.push(v);
      m.set(v.product_id, arr);
    }
    return m;
  }, [variants]);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Resolve the root (top-level) ancestor for any category id
  const rootOf = useMemo(() => {
    const m = new Map<string, Cat>();
    const resolve = (id: string): Cat | null => {
      const seen = new Set<string>();
      let cur = catById.get(id) ?? null;
      while (cur && cur.parent_id && !seen.has(cur.id)) {
        seen.add(cur.id);
        const parent = catById.get(cur.parent_id);
        if (!parent) break;
        cur = parent;
      }
      return cur;
    };
    for (const c of categories) {
      const r = resolve(c.id);
      if (r) m.set(c.id, r);
    }
    return m;
  }, [categories, catById]);

  // Group products by leaf subcategory (their direct category_id)
  const grouped = useMemo(() => {
    const m = new Map<string, { cat: Cat | null; items: Prod[] }>();
    for (const p of products) {
      const key = p.category_id ?? "__none__";
      const g = m.get(key) ?? { cat: p.category_id ? catById.get(p.category_id) ?? null : null, items: [] };
      g.items.push(p);
      m.set(key, g);
    }
    return Array.from(m.entries()).sort((a, b) => {
      const an = a[1].cat?.name ?? "zz";
      const bn = b[1].cat?.name ?? "zz";
      return an.localeCompare(bn);
    });
  }, [products, catById]);

  // Group subcategories by their root (top-level) category
  const rootGroups = useMemo(() => {
    const m = new Map<string, { root: Cat | null; subs: typeof grouped; totalProducts: number }>();
    for (const [key, g] of grouped) {
      const rid = g.cat ? (rootOf.get(g.cat.id)?.id ?? g.cat.id) : "__none__";
      const cur = m.get(rid) ?? {
        root: g.cat ? rootOf.get(g.cat.id) ?? g.cat : null,
        subs: [] as typeof grouped,
        totalProducts: 0,
      };
      cur.subs.push([key, g]);
      cur.totalProducts += g.items.length;
      m.set(rid, cur);
    }
    return Array.from(m.entries()).sort((a, b) => {
      const an = a[1].root?.name ?? "zz";
      const bn = b[1].root?.name ?? "zz";
      return an.localeCompare(bn);
    });
  }, [grouped, rootOf]);

  // qty keyed by `${productId}::${variantId|__none__}`
  const [qty, setQty] = useState<Record<string, number>>({});
  const setLineQty = (pid: string, vid: string | null, q: number) =>
    setQty((s) => ({ ...s, [keyOf(pid, vid)]: Math.max(0, q) }));
  const productTotal = (pid: string) => {
    const vs = variantsByProduct.get(pid);
    if (!vs || vs.length === 0) return qty[keyOf(pid, null)] ?? 0;
    return vs.reduce((a, v) => a + (qty[keyOf(pid, v.id)] ?? 0), 0);
  };


  // Visualization controls
  const [search, setSearch] = useState("");
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [zoomImg, setZoomImg] = useState<{ src: string; alt: string } | null>(null);
  const toggleCollapse = (key: string) =>
    setCollapsed((s) => ({ ...s, [key]: !s[key] }));


  // Totals per subcategory (aggregating variant-level quantities)
  const catTotals = useMemo(() => {
    const m = new Map<string, { qty: number; original: number; discounted: number }>();
    for (const p of products) {
      const pct = productPct(p) / 100;
      const vs = variantsByProduct.get(p.id);
      const lines = vs && vs.length > 0
        ? vs.map((v) => ({ q: qty[keyOf(p.id, v.id)] ?? 0, unit: Number(v.price ?? p.price) }))
        : [{ q: qty[keyOf(p.id, null)] ?? 0, unit: Number(p.price) }];
      for (const { q, unit } of lines) {
        if (q <= 0) continue;
        const key = p.category_id ?? "__none__";
        const original = unit * q;
        const discounted = original * (1 - pct);
        const cur = m.get(key) ?? { qty: 0, original: 0, discounted: 0 };
        cur.qty += q;
        cur.original += original;
        cur.discounted += discounted;
        m.set(key, cur);
      }
    }
    return m;
  }, [qty, products, variantsByProduct, DEFAULT_PCT]);



  const selectedCats = [...catTotals.entries()];
  const totalQty = selectedCats.reduce((a, [, v]) => a + v.qty, 0);
  const subtotalOriginal = selectedCats.reduce((a, [, v]) => a + v.original, 0);
  const subtotal = selectedCats.reduce((a, [, v]) => a + v.discounted, 0);
  const savings = subtotalOriginal - subtotal;
  const invalidCats = selectedCats.filter(([, v]) => v.qty < MIN_PER_SUBCAT);
  const canProceed = selectedCats.length > 0 && invalidCats.length === 0;
  // Unidades que faltam para liberar o desconto na subcategoria mais próxima do mínimo.
  const missingUnits = invalidCats.length
    ? Math.min(...invalidCats.map(([, v]) => MIN_PER_SUBCAT - v.qty))
    : Math.max(0, MIN_PER_SUBCAT - totalQty);
  // Fotos reais do catálogo (nunca ilustrações) para o hero e a seção de qualidade.
  const catalogPhotos = useMemo(
    () => products.filter((p) => p.image_url).map((p) => ({ src: p.image_url, alt: p.name })),
    [products],
  );
  const heroPhotos = catalogPhotos.slice(0, 4);
  const qualityPhotos = catalogPhotos.slice(4, 9).length >= 5 ? catalogPhotos.slice(4, 9) : catalogPhotos.slice(0, 5);
  const scrollToCatalog = () => {
    document.getElementById("catalogo-atacado")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const summaryLines = selectedCats.map(([key, v]) => ({
    key,
    name: catById.get(key)?.name ?? "Sem categoria",
    qty: v.qty,
    total: v.discounted,
    ok: v.qty >= MIN_PER_SUBCAT,
  }));

  const [labelLogo, setLabelLogo] = useState<{ data_url: string; filename: string } | null>(null);
  const onUploadLogo = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 4 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLabelLogo({ data_url: reader.result as string, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD" | "BOLETO">("PIX");
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState({ holderName: "", number: "", expiryMonth: "", expiryYear: "", ccv: "" });
  const loadProfile = useServerFn(getMyCustomerProfile);
  const saveProfile = useServerFn(saveMyCustomerProfile);
  const createPayment = useServerFn(createMercadopagoPayment);
  const routeSearch = Route.useSearch();
  const resumeFlag = !!routeSearch.resume;

  // Resumo abre apenas via clique explícito em "Adicionar ao carrinho" (não em mudanças de quantidade).
  // Force-close when jumping to checkout step so the user sees the form summary.
  useEffect(() => {
    if (step === "checkout") setSheetOpen(false);
  }, [step]);
  // Hijack the global header cart button: on this page it opens the wholesale summary
  // instead of the (unused) generic cart drawer.
  const globalCartOpen = useCart((s) => s.isOpen);
  const closeGlobalCart = useCart((s) => s.close);
  useEffect(() => {
    if (globalCartOpen) {
      closeGlobalCart();
      setSheetOpen(true);
    }
  }, [globalCartOpen, closeGlobalCart]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_document: "",
    zip: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const draftRestored = useRef(false);

  // Restore draft (qty, labelLogo, form) from sessionStorage on mount.
  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as {
          qty?: Record<string, number>;
          labelLogo?: { data_url: string; filename: string } | null;
          form?: typeof form;
          activeRoot?: string | null;
        };
        if (d.qty && Object.keys(d.qty).length > 0) setQty(d.qty);
        if (d.labelLogo) setLabelLogo(d.labelLogo);
        if (d.form) setForm((f) => ({ ...f, ...d.form }));
        if (d.activeRoot) setActiveRoot(d.activeRoot);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist draft continuously so it survives an auth redirect round-trip.
  useEffect(() => {
    try {
      const hasItems = Object.values(qty).some((n) => n > 0);
      if (!hasItems && !labelLogo) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ qty, labelLogo, form, activeRoot }),
      );
    } catch { /* ignore */ }
  }, [qty, labelLogo, form, activeRoot]);

  // Detect signed-in state and, on sign-in, prefill from the customer profile.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const authed = !!data.session;
      setSignedIn(authed);
      if (!authed) return;
      const email = data.session?.user.email;
      loadProfile().then((p) => {
        if (!mounted) return;
        setForm((f) => ({
          customer_name: p?.full_name ?? f.customer_name,
          customer_email: p?.email ?? email ?? f.customer_email,
          customer_phone: p?.phone ?? f.customer_phone,
          customer_document: p?.document ?? f.customer_document,
          zip: p?.zip ?? f.zip,
          street: p?.street ?? f.street,
          number: p?.number ?? f.number,
          complement: p?.complement ?? f.complement,
          neighborhood: p?.neighborhood ?? f.neighborhood,
          city: p?.city ?? f.city,
          state: p?.state ?? f.state,
          notes: f.notes,
        }));
      }).catch(() => { /* ignore */ });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);


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

  const proceedToCheckout = () => {
    if (!canProceed) {
      toast.error(`Mínimo ${MIN_PER_SUBCAT} unidades por subcategoria`);
      return;
    }
    if (signedIn === null) return; // still resolving
    if (!signedIn) {
      toast.info("Entre ou crie sua conta para finalizar o pedido");
      navigate({ to: "/auth", search: { redirect: "/loja/atacado?resume=1" } });
      return;
    }
    setStep("checkout");
    setSheetOpen(false);
  };

  // If the user just returned from /auth with ?resume=1, jump straight to checkout
  // once auth state and the draft are ready.
  useEffect(() => {
    if (!resumeFlag) return;
    if (signedIn !== true) return;
    if (!canProceed) return;
    if (step === "checkout") return;
    setStep("checkout");
    setSheetOpen(false);
    // Clear the query param without adding history entry
    navigate({ to: "/loja/atacado", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFlag, signedIn, canProceed]);

  const onGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { authService } = await import("@/services/authService");
      const result = await authService.signInWithGoogle();
      if (result.error) toast.error("Falha ao entrar com Google", { description: String(result.error) });
    } catch (e) {
      toast.error("Falha ao entrar com Google", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setGoogleLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return toast.error("Regra de atacado não atendida");
    if (!signedIn) {
      navigate({ to: "/auth", search: { redirect: "/loja/atacado?resume=1" } });
      return;
    }
    if (paymentMethod === "CREDIT_CARD") {
      if (!card.holderName || !card.number || !card.expiryMonth || !card.expiryYear || !card.ccv) {
        return toast.error("Preencha os dados do cartão");
      }
    }
    setLoading(true);
    try {
      const items = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([k, quantity]) => {
          const [product_id, vidRaw] = k.split("::");
          return { product_id, variant_id: vidRaw === NO_VARIANT ? null : vidRaw, quantity };
        });
      const res = await createOrder({
        data: {
          customer_email: form.customer_email,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone || null,
          customer_document: form.customer_document || null,
          shipping_address: {
            zip: form.zip,
            street: form.street,
            number: form.number,
            complement: form.complement || null,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          },
          items,
          label_logo: labelLogo,
          notes: form.notes || null,
        },
      });

      // Save profile for next purchase (non-blocking).
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
      } catch { /* ignore */ }

      // Create Asaas charge.
      try {
        await createPayment({
          data: {
            order_id: res.id,
            method: paymentMethod,
            installments: paymentMethod === "CREDIT_CARD" ? installments : undefined,
            card: paymentMethod === "CREDIT_CARD" ? card : undefined,
          },
        });
      } catch (payErr) {
        toast.error(payErr instanceof Error ? payErr.message : "Erro no pagamento");
        sessionStorage.removeItem(DRAFT_KEY);
        navigate({ to: "/loja/pedido/$id", params: { id: res.id } });
        return;
      }

      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("Pedido de atacado criado!");
      navigate({ to: "/loja/pedido/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };


  return (
    <StoreShell categories={cats}>
      <WholesaleHero
        discountPercent={DEFAULT_PCT}
        minPerSubcategory={MIN_PER_SUBCAT}
        conditions={settings.conditions}
        photos={heroPhotos}
        onStart={scrollToCatalog}
        onCatalog={scrollToCatalog}
      />
      <WholesaleSteps current={step === "checkout" ? 3 : totalQty > 0 ? 1 : 0} />

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <KimonoGuideCallout />
      </div>

      <div id="catalogo-atacado" className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">

        {/* Left - catalog / checkout */}
        <div className="min-w-0 space-y-4">
          {step === "cart" && (
            <>
              <WholesaleSavingsBar
                totalQty={totalQty}
                missingUnits={missingUnits}
                minPerSubcategory={MIN_PER_SUBCAT}
                savings={savings}
                unlocked={canProceed && totalQty > 0}
              />
              <WholesaleTiers minPerSubcategory={MIN_PER_SUBCAT} discountPercent={DEFAULT_PCT} />
            </>
          )}

          {step === "cart" ? (
            <div className="space-y-6">
              {activeRoot === null ? (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-black">Escolha uma categoria</h2>
                    <p className="text-sm text-muted-foreground">Selecione a categoria para ver os produtos e subcategorias disponíveis.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rootGroups.map(([rid, rg]) => {
                      const rootQty = rg.subs.reduce((a, [k]) => a + (catTotals.get(k)?.qty ?? 0), 0);
                      return (
                        <button
                          key={rid}
                          type="button"
                          onClick={() => { setActiveRoot(rid); setActiveCatFilter(null); }}
                          className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
                        >
                          <span>
                            <span className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</span>
                            <span className="block text-base font-black">{rg.root?.name ?? "Sem categoria"}</span>
                            <span className="block text-xs text-muted-foreground">
                              {rg.subs.length} subcategoria{rg.subs.length === 1 ? "" : "s"} · {rg.totalProducts} produtos
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            {rootQty > 0 && (
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{rootQty} un.</span>
                            )}
                            <ChevronDown className="h-5 w-5 -rotate-90 text-muted-foreground transition group-hover:text-primary" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {rootGroups.length === 0 && (
                    <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
                      Nenhum produto disponível no momento.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    const rg = rootGroups.find(([rid]) => rid === activeRoot)?.[1];
                    if (!rg) return null;
                    return (
                      <>
                        {/* Header: back + search + subcategory chips */}
                        <div className="sticky top-[calc(var(--header-h,140px))] z-10 space-y-2 rounded-xl border bg-card/95 p-2 backdrop-blur">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setActiveRoot(null); setActiveCatFilter(null); }}
                              className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-accent"
                            >
                              ← Categorias
                            </button>
                            <div className="flex flex-1 items-center gap-2 rounded-md border bg-background px-3">
                              <Search className="h-4 w-4 text-muted-foreground" />
                              <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Buscar em ${rg.root?.name ?? "categoria"}...`}
                                className="w-full bg-transparent px-1 py-2 text-sm outline-none"
                              />
                              {search && (
                                <button type="button" onClick={() => setSearch("")} className="rounded p-1 hover:bg-accent" aria-label="Limpar">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <select
                            value={activeCatFilter ?? ""}
                            onChange={(e) => setActiveCatFilter(e.target.value || null)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                          >
                            <option value="">Todas as subcategorias ({rg.subs.length})</option>
                            {rg.subs.map(([key, g]) => {
                              const qty = catTotals.get(key)?.qty ?? 0;
                              return (
                                <option key={key} value={key}>
                                  {g.cat?.name ?? "Sem categoria"}{qty > 0 ? ` · ${qty} un.` : ""}
                                </option>
                              );
                            })}
                          </select>

                        </div>

                        {rg.subs
                          .filter(([key]) => activeCatFilter === null || activeCatFilter === key)
                          .map(([key, g]) => {
                            const totals = catTotals.get(key);
                            const groupQty = totals?.qty ?? 0;
                            const ok = groupQty >= MIN_PER_SUBCAT;
                            const q = search.trim().toLowerCase();
                            const items = q ? g.items.filter((p) => p.name.toLowerCase().includes(q)) : g.items;
                            if (items.length === 0) return null;
                            const isCollapsed = collapsed[key];
                            return (

                    <section key={key} id={`cat-${key}`} className="rounded-xl border bg-card">
                      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(key)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-md border">
                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </span>
                          <span>
                            <span className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Subcategoria</span>
                            <span className="block text-lg font-black">{g.cat?.name ?? "Sem categoria"}</span>
                            <span className="block text-xs text-muted-foreground">{items.length} produtos</span>
                          </span>
                        </button>
                        <div
                          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold ${
                            groupQty === 0
                              ? "bg-muted text-muted-foreground"
                              : ok
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {groupQty === 0 ? (
                            <>Mínimo {MIN_PER_SUBCAT} unidades</>
                          ) : ok ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> {groupQty} un. · OK
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" /> {groupQty}/{MIN_PER_SUBCAT} un.
                            </>
                          )}
                        </div>
                      </header>
                      {!isCollapsed && (
                        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                          {items.map((p) => (
                            <WholesaleProductCard
                              key={p.id}
                              product={p}
                              variants={variantsByProduct.get(p.id) ?? []}
                              qtyOf={(vid) => qty[keyOf(p.id, vid)] ?? 0}
                              setQty={(vid, q) => setLineQty(p.id, vid, q)}
                              discountPercent={productPct(p)}
                              categoryName={g.cat?.name ?? null}
                              minPerSubcategory={MIN_PER_SUBCAT}
                              onZoom={setZoomImg}
                              onAdd={() => setSheetOpen(true)}
                            />
                          ))}
                        </div>
                      )}

                    </section>
                  );
                          })}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

          ) : (
            <form onSubmit={submit} className="space-y-4">
              {signedIn === false && (
                <div className="flex flex-col items-start justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                  <div className="text-sm">
                    <div className="font-semibold">Entre para concluir seu pedido</div>
                    <div className="text-muted-foreground">Use sua conta AMT para agilizar próximas compras.</div>
                  </div>
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    disabled={googleLoading}
                    className="inline-flex items-center gap-2 rounded-md border-2 border-primary bg-background px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <LogIn className="h-4 w-4" />
                    {googleLoading ? "Abrindo..." : "Entrar com Google"}
                  </button>
                </div>
              )}
              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Dados do cliente</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input required placeholder="Nome / Razão social" value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input required type="email" placeholder="E-mail" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input placeholder="Telefone / WhatsApp" value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input placeholder="CPF / CNPJ" value={form.customer_document} onChange={(e) => setForm((f) => ({ ...f, customer_document: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Endereço de entrega</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
                  <input required placeholder="CEP" value={form.zip} onChange={(e) => handleZip(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required placeholder="Rua" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-3" />
                  <input required placeholder="Nº" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input placeholder="Complemento" value={form.complement} onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required placeholder="Bairro" value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required placeholder="Cidade" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input required maxLength={2} placeholder="UF" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} className="rounded-md border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-primary" />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Observações</h2>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Instruções específicas de fabricação, cores, tamanhos, etc."
                  className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-black">Forma de pagamento</h2>
                <div className="mt-3 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  <div className="text-xs leading-relaxed">
                    <div className="font-bold text-foreground">Pagamento processado pelo Mercado Pago</div>
                    <p className="text-muted-foreground">Ambiente 100% seguro com criptografia de ponta a ponta. A AMT Fight Wear não armazena dados de cartão.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">

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
                  <p className="mt-3 text-xs text-muted-foreground">Após confirmar, você verá o QR Code e o Copia e Cola. O pedido entra em produção assim que o pagamento é confirmado.</p>
                )}
                {paymentMethod === "BOLETO" && (
                  <p className="mt-3 text-xs text-muted-foreground">O boleto é gerado com vencimento em 3 dias úteis. O pedido é liberado após a compensação bancária.</p>
                )}
                {paymentMethod === "CREDIT_CARD" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input required placeholder="Nome impresso no cartão" value={card.holderName} onChange={(e) => setCard((c) => ({ ...c, holderName: e.target.value.toUpperCase() }))} className="rounded-md border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-primary sm:col-span-2" />
                    <input required placeholder="Número do cartão" value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                    <input required maxLength={2} placeholder="Mês (MM)" value={card.expiryMonth} onChange={(e) => setCard((c) => ({ ...c, expiryMonth: e.target.value.replace(/\D/g, "").slice(0, 2) }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    <input required maxLength={4} placeholder="Ano (AAAA)" value={card.expiryYear} onChange={(e) => setCard((c) => ({ ...c, expiryYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    <input required maxLength={4} placeholder="CVV" value={card.ccv} onChange={(e) => setCard((c) => ({ ...c, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                        const enabled = (n === 1) || (n <= 3 && subtotal >= 200) || (n <= 5 && subtotal >= 600) || (n <= 10 && subtotal >= 1000);
                        if (!enabled) return null;
                        return (
                          <option key={n} value={n}>
                            {n}x de {formatBRL(subtotal / n)} sem juros
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setStep("cart")} className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent">
                  ← Voltar ao pedido
                </button>
                <button type="submit" disabled={loading || !canProceed} className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {loading ? "Processando..." : `Pagar · ${formatBRL(subtotal)}`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right — resumo fixo do pedido (desktop) */}
        <div className="hidden lg:block">
          <WholesaleSummaryPanel
            lines={summaryLines}
            totalQty={totalQty}
            subtotalOriginal={subtotalOriginal}
            subtotal={subtotal}
            savings={savings}
            minPerSubcategory={MIN_PER_SUBCAT}
            canProceed={canProceed}
            signedIn={signedIn}
            onCheckout={() => {
              if (!signedIn) {
                navigate({ to: "/auth", search: { redirect: "/loja/atacado?resume=1" } });
                return;
              }
              setStep("checkout");
            }}
            onOpenDetails={() => setSheetOpen(true)}
          />
        </div>

        </div>

        <WholesaleComparison />
        <WholesaleQuality photos={qualityPhotos} />
        <WholesaleWhyAmt />
        <div id="faq-atacado" className="scroll-mt-32">
          <WholesaleFaq minQty={MIN_PER_SUBCAT} pct={DEFAULT_PCT} />
        </div>
        <WholesaleCta onStart={scrollToCatalog} />
        <WholesaleFooterLinks />
        <div className="h-24 lg:hidden" aria-hidden />
      </div>

      <WholesaleMobileBar
        totalQty={totalQty}
        subtotal={subtotal}
        savings={savings}
        canProceed={canProceed}
        signedIn={signedIn}
        onOpenDetails={() => setSheetOpen(true)}
        onCheckout={() => {
          if (!signedIn) {
            navigate({ to: "/auth", search: { redirect: "/loja/atacado?resume=1" } });
            return;
          }
          setStep("checkout");
        }}
      />


      {/* Slide-right cart drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="flex items-center gap-2 text-base font-black">
              <ShoppingBag className="h-5 w-5" /> Resumo do atacado
              {totalQty > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{totalQty}</span>
              )}
            </h3>
          </div>

          <div className="flex-1 space-y-3 px-5 py-4">
            {/* Label logo */}
            <div className="rounded-lg border border-dashed p-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Etiqueta personalizada · Grátis</div>
              <div className="mt-1 text-xs text-muted-foreground">Envie o logotipo (PNG/JPG, até 4 MB) para aplicarmos na etiqueta.</div>
              {labelLogo ? (
                <div className="mt-2 flex items-center gap-2 rounded-md border bg-background p-2">
                  <img src={labelLogo.data_url} alt="Logo" className="h-10 w-10 rounded object-contain" />
                  <div className="min-w-0 flex-1 truncate text-xs">{labelLogo.filename}</div>
                  <button type="button" onClick={() => setLabelLogo(null)} className="rounded p-1 hover:bg-accent" aria-label="Remover">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" />
                  Enviar logotipo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadLogo(f);
                    }}
                  />
                </label>
              )}
            </div>

            {selectedCats.length === 0 ? (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Selecione produtos para ver o resumo.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {selectedCats.map(([key, v]) => {
                  const cat = key === "__none__" ? null : catById.get(key);
                  const ok = v.qty >= MIN_PER_SUBCAT;
                  return (
                    <div key={key} className={`rounded-md border p-2 text-xs ${ok ? "" : "border-amber-500/40 bg-amber-500/5"}`}>
                      <div className="font-medium">{cat?.name ?? "Sem categoria"}</div>
                      <div className="mt-0.5 flex items-center justify-between text-muted-foreground">
                        <span>
                          {v.qty} un. {ok ? "" : `· faltam ${MIN_PER_SUBCAT - v.qty}`}
                        </span>
                        <span className="font-semibold text-foreground">{formatBRL(v.discounted)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Itens</span>
                <span>{totalQty}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sem desconto</span>
                <span className="line-through">{formatBRL(subtotalOriginal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Desconto atacado</span>
                <span>− {formatBRL(savings)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t pt-2 text-base font-black">
                <span>Total</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
              <Package className="h-4 w-4 text-primary" />
              <span>Prazo padrão de produção: <strong className="text-foreground">10 dias úteis</strong></span>
            </div>

            {!canProceed && selectedCats.length > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>É necessário ter no mínimo {MIN_PER_SUBCAT} unidades por subcategoria para prosseguir.</span>
              </div>
            )}
          </div>

          <div className="border-t bg-card px-5 py-4">
            <button
              type="button"
              disabled={!canProceed}
              onClick={proceedToCheckout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signedIn === false ? (<>Entrar para finalizar <ArrowRight className="h-4 w-4" /></>) : (<>Confirmar e ir ao pagamento <ArrowRight className="h-4 w-4" /></>)}
            </button>
            {signedIn === false && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Você precisa entrar ou criar uma conta para continuar. Seu pedido fica salvo.
              </p>
            )}
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-2 block w-full text-center text-sm text-muted-foreground hover:text-primary"
            >
              Continuar comprando
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {zoomImg && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setZoomImg(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-background text-foreground shadow-lg hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={zoomImg.src}
            alt={zoomImg.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </StoreShell>
  );
}
