import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Ruler, Shirt, Scissors, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { Button } from "@/components/ui/button";

const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

const CANONICAL = "https://amtfightwear.com.br/loja/guia-kimono";

const TITLE = "Kimono de Jiu-Jitsu: guia de tamanhos e tecidos";
const DESCRIPTION =
  "Como escolher o tamanho do kimono de Jiu-Jitsu (A0 a A5) e entender as tramas: pérola, trançada, gold e favo de mel. Tabela de medidas por altura e peso.";

/** Tabela de tamanhos padrão IBJJF (adulto) usada pela AMT Fight Wear. */
const adultSizes = [
  { size: "A0", height: "1,55 m – 1,63 m", weight: "50 – 60 kg", jacket: "68 cm", pants: "88 cm" },
  { size: "A1", height: "1,63 m – 1,71 m", weight: "60 – 70 kg", jacket: "71 cm", pants: "92 cm" },
  { size: "A2", height: "1,71 m – 1,78 m", weight: "70 – 80 kg", jacket: "74 cm", pants: "96 cm" },
  { size: "A3", height: "1,78 m – 1,85 m", weight: "80 – 92 kg", jacket: "77 cm", pants: "100 cm" },
  { size: "A4", height: "1,85 m – 1,93 m", weight: "92 – 105 kg", jacket: "80 cm", pants: "104 cm" },
  { size: "A5", height: "1,93 m – 2,00 m", weight: "105 – 120 kg", jacket: "83 cm", pants: "108 cm" },
];

const kidsSizes = [
  { size: "M0", height: "1,10 m – 1,20 m", weight: "20 – 25 kg", age: "5 – 6 anos" },
  { size: "M1", height: "1,20 m – 1,30 m", weight: "25 – 30 kg", age: "7 – 8 anos" },
  { size: "M2", height: "1,30 m – 1,40 m", weight: "30 – 38 kg", age: "9 – 10 anos" },
  { size: "M3", height: "1,40 m – 1,50 m", weight: "38 – 45 kg", age: "11 – 12 anos" },
  { size: "M4", height: "1,50 m – 1,60 m", weight: "45 – 55 kg", age: "13 – 14 anos" },
];

const weaves = [
  {
    name: "Trama pérola (pearl weave)",
    gsm: "450 – 550 g/m²",
    desc: "A mais equilibrada e a mais usada no Jiu-Jitsu moderno. Leve, resistente e seca rápido — ideal para treino diário e competição.",
    best: "Treino diário e campeonatos",
  },
  {
    name: "Trama trançada (single weave)",
    gsm: "350 – 450 g/m²",
    desc: "Kimono mais leve e barato, ótimo para clima quente e para quem está começando. Cede um pouco mais com o tempo.",
    best: "Iniciantes e calor",
  },
  {
    name: "Trama dupla / gold weave",
    gsm: "550 – 650 g/m²",
    desc: "Mais densa e difícil de agarrar. Aguenta anos de treino puxado, mas demora mais para secar.",
    best: "Treino intenso e no-gi ocasional",
  },
  {
    name: "Favo de mel (honeycomb)",
    gsm: "500 – 600 g/m²",
    desc: "Tecido com relevo em favo, resistente e com pegada mais dura para o oponente. Acabamento premium.",
    best: "Atletas avançados",
  },
];

