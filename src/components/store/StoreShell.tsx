import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ShoppingBag, User, Menu, Instagram, Truck, ShieldCheck, CreditCard, LogIn, ChevronDown, LogOut, Package, Search, X } from "lucide-react";
import { useCart } from "@/lib/store/cart-store";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import amtLogo from "@/assets/amt-logo.jpg";
import { ProductImage } from "@/components/store/ProductImage";
import { CartSheet } from "@/components/store/CartSheet";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { pixPriceFor, installmentLabel, formatMoney, FREE_SHIPPING_THRESHOLD } from "@/lib/store/pricing";
import { SearchBar } from "@/components/store/SearchBar";
import { recordStoreVisit } from "@/lib/store/visits.functions";
import { ChatWidget } from "@/components/store/ChatWidget";
import { NotificationsBell } from "@/components/store/NotificationsBell";



type StoreCategory = { id?: string; slug: string; name: string; parent_id?: string | null };

function SubcategoryItem({
  category,
  childrenByParent,
}: {
  category: StoreCategory;
  childrenByParent: Map<string, StoreCategory[]>;
}) {
  const kids = category.id ? childrenByParent.get(category.id) ?? [] : [];
  if (kids.length === 0) {
    return (
      <Link
        to="/loja/categoria/$slug"
        params={{ slug: category.slug }}
        className="block rounded px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-primary"
      >
        {category.name}
      </Link>
    );
  }
  return (
    <div className="group/sub relative">
      <Link
        to="/loja/categoria/$slug"
        params={{ slug: category.slug }}
        className="flex items-center justify-between gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-primary group-hover/sub:bg-accent"
      >
        <span>{category.name}</span>
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01-.02-1.06L11.06 10 7.19 6.29a.75.75 0 111.04-1.08l4.39 4.25a.75.75 0 010 1.08l-4.39 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </Link>
      <div
        className="invisible absolute left-full top-0 z-50 ml-1 min-w-[220px] -translate-x-1 rounded-md border bg-popover p-2 opacity-0 shadow-lg transition-all duration-150 group-hover/sub:visible group-hover/sub:translate-x-0 group-hover/sub:opacity-100 focus-within:visible focus-within:translate-x-0 focus-within:opacity-100"
        role="menu"
      >
        <Link
          to="/loja/categoria/$slug"
          params={{ slug: category.slug }}
          className="block rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Ver tudo em {category.name}
        </Link>
        <div className="my-1 h-px bg-border" />
        {kids.map((k) => (
          <SubcategoryItem key={k.slug} category={k} childrenByParent={childrenByParent} />
        ))}
      </div>
    </div>
  );
}

