import { createFileRoute, Link } from "@tanstack/react-router";

import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell, ProductCard } from "@/components/store/StoreShell";
import { listStorefrontHome, listStoreCategories } from "@/lib/store/store.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shirt, Palette, PackageCheck, Truck, CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { KimonoGuideCallout } from "@/components/store/KimonoGuideLink";
import { ProductImage } from "@/components/store/ProductImage";
import { RecentlyViewed } from "@/components/store/RecentlyViewed";
import heroBanner from "@/assets/loja-hero-banner.jpg";
import { FREE_SHIPPING_CAP, FREE_SHIPPING_THRESHOLD, INSTALLMENT_TIERS, PIX_DISCOUNT_RATE, formatMoney, formatMoneyShort } from "@/lib/store/pricing";

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
      { title: "AMT Fight Wear | Equipamentos Premium para Artes Marciais" },
      { name: "description", content: "Kimonos, faixas, rashguards e patches direto da fábrica AMT, com envio para todo o Brasil." },
      { property: "og:title", content: "AMT Fight Wear | Premium Fight Gear" },
      { property: "og:description", content: "Kimonos, faixas e rashguards direto da fábrica AMT." },
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
        name: "AMT Fight Wear",
        url: "https://amtfightwear.com.br/",
        logo: "https://amtfightwear.com.br/icon-512.png",
        image: "https://amtfightwear.com.br/icon-512.png",
        description: "Equipamentos premium e gestão para artes marciais.",
        areaServed: "BR",
        currenciesAccepted: "BRL",
      }),
    }],
  }),
  component: StoreHomePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</div>
        ) : null}
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[2rem]">{title}</h2>
        {description ? <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function SeeAll({ slug, label }: { slug: string; label: string }) {
  return (
    <Link
      to="/loja/categoria/$slug"
      params={{ slug }}
      className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary sm:inline-flex"
    >
      {label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// Linhas de faixa (subcategorias de 1º nível de Faixas BJJ / Judô), na ordem de entrada → topo.
const LINE_ORDER = ["training", "pro", "premium"] as const;
const LINE_COPY: Record<(typeof LINE_ORDER)[number], { title: string; desc: string }> = {
  training: { title: "Linha Training", desc: "A escolha para o treino do dia a dia." },
  pro: { title: "Linha Pro", desc: "Equilíbrio entre durabilidade e preço." },
  premium: { title: "Linha Premium", desc: "Acabamento superior, ideal para graduações." },
};
function lineKey(name: string): (typeof LINE_ORDER)[number] | null {
  const n = name.toLowerCase();
  if (n.includes("premium")) return "premium";
  if (/\bpro\b/.test(n)) return "pro";
  if (n.includes("training")) return "training";
  return null;
}

/** Condições de frete e pagamento, lidas das mesmas constantes usadas no checkout. */
function FreteEPagamento() {
  const cards = [
    {
      icon: Truck,
      title: `Frete grátis a partir de ${formatMoneyShort(FREE_SHIPPING_THRESHOLD)}`,
      body: (
        <ul className="space-y-2">
          <li>
            Em compras a partir de {formatMoneyShort(FREE_SHIPPING_THRESHOLD)} em produtos, a loja paga o frete da opção de
            envio mais econômica para o seu CEP, até {formatMoneyShort(FREE_SHIPPING_CAP)}.
          </li>
          <li>
            Se esse frete passar de {formatMoneyShort(FREE_SHIPPING_CAP)} ou se você escolher uma entrega mais rápida, você paga
            só a diferença.
          </li>
          <li>Abaixo desse valor, o frete é calculado pelo CEP na página do produto ou no carrinho, antes de pagar.</li>
        </ul>
      ),
    },
    {
      icon: CreditCard,
      title: "Parcelamento sem juros no cartão",
      body: (
        <>
          <table className="w-full text-left">
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="py-1.5">Até {formatMoney(INSTALLMENT_TIERS[0].min - 0.01)}</td>
                <td className="py-1.5 text-right font-semibold text-foreground">à vista</td>
              </tr>
              {INSTALLMENT_TIERS.map((t) => (
                <tr key={t.min}>
                  <td className="py-1.5">A partir de {formatMoneyShort(t.min)}</td>
                  <td className="py-1.5 text-right font-semibold text-foreground">até {t.installments}x sem juros</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2">Vale o valor total da compra, com o frete.</p>
        </>
      ),
    },
    {
      icon: QrCode,
      title: `${Math.round(PIX_DISCOUNT_RATE * 100)}% de desconto no Pix`,
      body: (
        <ul className="space-y-2">
          <li>O desconto vale sobre os produtos; o frete é cobrado sem desconto.</li>
          <li>No boleto, o pagamento é à vista, sem desconto.</li>
          <li>Pagamentos processados pelo Mercado Pago.</li>
        </ul>
      ),
    },
  ];
  return (
    <section id="frete-e-pagamento" className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-16 sm:px-8 sm:pt-20">
      <SectionHeader
        eyebrow="Sem letras miúdas"
        title="Frete e pagamento"
        description="Estas são as regras aplicadas no carrinho e no checkout. Você vê o valor final antes de pagar."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-neutral-200 bg-white p-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-foreground">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoreHomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  const roots = categories.filter((c) => !c.parent_id);
  const kimonoSlug = roots.find((c) => /kimono/i.test(c.name))?.slug ?? "kimonos-de-jiu-jitsu";
  const bjjRoot = roots.find((c) => /faixa/i.test(c.name) && /jiu|bjj/i.test(c.name));
  const judoRoot = roots.find((c) => /faixa/i.test(c.name) && /jud[oô]/i.test(c.name));
  const faixaSlug = bjjRoot?.slug ?? "faixas-de-jiu-jitsu";

  const linesOf = (rootId?: string) =>
    LINE_ORDER.map((k) => categories.find((c) => c.parent_id === rootId && lineKey(c.name) === k))
      .map((c, i) => (c ? { key: LINE_ORDER[i], cat: c } : null))
      .filter((x): x is { key: (typeof LINE_ORDER)[number]; cat: (typeof categories)[number] } => !!x);
  const bjjLines = bjjRoot ? linesOf(bjjRoot.id) : [];
  const judoLines = judoRoot ? linesOf(judoRoot.id) : [];

  // Vitrines: destaques + novidades sem repetir; faixas e kimonos em seções próprias.
  const destaques = [...data.featured, ...data.newest]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 8);
  const faixas = [...data.bjjBelts, ...data.judoBelts].slice(0, 8);
  const kimonos = data.kimonos.slice(0, 4);

  return (
    <StoreShell categories={categories}>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <img
          src={heroBanner}
          alt="Atleta AMT Fight Wear em treinamento"
          width={1920}
          height={912}
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-75 sm:object-right"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/75 to-transparent" />
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center px-5 py-20 sm:px-8 lg:min-h-[600px]">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Direto da fábrica AMT
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Feito para quem treina <span className="text-primary">de verdade.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Kimonos, faixas e rashguards com fabricação própria e envio para todo o Brasil.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-sm font-semibold">
                <Link to="/loja/categoria/$slug" params={{ slug: faixaSlug }}>
                  Comprar faixas <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/25 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white"
              >
                <Link to="/loja/categoria/$slug" params={{ slug: kimonoSlug }}>Ver kimonos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      {roots.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20">
          <SectionHeader eyebrow="Categorias" title="Compre por categoria" />
          <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {roots.map((c) => (
              <Link
                key={c.id}
                to="/loja/categoria/$slug"
                params={{ slug: c.slug }}
                className="group w-36 shrink-0 snap-start sm:w-auto"
              >
                <div className="overflow-hidden rounded-2xl bg-neutral-100">
                  <ProductImage
                    src={c.image_url ?? c.preview_image}
                    alt={c.name}
                    aspect="square"
                    className="bg-transparent"
                    sizes="(max-width: 640px) 144px, (max-width: 1024px) 33vw, 16vw"
                    imgClassName="p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </div>
                <div className="mt-3 px-0.5">
                  <div className="text-sm font-semibold leading-tight group-hover:text-primary">{c.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {c.product_count} {c.product_count === 1 ? "produto" : "produtos"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* LINHAS DE FAIXA — atalho para escolher pela linha */}
      {bjjLines.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20">
          <SectionHeader
            eyebrow="Faixas"
            title="Escolha a linha da sua faixa"
            description="Todas as linhas têm opções lisas, com bordado kanji e com o seu nome bordado."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {bjjLines.map(({ key, cat }) => (
              <Link
                key={cat.id}
                to="/loja/categoria/$slug"
                params={{ slug: cat.slug }}
                className={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5",
                  key === "premium"
                    ? "bg-neutral-950 text-white"
                    : "border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.3)]",
                )}
              >
                <div>
                  <div className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", key === "premium" ? "text-primary" : "text-muted-foreground")}>
                    Jiu-Jitsu
                  </div>
                  <div className="mt-2 text-xl font-bold tracking-tight">{LINE_COPY[key].title}</div>
                  <p className={cn("mt-1.5 text-sm", key === "premium" ? "text-white/70" : "text-muted-foreground")}>
                    {LINE_COPY[key].desc}
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between text-sm font-medium">
                  <span>{cat.product_count} modelos</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {judoLines.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 text-muted-foreground">Faixas de Judô:</span>
              {judoLines.map(({ key, cat }) => (
                <Link
                  key={cat.id}
                  to="/loja/categoria/$slug"
                  params={{ slug: cat.slug }}
                  className="rounded-full border border-neutral-200 px-3.5 py-1.5 font-medium transition-colors hover:border-foreground"
                >
                  {LINE_COPY[key].title}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* DESTAQUES */}
      {destaques.length > 0 && (
        <section id="destaques" className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20">
          <SectionHeader eyebrow="Destaques" title="Escolhidos para você" action={<SeeAll slug={faixaSlug} label="Ver faixas" />} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {destaques.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* FAIXA PERSONALIZADA — nome bordado em 3 passos */}
      <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-950 px-6 py-12 text-white sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Bordado personalizado
              </div>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Sua faixa com o seu nome.</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                Escolha a faixa, digite o nome na página do produto e a nossa fábrica borda para você.
              </p>
              <Button asChild size="lg" className="mt-7 h-12 rounded-full px-7 text-sm font-semibold">
                <Link to="/loja/categoria/$slug" params={{ slug: faixaSlug }}>
                  Personalizar minha faixa <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shirt, title: "Escolha a faixa", desc: "Cor, tamanho e linha nos modelos Bordada Personalizada." },
                { icon: Palette, title: "Digite o nome", desc: "Exatamente como deve sair, com prévia na hora." },
                { icon: PackageCheck, title: "Receba em casa", desc: "Bordado conferido pela produção antes do envio." },
              ].map(({ icon: Icon, title, desc }, i) => (
                <li key={title} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-semibold text-white/30">0{i + 1}</span>
                  </div>
                  <div className="mt-4 font-semibold">{title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-white/60">{desc}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAIXAS */}
      {faixas.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20">
          <SectionHeader eyebrow="Faixas" title="Para todas as graduações" action={<SeeAll slug={faixaSlug} label="Ver todas" />} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {faixas.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* KIMONOS */}
      {kimonos.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20">
          <SectionHeader eyebrow="Kimonos" title="Coleção Lanus Premium Series" action={<SeeAll slug={kimonoSlug} label="Ver kimonos" />} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {kimonos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <KimonoGuideCallout className="mt-10" />
        </section>
      )}

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <RecentlyViewed title="Continue de onde parou" />
      </div>

      {/* FRETE E PAGAMENTO — as regras exatas aplicadas no carrinho e no checkout */}
      <FreteEPagamento />


      {destaques.length === 0 && faixas.length === 0 && kimonos.length === 0 && (
        <div className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8">
          <p className="text-lg text-muted-foreground">Catálogo em preparação. Em breve novos produtos.</p>
        </div>
      )}
    </StoreShell>
  );
}
