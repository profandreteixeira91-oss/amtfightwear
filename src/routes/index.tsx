import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { DojoManagerPromo } from "@/components/store/DojoManagerPromo";
import { listStorefrontHome, listStoreCategories } from "@/lib/store/store.functions";
import { ArrowRight, Sparkles, Truck, CreditCard, ShieldCheck, RefreshCw } from "lucide-react";
import heroBanner from "@/assets/loja-hero-banner.jpg";
import amtLogo from "@/assets/amt-logo.jpg";


const homeQuery = queryOptions({
  queryKey: ["store", "home"],
  queryFn: () => listStorefrontHome(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homeQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Loja AMT Fight Wear | Artigos para Artes Marciais" },
      { name: "description", content: "A Loja AMT Fight Wear é o e-commerce oficial para comprar kimonos, rashguards, faixas e acessórios de jiu-jitsu e judô, no varejo ou atacado." },
      { property: "og:title", content: "Loja AMT Fight Wear | Artigos para Artes Marciais" },
      { property: "og:description", content: "Kimonos, rashguards, faixas e acessórios AMT Fight Wear. Compre direto da fábrica com envio para todo o Brasil e opção de personalização no Custom Shop." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://amtfightwear.com.br/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: "Loja AMT Fight Wear",
        url: "https://amtfightwear.com.br/",
        description: "E-commerce oficial da AMT Fight Wear para venda de kimonos, rashguards, faixas e acessórios para artes marciais.",
      }),
    }],
  }),
  component: StoreHomePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6 sm:mb-12">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.32em] text-primary">{eyebrow}</div>
        ) : null}
        <h2 className="text-3xl font-black leading-[1.05] tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function StoreHomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  const topCategories = categories.filter((c) => !c.parent_id).slice(0, 6);

  return (
    <StoreShell categories={categories}>
      {/* ============================================================
          HERO — Full width, cinematic, premium
         ============================================================ */}
      <section className="relative isolate overflow-hidden bg-black text-white">
        <img
          src={heroBanner}
          alt="Atleta AMT Fight Wear em treinamento de jiu-jitsu"
          width={1920}
          height={912}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-80 sm:object-right motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
        />
        {/* Layered overlays for legibility without washing out imagery */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-6 py-24 sm:px-8 sm:py-32 lg:min-h-[86vh]">
          <div className="max-w-3xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur">
              <img
                src={amtLogo}
                alt="AMT Fight Wear"
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/60"
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/90">
                AMT Fight Wear · E-commerce oficial
              </span>
            </div>

            <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.5rem]">
              Feito para
              <br />
              <span className="text-primary">quem treina</span> de verdade.
            </h1>

            <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/85 sm:text-xl">
              Kimonos, rashguards, faixas e acessórios para jiu-jitsu, judô e artes marciais.
              Direto da fábrica, com envio para todo o Brasil.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/loja/categoria/$slug"
                params={{ slug: categories[0]?.slug ?? "kimonos" }}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-8px_rgba(220,38,38,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-10px_rgba(220,38,38,0.65)]"
              >
                Ver coleção
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="#destaques"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white backdrop-blur transition-all duration-300 hover:border-white/60 hover:bg-white/10"
              >
                Destaques
              </a>
            </div>

            <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              <span className="inline-flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-primary" /> Frete grátis R$ 399+</span>
              <span className="inline-flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-primary" /> 10x sem juros</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Compra segura</span>
            </div>
          </div>
        </div>

        {/* Bottom fade into page */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </section>

      {/* ============================================================
          CATEGORIES — Premium destaques
         ============================================================ */}
      {topCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 sm:py-28">
          <SectionHeader
            eyebrow="Coleções"
            title="Explore por categoria"
            action={
              <Link
                to="/loja/custom-shop"
                className="hidden shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary sm:inline-flex"
              >
                Custom Shop <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-6">
            {topCategories.map((c, idx) => {
              const subs = categories.filter((s) => s.parent_id === c.id);
              return (
                <div key={c.slug} className="group relative">
                  <Link
                    to="/loja/categoria/$slug"
                    params={{ slug: c.slug }}
                    className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-neutral-100 via-neutral-50 to-white p-5 transition-all duration-500 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.25)]"
                  >
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(220,38,38,0.10),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="absolute right-4 top-4 text-[10px] font-bold tracking-[0.28em] text-muted-foreground/70">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Categoria</div>
                      <div className="mt-1.5 text-base font-black uppercase leading-tight tracking-tight text-foreground sm:text-lg">
                        {c.name}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/70 transition-colors group-hover:text-primary">
                        {subs.length > 0 ? "Ver subcategorias" : "Explorar"} <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>

                  {subs.length > 0 && (
                    <div className="pointer-events-none absolute left-0 right-0 top-full z-30 hidden pt-2 group-hover:pointer-events-auto md:block">
                      <div className="pointer-events-auto invisible translate-y-1 rounded-2xl border border-border bg-background/95 p-3 opacity-0 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
                          Subcategorias
                        </div>
                        <ul className="flex flex-col">
                          {subs.map((s) => (
                            <li key={s.id}>
                              <Link
                                to="/loja/categoria/$slug"
                                params={{ slug: s.slug }}
                                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <span className="truncate">{s.name}</span>
                                <ArrowRight className="h-3 w-3 shrink-0 opacity-40" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 border-t border-border pt-2">
                          <Link
                            to="/loja/categoria/$slug"
                            params={{ slug: c.slug }}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5"
                          >
                            Ver tudo em {c.name} <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          FEATURED — Produtos em destaque
         ============================================================ */}
      {data.featured.length > 0 && (
        <section id="destaques" className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <SectionHeader
            eyebrow="Curadoria"
            title="Destaques AMT"
            action={
              <a href="#novidades" className="hidden shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary sm:inline-flex">
                Novidades <ArrowRight className="h-3.5 w-3.5" />
              </a>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          BENEFITS — Cards modernos
         ============================================================ */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Frete grátis", desc: "Acima de R$ 399 para todo o Brasil, com rastreamento." },
            { icon: CreditCard, title: "10x sem juros", desc: "Parcele no cartão ou pague no Pix com desconto." },
            { icon: RefreshCw, title: "Troca fácil", desc: "7 dias para trocar tamanho, sem burocracia." },
            { icon: ShieldCheck, title: "Qualidade AMT", desc: "Produtos testados por atletas profissionais." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-5 text-base font-black tracking-tight text-foreground">{title}</div>
              <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          PROMO STRIP — Cupom + Custom Shop
         ============================================================ */}
      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-primary-foreground lg:col-span-3">
            <div className="relative z-10 max-w-md">
              <div className="text-[11px] font-bold uppercase tracking-[0.32em] opacity-80">Cupom de boas-vindas</div>
              <h3 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                10% OFF na primeira compra
              </h3>
              <p className="mt-3 text-sm leading-relaxed opacity-90 sm:text-base">
                Use o cupom <span className="rounded bg-primary-foreground/15 px-2 py-0.5 font-mono font-bold tracking-wider">AMT10</span> no checkout. Válido em todo o site.
              </p>
              <a
                href="#destaques"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-7 py-3.5 text-xs font-bold uppercase tracking-widest text-primary transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)]"
              >
                Aproveitar agora <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-8 h-80 w-80 rounded-full bg-primary-foreground/5" />
          </div>

          <Link
            to="/loja/custom-shop"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-foreground p-10 text-background lg:col-span-2"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Novo · Custom Shop
              </div>
              <h3 className="mt-3 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">
                100% <span className="text-primary">personalizado</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-background/70">
                Kimono, rashguard ou faixa sob encomenda no padrão AMT.
              </p>
            </div>
            <span className="mt-8 inline-flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-background transition-colors group-hover:text-primary">
              Customizar agora <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* ============================================================
          FINALIDADE DO APP — Bloco institucional (mantido)
         ============================================================ */}
      <section aria-labelledby="sobre-o-app" className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-12 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary">Sobre a loja</div>
              <h2 id="sobre-o-app" className="mt-3 text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">
                Para que serve a Loja AMT Fight Wear?
              </h2>
              <img
                src={amtLogo}
                alt="AMT Fight Wear"
                className="mt-8 w-full max-w-[220px] rounded-2xl border border-border bg-background object-contain p-4 shadow-sm"
              />
            </div>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground md:col-span-3">
              <p>
                A <strong className="text-foreground">Loja AMT Fight Wear</strong> é o e-commerce oficial da fabricante brasileira de artigos para artes marciais. O aplicativo permite que praticantes, academias e lojistas <strong className="text-foreground">naveguem pelo catálogo, personalizem peças no Custom Shop, calculem frete, façam pedidos no varejo ou atacado e acompanhem o status de cada compra</strong> em uma conta protegida.
              </p>
              <p>
                Vendemos <strong className="text-foreground">kimonos, rashguards, faixas de jiu-jitsu e judô, shorts e acessórios</strong> produzidos em nossa fábrica. Todo o processo — do carrinho ao pagamento seguro via Mercado Pago, com envio rastreado para todo o Brasil — acontece dentro deste site.
              </p>
              <ul className="grid gap-3 pt-4 sm:grid-cols-2">
                {[
                  "Compra direto da fábrica, sem intermediários",
                  "Custom Shop para peças 100% personalizadas",
                  "Área do cliente com histórico de pedidos",
                  "Atendimento humano no chat da loja",
                ].map((it) => (
                  <li key={it} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          DOJO MANAGER PROMO — Mantido intacto
         ============================================================ */}
      <DojoManagerPromo />

      {/* ============================================================
          NOVIDADES
         ============================================================ */}
      {data.newest.length > 0 && (
        <section id="novidades" className="mx-auto max-w-7xl px-6 py-24 sm:px-8 sm:py-28">
          <SectionHeader eyebrow="Recém-chegados" title="Novidades" />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.newest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          FAIXAS BJJ
         ============================================================ */}
      {data.bjjBelts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <SectionHeader
            eyebrow="Seleção do dia"
            title="Faixas de Jiu-Jitsu"
            action={
              <Link
                to="/loja/categoria/$slug"
                params={{ slug: "faixas-de-jiu-jitsu" }}
                className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary"
              >
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.bjjBelts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          FAIXAS JUDÔ
         ============================================================ */}
      {data.judoBelts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <SectionHeader
            eyebrow="Tradição"
            title="Faixas de Judô"
            action={
              <Link
                to="/loja/categoria/$slug"
                params={{ slug: "faixas-de-judo" }}
                className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary"
              >
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.judoBelts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          KIMONOS
         ============================================================ */}
      {data.kimonos.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <SectionHeader
            eyebrow="Ícones AMT"
            title="Kimonos"
            action={
              <Link
                to="/loja/categoria/$slug"
                params={{ slug: "kimonos-de-jiu-jitsu" }}
                className="inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground hover:text-primary"
              >
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {data.kimonos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ============================================================
          FINAL WELCOME BANNER
         ============================================================ */}
      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-8 py-16 text-center sm:px-12 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(220,38,38,0.08),transparent_70%)]" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">Bem-vindo à</div>
            <h2 className="mt-3 text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl">
              Loja Virtual AMT Fight Wear
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Compre online com segurança · entrega para todo o Brasil
            </p>
          </div>
        </div>
      </section>

      {data.featured.length === 0 && data.newest.length === 0 && data.bjjBelts.length === 0 && data.judoBelts.length === 0 && data.kimonos.length === 0 && (
        <div className="mx-auto max-w-7xl px-6 py-24 text-center sm:px-8">
          <p className="text-lg text-muted-foreground">Catálogo em preparação. Em breve novos produtos.</p>
        </div>
      )}
    </StoreShell>
  );
}
