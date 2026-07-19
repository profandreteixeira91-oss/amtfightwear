import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { DojoManagerPromo } from "@/components/store/DojoManagerPromo";
import { listStorefrontHome, listStoreCategories } from "@/lib/store/store.functions";
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
      { property: "og:url", content: "https://loja.amtfightwear.com.br/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://loja.amtfightwear.com.br/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: "Loja AMT Fight Wear",
        url: "https://loja.amtfightwear.com.br/",
        description: "E-commerce oficial da AMT Fight Wear para venda de kimonos, rashguards, faixas e acessórios para artes marciais.",
      }),
    }],
  }),
  component: StoreHomePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function StoreHomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  return (
    <StoreShell categories={categories}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <img
          src={heroBanner}
          alt="Atleta AMT Fight Wear em treinamento de jiu-jitsu"
          width={1920}
          height={912}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right opacity-90"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-foreground via-foreground/85 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
        <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-primary" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <img
                src={amtLogo}
                alt="AMT Fight Wear"
                width={56}
                height={56}
                className="h-14 w-14 rounded-md border border-background/30 object-cover shadow-lg shadow-black/40 ring-2 ring-primary/60"
              />
              <div className="leading-tight">
                <div className="text-lg font-black tracking-tight text-background">AMT</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Fight Wear</div>
              </div>
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">E-commerce oficial para todo o Brasil</div>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              Loja AMT Fight Wear
            </h1>
            <p className="mt-3 max-w-xl text-xl font-bold leading-snug text-background sm:text-2xl">
              Loja online de kimonos, rashguards, faixas e acessórios para jiu-jitsu, judô e artes marciais.
            </p>
            <p className="mt-4 max-w-xl text-base text-background/80">
              Este site permite comprar produtos AMT Fight Wear no varejo ou atacado, personalizar peças, pagar online e acompanhar pedidos. Compre direto da fábrica, com entrega para todo o Brasil.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/loja/categoria/$slug" params={{ slug: categories[0]?.slug ?? "kimonos" }} className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">
                Ver coleção
              </Link>
              <a href="#destaques" className="rounded-md border border-background/30 px-6 py-3 font-semibold text-background hover:bg-background/10">
                Destaques
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Finalidade do app — descrição clara do propósito */}
      <section aria-labelledby="sobre-o-app" className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">Finalidade do aplicativo</div>
              <h2 id="sobre-o-app" className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                Para que serve a Loja AMT Fight Wear?
              </h2>
              <img
                src={amtLogo}
                alt="AMT Fight Wear"
                className="mt-6 w-full max-w-[280px] rounded-lg border border-border bg-background object-contain shadow-sm"
              />
            </div>
            <div className="md:col-span-2 space-y-3 text-sm text-muted-foreground sm:text-base">
              <p>
                A <strong className="text-foreground">Loja AMT Fight Wear</strong> é o e-commerce oficial da fabricante brasileira de artigos para artes marciais. O aplicativo permite que praticantes, academias e lojistas <strong className="text-foreground">naveguem pelo catálogo, personalizem peças no Custom Shop, calculem frete, façam pedidos no varejo ou atacado e acompanhem o status de cada compra</strong> em uma conta protegida.
              </p>
              <p>
                Vendemos <strong className="text-foreground">kimonos, rashguards, faixas de jiu-jitsu e judô, shorts e acessórios</strong> produzidos em nossa fábrica. Todo o processo — do carrinho ao pagamento seguro via Mercado Pago, com envio rastreado para todo o Brasil — acontece dentro deste site.
              </p>
              <ul className="grid gap-2 pt-2 sm:grid-cols-2">
                <li className="flex gap-2"><span className="text-primary">✓</span> Compra direto da fábrica, sem intermediários</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Custom Shop para peças 100% personalizadas</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Área do cliente com histórico de pedidos</li>
                <li className="flex gap-2"><span className="text-primary">✓</span> Atendimento humano no chat da loja</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {(() => {
        const pick = [
          ...data.kimonos.slice(0, 2),
          ...data.bjjBelts.slice(0, 1),
          ...data.judoBelts.slice(0, 1),
        ].slice(0, 4);
        if (pick.length === 0) return null;
        return (
          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pick.map((p) => (
                <Link
                  key={p.id}
                  to="/loja/produto/$slug"
                  params={{ slug: p.slug }}
                  className="group relative flex h-56 items-stretch overflow-hidden rounded-2xl border border-border bg-muted/40 transition hover:border-foreground hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
                >
                  <div className="relative z-10 flex w-1/2 flex-col justify-between p-5">
                    <div>
                      <h3 className="text-base font-black uppercase leading-tight tracking-tight text-foreground line-clamp-3">
                        {p.name}
                      </h3>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">A partir de</div>
                      <div className="text-xl font-black leading-none text-emerald-600">
                        {Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                      <div className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-primary group-hover:underline">
                        Comprar →
                      </div>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-3/5">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-contain object-right transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-primary-foreground md:col-span-2">
            <div className="relative z-10 max-w-md">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">Cupom de boas-vindas</div>
              <h3 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                10% OFF na sua primeira compra
              </h3>
              <p className="mt-2 text-sm opacity-90">
                Use o cupom <span className="rounded bg-primary-foreground/15 px-2 py-0.5 font-mono font-bold tracking-wider">AMT10</span> no checkout. Válido em todo o site.
              </p>
              <a href="#destaques" className="mt-5 inline-flex items-center rounded-md bg-primary-foreground px-5 py-2.5 text-sm font-bold text-primary hover:opacity-90">
                Aproveitar agora
              </a>
            </div>
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-4 h-64 w-64 rounded-full bg-primary-foreground/5" />
          </div>

          <div className="flex flex-col justify-between rounded-xl border bg-card p-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">Frete grátis</div>
              <h3 className="mt-2 text-2xl font-black leading-tight">
                Acima de <span className="text-primary">R$ 399</span> para todo Brasil
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Envio rápido pelo Melhor Envio, com rastreamento e embalagem reforçada.
              </p>
            </div>
            <a href="#destaques" className="mt-4 inline-flex w-fit items-center rounded-md border border-foreground/20 px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
              Comprar destaques
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">10x sem juros</div>
            <div className="mt-1 text-sm text-muted-foreground">Parcele no cartão ou pague no PIX com desconto.</div>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Troca fácil</div>
            <div className="mt-1 text-sm text-muted-foreground">7 dias para trocar tamanho sem burocracia.</div>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Qualidade AMT</div>
            <div className="mt-1 text-sm text-muted-foreground">Produtos testados por atletas profissionais.</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <Link
          to="/loja/custom-shop"
          className="relative flex flex-col overflow-hidden rounded-xl border bg-foreground p-6 text-background sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="max-w-xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">✨ Novo · Custom Shop</div>
            <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
              Seu kimono, rashguard ou faixa <span className="text-primary">100% personalizado</span>
            </h3>
            <p className="mt-2 text-sm text-background/70">
              Escolha cores, patches, bordado e tecido. Fabricamos sob encomenda no padrão AMT.
            </p>
          </div>
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground sm:mt-0">
            Customizar agora →
          </span>
        </Link>
      </section>

      <DojoManagerPromo />


      {data.featured.length > 0 && (
        <section id="destaques" className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-black">Destaques AMT</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-8">
        <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary">Bem-vindo à</div>
          <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">Loja Virtual AMT Fight Wear</h2>
          <p className="mt-2 text-sm text-muted-foreground">Compre online com segurança · entrega para todo o Brasil</p>
        </div>
      </section>

      {data.newest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-black">Novidades</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.newest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {data.bjjBelts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Faixas de Jiu-Jitsu</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Seleção do dia · atualizada diariamente</p>
            </div>
            <Link to="/loja/categoria/$slug" params={{ slug: "faixas-de-jiu-jitsu" }} className="text-sm font-bold uppercase tracking-widest text-primary hover:underline">
              Ver tudo →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.bjjBelts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {data.judoBelts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black">Faixas de Judô</h2>
            <Link to="/loja/categoria/$slug" params={{ slug: "faixas-de-judo" }} className="text-sm font-bold uppercase tracking-widest text-primary hover:underline">
              Ver tudo →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.judoBelts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {data.kimonos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black">Kimonos</h2>
            <Link to="/loja/categoria/$slug" params={{ slug: "kimonos-de-jiu-jitsu" }} className="text-sm font-bold uppercase tracking-widest text-primary hover:underline">
              Ver tudo →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.kimonos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {data.featured.length === 0 && data.newest.length === 0 && data.bjjBelts.length === 0 && data.judoBelts.length === 0 && data.kimonos.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <p className="text-lg text-muted-foreground">Catálogo em preparação. Em breve novos produtos.</p>
        </div>
      )}
    </StoreShell>
  );
}
