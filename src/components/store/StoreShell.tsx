import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, User, Menu, Instagram, Truck, ShieldCheck, CreditCard, LogIn, ChevronDown, LogOut, Package } from "lucide-react";
import { useCart } from "@/lib/store/cart-store";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import amtLogo from "@/assets/amt-logo.jpg";
import { ProductImage } from "@/components/store/ProductImage";
import { CartSheet } from "@/components/store/CartSheet";
import { SearchBar } from "@/components/store/SearchBar";
import { recordStoreVisit } from "@/lib/store/customers.functions";
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="bg-foreground text-background text-[11px] uppercase tracking-widest">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <span>Frete grátis acima de R$ 399 · Parcelamos em até 10x</span>
          <a href="https://instagram.com/amtfightwear" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 hover:text-primary">
            <Instagram className="h-3 w-3" /> @amtfightwear
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button className="md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={amtLogo} alt="AMT Fight Wear" className="h-9 w-9 rounded object-cover" />
            <div className="leading-tight">
              <div className="text-sm font-black tracking-tight">AMT</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fight Wear</div>
            </div>
          </Link>

          <SearchBar />

          <div className="flex items-center gap-1 sm:gap-3">
            {mounted && isAuthed ? <NotificationsBell authed={isAuthed} /> : null}
            {mounted && isAuthed ? (
              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-primary"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Minha conta</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
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
                to="/auth"
                search={{ redirect: "/loja/conta" }}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <LogIn className="h-4 w-4" />
                <span>Entrar</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => useCart.getState().open()}
              className="relative inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-accent"
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

        {/* Categories nav */}
        {topCategories.length > 0 && (
          <nav className="border-t bg-background">
            <div className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-visible px-4 text-sm font-medium">
              <Link to="/" className="whitespace-nowrap px-3 py-3 text-foreground hover:text-primary">
                Início
              </Link>
              <Link to="/loja/custom-shop" className="whitespace-nowrap px-3 py-3 font-bold text-primary hover:opacity-80">
                ✨ Custom Shop
              </Link>
              <Link to="/loja/atacado" className="whitespace-nowrap px-3 py-3 font-bold text-foreground hover:text-primary">
                Atacado
              </Link>

              {topCategories.map((c) => {
                const subs = c.id ? childrenByParent.get(c.id) ?? [] : [];
                return (
                  <div key={c.slug} className="group relative">
                    <Link
                      to="/loja/categoria/$slug"
                      params={{ slug: c.slug }}
                      className="inline-flex h-full items-center whitespace-nowrap px-3 py-3 text-foreground hover:text-primary group-hover:text-primary"
                    >
                      {c.name}
                      {subs.length > 0 && (
                        <svg className="ml-1 h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      )}
                    </Link>
                    {subs.length > 0 && (
                      <div
                        className="invisible absolute left-0 top-full z-50 min-w-[220px] translate-y-1 rounded-md border bg-popover p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 focus-within:visible focus-within:translate-y-0 focus-within:opacity-100"
                        role="menu"
                      >
                        <Link
                          to="/loja/categoria/$slug"
                          params={{ slug: c.slug }}
                          className="block rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          Ver tudo em {c.name}
                        </Link>
                        <div className="my-1 h-px bg-border" />
                        {subs.map((s) => (
                          <SubcategoryItem key={s.slug} category={s} childrenByParent={childrenByParent} />
                        ))}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        )}

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
      <ChatWidget />

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
              <li><a href="#">Blog</a></li>
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
    </div>
  );
}

export function ProductCard({ product }: { product: { id: string; name: string; slug: string | null; price: number | string; compare_at_price?: number | string | null; image_url?: string | null; short_description?: string | null } }) {
  const price = Number(product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const hasDiscount = compareAt && compareAt > price;
  const installments = (price / 10).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Link
      to="/loja/produto/$slug"
      params={{ slug: product.slug ?? product.id }}
      className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-all duration-200 hover:border-foreground hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
    >
      <div className="relative overflow-hidden border-b border-border bg-muted">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          aspect="square"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        />
        {hasDiscount && (
          <div className="absolute left-0 top-3 bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-sm">
            −{Math.round(((compareAt! - price) / compareAt!) * 100)}%
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold uppercase tracking-tight text-foreground group-hover:text-primary">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          {hasDiscount && (
            <div className="text-xs text-muted-foreground line-through">
              {compareAt!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          )}
          <div className="text-lg font-black tracking-tight text-foreground">
            {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
          <div className="text-[11px] text-muted-foreground">ou 10x de <span className="font-semibold text-foreground">{installments}</span></div>
        </div>
      </div>
    </Link>
  );
}
