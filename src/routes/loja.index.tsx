import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { listStorefrontHome, listStoreCategories } from "@/lib/store/store.functions";
import { Link } from "@tanstack/react-router";

const homeQuery = queryOptions({
  queryKey: ["store", "home"],
  queryFn: () => listStorefrontHome(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

export const Route = createFileRoute("/loja/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homeQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "AMT Fight Wear — Loja Oficial | Kimonos, Rashguards e Faixas" },
      { name: "description", content: "Loja oficial AMT Fight Wear. Kimonos de BJJ, rashguards, faixas, shorts e acessórios para artes marciais. Frete para todo Brasil e 10x sem juros." },
      { property: "og:title", content: "AMT Fight Wear — Loja Oficial" },
      { property: "og:description", content: "Kimonos, rashguards, faixas e acessórios para atletas de artes marciais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
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
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">AMT Fight Wear</div>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              Vestido para <span className="text-primary">vencer</span> no tatame.
            </h1>
            <p className="mt-4 max-w-lg text-base text-background/80">
              Kimonos, rashguards, faixas e acessórios desenvolvidos para atletas exigentes. Produtos de alta performance com garantia AMT.
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

      {/* CTA Marketing */}
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

      {/* Custom Shop CTA */}
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



      {/* Destaques */}
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

      {/* Novidades */}
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

      {data.featured.length === 0 && data.newest.length === 0 && (
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <p className="text-lg text-muted-foreground">Catálogo em preparação. Em breve novos produtos.</p>
        </div>
      )}
    </StoreShell>
  );
}
