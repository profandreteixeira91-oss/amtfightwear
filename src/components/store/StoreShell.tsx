import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ShoppingBag, User, Menu, Instagram, Truck, ShieldCheck, CreditCard, ChevronDown, MessageCircle, LogOut, Package, Search, X } from "lucide-react";
import { useCart } from "@/lib/store/cart-store";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import amtLogo from "@/assets/amt-logo.jpg";
import { ProductImage } from "@/components/store/ProductImage";
import { CartSheet } from "@/components/store/CartSheet";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { pixPriceFor, installmentLabel, maxInstallmentsFor, formatMoney, formatMoneyShort, FREE_SHIPPING_CAP, FREE_SHIPPING_THRESHOLD } from "@/lib/store/pricing";
import { formatProductName } from "@/lib/store/product-name";
import { requiresEmbroideryName } from "@/lib/store/personalization";
import { SearchBar } from "@/components/store/SearchBar";
import { recordStoreVisit } from "@/lib/store/visits.functions";
import { ChatWidget } from "@/components/store/ChatWidget";
import { NotificationsBell } from "@/components/store/NotificationsBell";



type StoreCategory = { id?: string; slug: string; name: string; parent_id?: string | null };

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
      <div className="bg-neutral-950 text-[11px] text-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2">
          <Link to="/" hash="frete-e-pagamento" className="inline-flex items-center gap-1.5 hover:text-white">
            <Truck className="h-3.5 w-3.5 text-white/60" />
            <span>
              Frete grátis acima de <strong className="font-semibold text-white">{formatMoneyShort(FREE_SHIPPING_THRESHOLD)}</strong>
              <span className="hidden sm:inline"> no envio econômico, até {formatMoneyShort(FREE_SHIPPING_CAP)}</span>
              <span className="underline underline-offset-2 sm:hidden"> · condições</span>
            </span>
          </Link>
          <Link to="/" hash="frete-e-pagamento" className="hidden items-center gap-1.5 hover:text-white md:inline-flex">
            <CreditCard className="h-3.5 w-3.5 text-white/60" />
            <span>Até <strong className="font-semibold text-white">10x sem juros</strong> a partir de R$ 1.000</span>
          </Link>
          <span className="hidden items-center gap-1.5 lg:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-white/60" /> Fabricação própria
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-6 sm:px-6">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden -ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" aria-label="Loja AMT Fight Wear — página inicial" className="flex min-w-0 items-center gap-2">
            <img src={amtLogo} alt="Logotipo da Loja AMT Fight Wear" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            <div className="hidden leading-none sm:block">
              <div className="font-display text-base font-bold tracking-tight">AMT</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Fight Wear</div>
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
                className="inline-flex h-10 items-center gap-2 rounded-full px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-neutral-100 sm:px-3.5"
              >
                <User className="h-5 w-5" />
                <span className="hidden lg:inline">Entrar</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => useCart.getState().open()}
              aria-label="Abrir carrinho"
              className="relative inline-flex h-10 items-center gap-2 rounded-full px-2.5 text-sm font-medium transition-colors hover:bg-neutral-100 sm:px-3.5"
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="hidden lg:inline">Carrinho</span>
              {mounted && count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
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
          const acessorios = findBy(/acess[oó]rio/i);

          type NavItem = { label: string; category?: StoreCategory; to?: string; highlight?: boolean };
          const primary: NavItem[] = [
            kimono && { label: "Kimonos", category: kimono },
            faixaBjj && { label: "Faixas BJJ", category: faixaBjj },
            faixaJudo && { label: "Faixas Judô", category: faixaJudo },
            patches && { label: "Patches", category: patches },
            rash && { label: "Rashguards & Roupas", category: rash },
            acessorios && { label: "Acessórios", category: acessorios },
            { label: "Atacado", to: "/loja/atacado" } as NavItem,
          ].filter(Boolean) as NavItem[];

          // Categoria ativa: a página atual está nela ou em alguma subcategoria dela.
          const activeSlug = pathname.startsWith("/loja/categoria/")
            ? decodeURIComponent(pathname.split("/")[3] ?? "")
            : "";
          const subtreeSlugs = (cat: StoreCategory): string[] => {
            const kids = cat.id ? childrenByParent.get(cat.id) ?? [] : [];
            return [cat.slug, ...kids.flatMap(subtreeSlugs)];
          };
          const linkCls = (active: boolean) =>
            cn(
              "relative flex items-center gap-1 whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors",
              "after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-transform after:duration-200",
              active
                ? "text-foreground after:scale-x-100"
                : "text-neutral-600 after:scale-x-0 hover:text-foreground hover:after:scale-x-100",
            );

          return (
            <nav className="hidden md:block" aria-label="Categorias">
              <div className="mx-auto flex max-w-7xl items-stretch justify-center px-4">
                {primary.map((n) => {
                  if (n.to) {
                    return (
                      <Link key={n.label} to={n.to} className={linkCls(pathname.startsWith(n.to))}>
                        {n.label}
                      </Link>
                    );
                  }
                  const cat = n.category!;
                  const kids = cat.id ? childrenByParent.get(cat.id) ?? [] : [];
                  const active = subtreeSlugs(cat).includes(activeSlug);
                  if (kids.length === 0) {
                    return (
                      <Link key={n.label} to="/loja/categoria/$slug" params={{ slug: cat.slug }} className={linkCls(active)}>
                        {n.label}
                      </Link>
                    );
                  }
                  // Painel em colunas: cada subcategoria vira coluna com os próprios filhos embaixo.
                  const columns = kids.map((k) => ({ cat: k, items: k.id ? childrenByParent.get(k.id) ?? [] : [] }));
                  const hasGrandkids = columns.some((c) => c.items.length > 0);
                  return (
                    <div key={n.label} className="group/nav relative">
                      <Link
                        to="/loja/categoria/$slug"
                        params={{ slug: cat.slug }}
                        className={linkCls(active)}
                        aria-haspopup="menu"
                      >
                        {n.label}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-transform group-hover/nav:rotate-180" />
                      </Link>
                      <div
                        role="menu"
                        className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition-all duration-150 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 focus-within:visible focus-within:translate-y-0 focus-within:opacity-100"
                      >
                        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
                          {hasGrandkids ? (
                            <div className="grid grid-flow-col auto-cols-[minmax(190px,1fr)] gap-x-8">
                              {columns.map(({ cat: col, items }) => (
                                <div key={col.slug}>
                                  <Link
                                    to="/loja/categoria/$slug"
                                    params={{ slug: col.slug }}
                                    className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 hover:text-primary"
                                  >
                                    {col.name}
                                  </Link>
                                  <ul className="mt-2.5 space-y-0.5">
                                    {items.map((it) => (
                                      <li key={it.slug}>
                                        <Link
                                          to="/loja/categoria/$slug"
                                          params={{ slug: it.slug }}
                                          className="block py-1.5 text-sm text-neutral-700 transition-colors hover:text-primary"
                                        >
                                          {it.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <ul className="min-w-[220px] space-y-0.5">
                              {kids.map((k) => (
                                <li key={k.slug}>
                                  <Link
                                    to="/loja/categoria/$slug"
                                    params={{ slug: k.slug }}
                                    className="block py-1.5 text-sm text-neutral-700 transition-colors hover:text-primary"
                                  >
                                    {k.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-4 border-t border-neutral-100 pt-3">
                            <Link
                              to="/loja/categoria/$slug"
                              params={{ slug: cat.slug }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary"
                            >
                              Ver tudo em {cat.name} →
                            </Link>
                          </div>
                        </div>
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

      {/* Benefícios */}
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {[
            { icon: Truck, title: `Frete grátis acima de ${formatMoneyShort(FREE_SHIPPING_THRESHOLD)}`, desc: `No envio econômico, até ${formatMoneyShort(FREE_SHIPPING_CAP)}` },
            { icon: CreditCard, title: "Parcele sem juros", desc: "3x a partir de R$ 200 · 10x a partir de R$ 1.000" },
            { icon: ShieldCheck, title: "Compra segura", desc: "Mercado Pago · 5% off no Pix" },
            { icon: Package, title: "Fabricação própria", desc: "Direto da fábrica AMT" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-foreground shadow-sm ring-1 ring-neutral-200">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating store chat */}
      <ChatWidget autoRequestInfo={true} />

      {/* Rodapé */}
      <footer className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <img src={amtLogo} alt="" className="h-10 w-10 rounded-full object-cover" />
              <div className="leading-none">
                <div className="font-display text-base font-bold">AMT Fight Wear</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/50">Desde a fábrica</div>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Kimonos, faixas, rashguards e patches fabricados pela AMT para quem treina de verdade.
            </p>
            <a
              href="https://instagram.com/amtfightwear"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              <Instagram className="h-4 w-4" /> @amtfightwear
            </a>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Loja</div>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {topCategories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link to="/loja/categoria/$slug" params={{ slug: c.slug }} className="transition-colors hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li><Link to="/loja/atacado" className="transition-colors hover:text-white">Atacado para academias</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Ajuda</div>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li><Link to="/loja/guia-kimono" className="transition-colors hover:text-white">Guia de tamanhos do kimono</Link></li>
              <li><Link to="/loja/conta/pedidos" className="transition-colors hover:text-white">Meus pedidos</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-white">Trocas e devoluções</Link></li>
              <li>
                <a href="https://wa.me/5582920016732" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
                  <MessageCircle className="h-3.5 w-3.5" /> Fale conosco
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Institucional</div>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li><Link to="/privacy" className="transition-colors hover:text-white">Privacidade</Link></li>
              <li><Link to="/terms" className="transition-colors hover:text-white">Termos de uso</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-white/50 sm:px-6 lg:flex-row">
            <div className="flex items-center gap-2 text-center lg:text-left">
              <ShieldCheck className="h-4 w-4 shrink-0 text-white/40" />
              <span>
                Pagamentos processados pelo{" "}
                <a href="https://www.mercadopago.com.br" target="_blank" rel="noreferrer" className="text-white/80 underline-offset-2 hover:underline">Mercado Pago</a>.
                A AMT não armazena dados de cartão.
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {["PIX", "Visa", "Master", "Elo", "Amex", "Hiper", "Boleto"].map((m) => (
                <span key={m} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 ring-1 ring-white/10">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="pb-6 text-center text-[11px] text-white/40">
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
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Categorias">
              <div className="grid grid-cols-2 gap-2">
                <Link to="/loja/atacado" className="rounded-xl bg-neutral-100 px-3 py-3 text-sm font-semibold">
                  Atacado
                </Link>
                <Link to="/loja/conta/pedidos" className="rounded-xl bg-neutral-100 px-3 py-3 text-sm font-semibold">
                  Meus pedidos
                </Link>
              </div>
              {topCategories.length > 0 && (
                <div className="mt-6">
                  <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Categorias
                  </div>
                  <ul className="divide-y divide-neutral-100">
                    {topCategories.map((c) => {
                      const subs = c.id ? childrenByParent.get(c.id) ?? [] : [];
                      if (subs.length === 0) {
                        return (
                          <li key={c.slug}>
                            <Link to="/loja/categoria/$slug" params={{ slug: c.slug }} className="block px-1 py-3.5 text-[15px] font-medium">
                              {c.name}
                            </Link>
                          </li>
                        );
                      }
                      return (
                        <li key={c.slug}>
                          <details className="group/acc">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-1 py-3.5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                              {c.name}
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/acc:rotate-180" />
                            </summary>
                            <div className="pb-3 pl-1">
                              <Link
                                to="/loja/categoria/$slug"
                                params={{ slug: c.slug }}
                                className="block py-2 text-sm font-semibold text-primary"
                              >
                                Ver tudo em {c.name}
                              </Link>
                              {subs.map((sub) => {
                                const grand = sub.id ? childrenByParent.get(sub.id) ?? [] : [];
                                return (
                                  <div key={sub.slug} className="py-1">
                                    <Link
                                      to="/loja/categoria/$slug"
                                      params={{ slug: sub.slug }}
                                      className="block py-1.5 text-sm text-foreground"
                                    >
                                      {sub.name}
                                    </Link>
                                    {grand.length > 0 && (
                                      <div className="ml-3 border-l border-neutral-200 pl-3">
                                        {grand.map((g) => (
                                          <Link
                                            key={g.slug}
                                            to="/loja/categoria/$slug"
                                            params={{ slug: g.slug }}
                                            className="block py-1.5 text-[13px] text-muted-foreground"
                                          >
                                            {g.name}
                                          </Link>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                </div>
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
  const installments = maxInstallmentsFor(price) > 1 ? installmentLabel(price) : null;
  const freeShipping = price >= FREE_SHIPPING_THRESHOLD;
  const displayName = formatProductName(product.name);
  const personalized = requiresEmbroideryName(product.name);

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
    <div className="group relative flex flex-col">
      {/* Favorito fica fora do Link para não navegar ao salvar */}
      <div className="absolute right-2.5 top-2.5 z-10 opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <FavoriteButton product={{ id: product.id, name: product.name, slug: product.slug ?? product.id, image_url: product.image_url ?? null, price }} />
      </div>

      <Link
        to="/loja/produto/$slug"
        params={{ slug: product.slug ?? product.id }}
        className="flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 rounded-2xl"
        aria-label={displayName}
      >
        <div className="relative overflow-hidden rounded-2xl bg-neutral-100">
          <ProductImage
            src={currentImage}
            alt={displayName}
            aspect="square"
            className="bg-transparent"
            imgClassName="p-5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {hasDiscount && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                −{Math.round(((compareAt! - price) / compareAt!) * 100)}%
              </span>
            )}
            {freeShipping && (
              <span
                title={`No envio econômico, até ${formatMoneyShort(FREE_SHIPPING_CAP)}`}
                className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm"
              >
                Frete grátis*
              </span>
            )}
          </div>

          {!(isRashguard && colors.length > 1) && (
            <span className="pointer-events-none absolute inset-x-2.5 bottom-2.5 hidden translate-y-2 rounded-full bg-neutral-950/90 py-2 text-center text-[11px] font-semibold tracking-wide text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
              {personalized ? "Personalizar" : "Ver produto"}
            </span>
          )}

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

        <div className="flex flex-1 flex-col px-1 pt-3">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground sm:text-sm">
            {displayName}
          </h3>
          {personalized && (
            <div className="mt-1 text-[11px] font-medium text-primary">Personalize com seu nome</div>
          )}
          <div className="mt-auto pt-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-semibold tracking-tight text-foreground tabular-nums">
                {formatMoney(price)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through tabular-nums">{formatMoney(compareAt!)}</span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-emerald-700">{formatMoney(pixPrice)} no PIX</span>
              {installments && <span className="hidden sm:inline"> · {installments}</span>}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