const faqs = [
  {
    q: "Qual tamanho de kimono de Jiu-Jitsu eu devo comprar?",
    a: "Use sempre altura como referência principal e peso como ajuste. Um adulto de 1,75 m e 78 kg usa A2. Se estiver entre dois tamanhos, escolha o maior quando o kimono não for pré-encolhido.",
  },
  {
    q: "O kimono encolhe depois de lavar?",
    a: "Sim, kimonos de algodão encolhem de 2% a 5% nas primeiras lavagens. Lave em água fria e seque na sombra para reduzir o encolhimento.",
  },
  {
    q: "Qual a diferença entre trama pérola e trama trançada?",
    a: "A trama pérola (450–550 g/m²) é mais resistente e equilibrada, ideal para treino diário e competição. A trançada é mais leve e barata, indicada para iniciantes e climas quentes.",
  },
  {
    q: "Qual gramatura de kimono é permitida em competição?",
    a: "A IBJJF não limita a gramatura, mas exige tecido resistente e medidas dentro do padrão de manga e calça. Kimonos entre 450 e 550 g/m² atendem à maioria das federações.",
  },
  {
    q: "Kimono de Jiu-Jitsu serve para Judô?",
    a: "Não é o ideal. O kimono de Judô tem manga mais longa e larga e gramatura maior. Para Judô use um modelo específico, com corte aprovado pela federação.",
  },
  {
    q: "Como escolher o tamanho do kimono infantil?",
    a: "Considere a altura da criança: M0 para 1,10–1,20 m, M1 para 1,20–1,30 m, M2 para 1,30–1,40 m, M3 para 1,40–1,50 m e M4 para 1,50–1,60 m.",
  },
];

export const Route = createFileRoute("/loja/guia-kimono")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(catsQuery);
  },
  head: () => ({
    meta: [
      { title: `${TITLE} | AMT Fight Wear` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          inLanguage: "pt-BR",
          mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
          author: { "@type": "Organization", name: "AMT Fight Wear" },
          publisher: {
            "@type": "Organization",
            name: "AMT Fight Wear",
            logo: { "@type": "ImageObject", url: "https://amtfightwear.com.br/icon-512.png" },
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://amtfightwear.com.br/" },
            { "@type": "ListItem", position: 2, name: "Guia do kimono de Jiu-Jitsu", item: CANONICAL },
          ],
        }),
      },
    ],
  }),
  component: GuiaKimonoPage,
});

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">{eyebrow}</div>
      <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