export function StoreShell({ children, categories }: { children: ReactNode; categories?: Array<StoreCategory> }) {
  const cats = categories ?? [];
  const topCategories = cats.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, StoreCategory[]>();
  for (const c of cats) {
    if (c.parent_id) {
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }
  }

  const [mounted, setMounted] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [accountOpen]);

  // Track store visits (anon + authed). One record per pathname change per tab.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setMobileNavOpen(false);
    setMobileSearchOpen(false);
    if (typeof window === "undefined") return;
    if (!pathname.startsWith("/loja") && pathname !== "/") return;
    let sid = window.sessionStorage.getItem("amt_sid");
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.sessionStorage.setItem("amt_sid", sid);
    }
    recordStoreVisit({
      data: {
        session_id: sid,
        path: pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent.slice(0, 500),
      },
    }).catch(() => {});
  }, [pathname]);


  // Força tema claro em toda a loja: remove a classe .dark do <html> enquanto o
  // StoreShell estiver montado e observa mudanças (ex.: ThemeProvider re-aplicando
  // por preferência do sistema) para reverter imediatamente. Restaura no unmount.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const prevColorScheme = root.style.colorScheme;
    const forceLight = () => {
      if (root.classList.contains("dark")) root.classList.remove("dark");
      root.style.colorScheme = "light";
    };
    forceLight();
    const observer = new MutationObserver(forceLight);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      if (hadDark) root.classList.add("dark");
      root.style.colorScheme = prevColorScheme;
    };
  }, []);

  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));

  return (
    <div className="store-scope min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Top bar */}
      <div className="bg-foreground text-background text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <span className="truncate">
            <span className="hidden sm:inline">Frete grátis acima de R$ 399 · Parcelamos em até 10x</span>
            <span className="sm:hidden">Frete grátis · até 10x sem juros</span>
          </span>
          <a href="https://instagram.com/amtfightwear" target="_blank" rel="noreferrer" className="hidden sm:inline-flex shrink-0 items-center gap-1 hover:text-primary">
            <Instagram className="h-3 w-3" /> @amtfightwear
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden -ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" aria-label="Loja AMT Fight Wear — página inicial" className="flex min-w-0 items-center gap-2">
            <img src={amtLogo} alt="Logotipo da Loja AMT Fight Wear" className="h-9 w-9 shrink-0 rounded object-cover" />
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-black tracking-tight">Loja AMT</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fight Wear</div>
            </div>
          </Link>

          <SearchBar />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            >
              <Search className="h-5 w-5" />
            </button>
            {mounted && isAuthed ? <NotificationsBell authed={isAuthed} /> : null}
            {mounted && isAuthed ? (
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-primary sm:px-3"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Minha conta</span>
                  <ChevronDown className="hidden sm:inline h-3 w-3 opacity-60" />
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-1 shadow-lg"
                  >
                    <Link
                      to="/loja/conta"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent hover:text-primary"
                    >
                      <User className="h-4 w-4" /> Meus dados
                    </Link>
                    <Link
                      to="/loja/conta/pedidos"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent hover:text-primary"
                    >
                      <Package className="h-4 w-4" /> Meus pedidos
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      onClick={async () => {
                        setAccountOpen(false);
                        await supabase.auth.signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent hover:text-primary"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/loja/entrar"
                search={{ redirect: "/loja/conta" }}
                aria-label="Entrar"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:px-3"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => useCart.getState().open()}
              aria-label="Abrir carrinho"
              className="relative inline-flex items-center gap-1 rounded-md px-2 py-2 hover:bg-accent sm:px-3"
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">Carrinho</span>
              {mounted && count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search dropdown */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t bg-background px-3 py-3">
            <SearchBar className="relative flex w-full" />
          </div>
        )}



        {/* Categories nav — dropdowns with subcategories */}
        {topCategories.length > 0 && (() => {
          const findBy = (re: RegExp) => topCategories.find((c) => re.test(c.name));
          const kimono = findBy(/kimono/i);
          const faixaBjj = topCategories.find((c) => /faixa/i.test(c.name) && /jiu|bjj/i.test(c.name)) ?? findBy(/faixa/i);
          const faixaJudo = topCategories.find((c) => /faixa/i.test(c.name) && /jud[oô]/i.test(c.name));
          const patches = findBy(/patch/i);
          const rash = findBy(/rash|roupa|short|camis/i);

          type NavItem = { label: string; category?: StoreCategory; to?: string; highlight?: boolean };
          const primary: NavItem[] = [
            kimono && { label: "Kimonos", category: kimono },
            faixaBjj && { label: "Faixas BJJ", category: faixaBjj },
            faixaJudo && { label: "Faixas Judô", category: faixaJudo },
            patches && { label: "Patches", category: patches },
            rash && { label: "Rashguards & Roupas", category: rash },
            { label: "Custom Shop", to: "/loja/custom-shop", highlight: true } as NavItem,
            { label: "Atacado", to: "/loja/atacado" } as NavItem,
          ].filter(Boolean) as NavItem[];

          return (
            <nav className="hidden md:block border-t bg-background">
              <div className="mx-auto flex max-w-7xl items-stretch justify-center gap-1 px-4 text-sm font-semibold">
                {primary.map((n) => {
                  if (n.to) {
                    return (
                      <Link
                        key={n.label}
                        to={n.to}
                        className={`whitespace-nowrap px-5 py-3.5 tracking-wide transition-colors ${n.highlight ? "text-primary hover:opacity-80" : "text-foreground hover:text-primary"}`}
                      >
                        {n.label}
                      </Link>
                    );
                  }
                  const cat = n.category!;
                  const kids = cat.id ? childrenByParent.get(cat.id) ?? [] : [];
                  if (kids.length === 0) {
                    return (
                      <Link
                        key={n.label}
                        to="/loja/categoria/$slug"
                        params={{ slug: cat.slug }}
                        className="whitespace-nowrap px-5 py-3.5 tracking-wide text-foreground transition-colors hover:text-primary"
                      >
                        {n.label}
                      </Link>
                    );
                  }
                  return (
                    <div key={n.label} className="group/nav relative">
                      <Link
                        to="/loja/categoria/$slug"
                        params={{ slug: cat.slug }}
                        className="flex items-center gap-1 whitespace-nowrap px-5 py-3.5 tracking-wide text-foreground transition-colors hover:text-primary group-hover/nav:text-primary"
                        aria-haspopup="menu"
                      >
                        {n.label}
                        <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover/nav:rotate-180" />
                      </Link>
                      <div
                        className="invisible absolute left-1/2 top-full z-50 min-w-[260px] -translate-x-1/2 translate-y-1 rounded-md border bg-popover p-2 opacity-0 shadow-xl transition-all duration-150 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 focus-within:visible focus-within:translate-y-0 focus-within:opacity-100"
                        role="menu"
                      >
                        <Link
                          to="/loja/categoria/$slug"
                          params={{ slug: cat.slug }}
                          className="block rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          Ver tudo em {cat.name}
                        </Link>
                        <div className="my-1 h-px bg-border" />
                        {kids.map((k) => (
                          <SubcategoryItem key={k.slug} category={k} childrenByParent={childrenByParent} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>
          );
        })()}

      </header>

      <main className="flex-1">{children}</main>

      {/* Benefits strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <div className="text-sm font-bold">Frete para todo Brasil</div>
              <div className="text-xs text-muted-foreground">Melhor Envio · rastreamento</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <div className="text-sm font-bold">10x sem juros</div>
              <div className="text-xs text-muted-foreground">Cartão, PIX ou boleto</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <div className="text-sm font-bold">Compra segura</div>
              <div className="text-xs text-muted-foreground">Site protegido · trocas fáceis</div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating store chat */}
      <ChatWidget autoRequestInfo={true} />

      {/* Footer */}
      <footer className="bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-black">AMT Fight Wear</div>
            <p className="mt-2 text-xs text-background/70">Equipamentos de artes marciais para atletas exigentes. Kimonos, rashguards, faixas e mais.</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Institucional</div>
            <ul className="mt-3 space-y-2 text-sm text-background/80">
              <li><Link to="/">Sobre a AMT</Link></li>
              <li><Link to="/loja/guia-kimono">Guia do kimono</Link></li>
              <li><Link to="/privacy">Privacidade</Link></li>
              <li><Link to="/terms">Termos</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Ajuda</div>
            <ul className="mt-3 space-y-2 text-sm text-background/80">
              <li><a href="#">Trocas e devoluções</a></li>
              <li><a href="#">Prazo de entrega</a></li>
              <li><a href="#">Formas de pagamento</a></li>
              <li><a href="#">Contato</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest">Siga a AMT</div>
            <a href="https://instagram.com/amtfightwear" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-background/80 hover:text-primary">
              <Instagram className="h-4 w-4" /> @amtfightwear
            </a>
          </div>
        </div>
        <div className="border-t border-background/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-[11px] text-background/70 sm:flex-row">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>
                Pagamentos processados com <strong className="text-background">100% de segurança</strong> pelo{" "}
                <a href="https://www.mercadopago.com.br" target="_blank" rel="noreferrer" className="font-semibold text-background underline decoration-primary/60 underline-offset-2 hover:text-primary">Mercado Pago</a>
                {" "}— criptografia de ponta a ponta. A AMT não armazena dados de cartão.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-background/80">
              <span className="rounded border border-background/20 px-2 py-1">PIX</span>
              <span className="rounded border border-background/20 px-2 py-1">Visa</span>
              <span className="rounded border border-background/20 px-2 py-1">Master</span>
              <span className="rounded border border-background/20 px-2 py-1">Elo</span>
              <span className="rounded border border-background/20 px-2 py-1">Amex</span>
              <span className="rounded border border-background/20 px-2 py-1">Hiper</span>
              <span className="rounded border border-background/20 px-2 py-1">Boleto</span>
            </div>
          </div>
        </div>
        <div className="border-t border-background/10">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-[11px] text-background/60">
            © {new Date().getFullYear()} AMT Fight Wear — Todos os direitos reservados
          </div>
        </div>
      </footer>

      <CartSheet />

      {/* Mobile navigation drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <img src={amtLogo} alt="" className="h-8 w-8 rounded object-cover" />
                <div className="text-sm font-black tracking-tight">Loja AMT</div>
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <Link to="/" className="block rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-accent">
                Início
              </Link>
              <Link to="/loja/custom-shop" className="block rounded-md px-3 py-2.5 text-sm font-bold text-primary hover:bg-accent">
                ✨ Custom Shop
              </Link>
              <Link to="/loja/atacado" className="block rounded-md px-3 py-2.5 text-sm font-bold hover:bg-accent">
                Atacado
              </Link>
              <Link to="/" hash="dojo-manager" className="block rounded-md px-3 py-2.5 text-sm font-bold hover:bg-accent">
                AMT Dojo Manager
              </Link>
              {topCategories.length > 0 && (
                <>
                  <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Categorias
                  </div>
                  {topCategories.map((c) => {
                    const subs = c.id ? childrenByParent.get(c.id) ?? [] : [];
                    return (
                      <div key={c.slug} className="py-0.5">
                        <Link
                          to="/loja/categoria/$slug"
                          params={{ slug: c.slug }}
                          className="block rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-accent"
                        >
                          {c.name}
                        </Link>
                        {subs.length > 0 && (
                          <div className="ml-3 border-l pl-2">
                            {subs.map((s) => (
                              <Link
                                key={s.slug}
                                to="/loja/categoria/$slug"
                                params={{ slug: s.slug }}
                                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                {s.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </nav>
            <div className="border-t px-4 py-3">
              <a
                href="https://instagram.com/amtfightwear"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                <Instagram className="h-4 w-4" /> @amtfightwear
              </a>
            </div>
          </aside>
        </div>
      )}

    </div>
  );
}

export function ProductCard({
  product,
}: {
  product: {
    id: string;
    name: string;
    slug: string | null;
    price: number | string;
    compare_at_price?: number | string | null;
    image_url?: string | null;
    short_description?: string | null;
    store_product_variants?: Array<{ id: string; color: string | null }>;
    store_product_images?: Array<{ url: string; alt: string | null; sort_order: number }>;
  };
}) {
  const price = Number(product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const hasDiscount = compareAt && compareAt > price;
  const pixPrice = pixPriceFor(price);
  const installments = installmentLabel(price);
  const freeShipping = price >= FREE_SHIPPING_THRESHOLD;

  const [currentImage, setCurrentImage] = useState(product.image_url);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Rashguards check (name or category)
  const isRashguard = /rashguard/i.test(product.name);

  // Sync image when color is clicked
  const handleColorClick = (color: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColor(color);

    if (product.store_product_images && product.store_product_images.length > 0) {
      const colorImg = product.store_product_images.find((img) => {
        const alt = (img.alt || "").toLowerCase();
        const url = (img.url || "").toLowerCase();
        const c = color.toLowerCase();
        return alt.includes(c) || url.includes(c);
      });
      if (colorImg) {
        setCurrentImage(colorImg.url);
      }
    }
  };

  const colors = Array.from(
    new Set(
      (product.store_product_variants ?? [])
        .map((v) => v.color)
        .filter((c): c is string => !!c),
    ),
  ).slice(0, 5); // Limit colors shown on card


  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]">
      {/* Favorito fica fora do Link para não navegar ao salvar */}
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton product={{ id: product.id, name: product.name, slug: product.slug ?? product.id, image_url: product.image_url ?? null, price }} />
      </div>

      <Link
        to="/loja/produto/$slug"
        params={{ slug: product.slug ?? product.id }}
        className="flex flex-1 flex-col"
        aria-label={product.name}
      >
        <div className="relative overflow-hidden bg-neutral-50">
          <ProductImage
            src={currentImage}
            alt={product.name}
            aspect="square"
            imgClassName="transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-[0_4px_12px_-4px_rgba(220,38,38,0.6)]">
                −{Math.round(((compareAt! - price) / compareAt!) * 100)}%
              </span>
            )}
            {freeShipping && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                Frete grátis
              </span>
            )}
          </div>

          {isRashguard && colors.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/20 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={(e) => handleColorClick(color, e)}
                  title={color}
                  className={cn(
                    "h-4 w-4 rounded-full border border-white/40 ring-offset-1 transition-transform hover:scale-125",
                    selectedColor === color && "ring-1 ring-white",
                  )}
                  style={{
                    backgroundColor:
                      color.toLowerCase() === "preta" || color.toLowerCase() === "black"
                        ? "#000"
                        : color.toLowerCase() === "branca" || color.toLowerCase() === "white"
                          ? "#fff"
                          : color.toLowerCase() === "azul" || color.toLowerCase() === "blue"
                            ? "#00f"
                            : color.toLowerCase() === "roxo" ||
                                color.toLowerCase() === "purple" ||
                                color.toLowerCase() === "roxa"
                              ? "#800080"
                              : color.toLowerCase() === "marrom" || color.toLowerCase() === "brown"
                                ? "#8B4513"
                                : "#ccc",
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          <div className="mt-auto pt-3">
            {hasDiscount && (
              <div className="text-xs text-muted-foreground line-through">
                {formatMoney(compareAt!)}
              </div>
            )}
            <div className="text-xl font-black tracking-tight text-foreground">
              {formatMoney(price)}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {formatMoney(pixPrice)} no PIX (5% off)
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              ou <span className="font-semibold text-foreground">{installments}</span>
            </div>
            <div className="mt-4 flex w-full items-center justify-center rounded-full bg-foreground px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-background transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
              Comprar
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