function GuiaKimonoPage() {
  const { data: categories } = useSuspenseQuery(catsQuery);
  const kimonoSlug = categories.find((c) => /kimono/i.test(c.name))?.slug ?? "kimonos-de-jiu-jitsu";

  return (
    <StoreShell categories={categories}>
      <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Trilha de navegação" className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Guia do kimono</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Kimono de Jiu-Jitsu: guia completo de tamanhos e tecidos
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Escolher o kimono certo é a diferença entre um treino confortável e um gi que rasga, aperta ou fica
            grande depois da primeira lavagem. Abaixo você encontra a tabela de medidas oficial (A0 a A5 e
            infantil), a explicação de cada trama e as respostas para as dúvidas mais comuns — direto de quem
            fabrica.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/loja/categoria/$slug" params={{ slug: kimonoSlug }}>
                Ver kimonos da AMT <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/loja/atacado">Comprar para a academia (atacado)</Link>
            </Button>
          </div>
        </header>

        {/* Passo a passo */}
        <section className="mb-14">
          <SectionTitle eyebrow="Passo a passo" title="Como escolher o tamanho em 3 passos" />
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Ruler,
                title: "1. Meça sua altura",
                desc: "A altura define o tamanho base. É o critério mais importante — manga e calça precisam ficar no limite do punho e do tornozelo.",
              },
              {
                icon: Shirt,
                title: "2. Ajuste pelo peso",
                desc: "Se seu peso está acima da faixa da sua altura, suba um tamanho para folga no tórax. Abaixo, mantenha o tamanho da altura.",
              },
              {
                icon: Scissors,
                title: "3. Considere o encolhimento",
                desc: "Kimonos de algodão encolhem de 2% a 5%. Se estiver entre dois tamanhos e o gi não for pré-encolhido, escolha o maior.",
              },
            ].map((s) => (
              <li key={s.title} className="rounded-2xl border border-border/70 bg-card p-5">
                <s.icon className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Tabela adulto */}
        <section id="tamanhos" className="mb-14">
          <SectionTitle eyebrow="Tabela oficial" title="Tamanhos de kimono adulto (A0 a A5)" />
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full min-w-[600px] text-sm">
              <caption className="sr-only">Tabela de tamanhos de kimono de Jiu-Jitsu adulto por altura e peso</caption>
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Tamanho</th>
                  <th scope="col" className="px-4 py-3">Altura</th>
                  <th scope="col" className="px-4 py-3">Peso</th>
                  <th scope="col" className="px-4 py-3">Comprimento do casaco</th>
                  <th scope="col" className="px-4 py-3">Comprimento da calça</th>
                </tr>
              </thead>
              <tbody>
                {adultSizes.map((r) => (
                  <tr key={r.size} className="border-t border-border/60">
                    <th scope="row" className="px-4 py-3 text-left font-bold text-foreground">{r.size}</th>
                    <td className="px-4 py-3 text-muted-foreground">{r.height}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.weight}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.jacket}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.pants}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Medidas de referência para modelos masculinos e unissex. Para o corte feminino (F1 a F4), a modelagem
            é mais estreita nos ombros e ajustada na cintura — fale com nosso atendimento para confirmar.
          </p>
        </section>

        {/* Tabela infantil */}
        <section id="infantil" className="mb-14">
          <SectionTitle eyebrow="Kids" title="Tamanhos de kimono infantil (M0 a M4)" />
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Tabela de tamanhos de kimono infantil por altura, peso e idade</caption>
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">Tamanho</th>
                  <th scope="col" className="px-4 py-3">Altura</th>
                  <th scope="col" className="px-4 py-3">Peso</th>
                  <th scope="col" className="px-4 py-3">Idade aproximada</th>
                </tr>
              </thead>
              <tbody>
                {kidsSizes.map((r) => (
                  <tr key={r.size} className="border-t border-border/60">
                    <th scope="row" className="px-4 py-3 text-left font-bold text-foreground">{r.size}</th>
                    <td className="px-4 py-3 text-muted-foreground">{r.height}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.weight}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tramas */}
        <section className="mb-14">
          <SectionTitle eyebrow="Tecido" title="Tramas e gramaturas: qual escolher" />
          <div className="grid gap-4 sm:grid-cols-2">
            {weaves.map((w) => (
              <div key={w.name} className="rounded-2xl border border-border/70 bg-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground">{w.name}</h3>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {w.gsm}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.desc}</p>
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Melhor para: {w.best}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Cuidados */}
        <section id="cuidados" className="mb-14">

          <SectionTitle eyebrow="Durabilidade" title="Como cuidar do seu kimono" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Lave sempre em água fria (até 30 °C) para evitar encolhimento e desbotamento.",
              "Nunca use secadora nem alvejante — o algodão encolhe e as costuras enfraquecem.",
              "Seque na sombra e do lado do avesso para preservar a cor e os bordados.",
              "Lave depois de cada treino: suor acumulado degrada a fibra e favorece fungos.",
              "Passe ferro apenas em temperatura baixa e nunca sobre patches bordados.",
              "Kimono branco de competição? Guarde separado das faixas coloridas para evitar transferência de cor.",
            ].map((tip) => (
              <li key={tip} className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <SectionTitle eyebrow="Dúvidas frequentes" title="Perguntas sobre kimono de Jiu-Jitsu" />
          <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-bold text-foreground marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="rounded-3xl border border-border/70 bg-muted/40 p-6 text-center sm:p-10">
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Pronto para escolher o seu kimono?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Fabricação própria, trama pérola reforçada e bordado personalizado da sua academia. Frete para todo o
            Brasil e até 10x sem juros.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/loja/categoria/$slug" params={{ slug: kimonoSlug }}>
                Ver kimonos disponíveis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/loja/atacado">Pedido em atacado</Link>
            </Button>
          </div>
        </section>
      </article>
    </StoreShell>
  );
}
