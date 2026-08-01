import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { listCustomTemplates } from "@/lib/customshop.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { Sparkles, Palette, Shirt, ArrowRight, Ruler, Scissors, Package, CheckCircle2 } from "lucide-react";

const templatesQuery = queryOptions({
  queryKey: ["custom-shop", "templates"],
  queryFn: () => listCustomTemplates(),
});
const catsQuery = queryOptions({
  queryKey: ["store", "categories"],
  queryFn: () => listStoreCategories(),
});

export const Route = createFileRoute("/loja/custom-shop/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(templatesQuery),
      context.queryClient.ensureQueryData(catsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Custom Shop — Seu produto 100% customizado | AMT Fight Wear" },
      { name: "description", content: "Monte seu kimono, rashguard ou faixa personalizados. Cores, patches, bordado e tecido premium — feitos sob encomenda." },
      { property: "og:title", content: "Custom Shop AMT — Seu produto 100% customizado" },
      { property: "og:description", content: "Kimonos, rashguards e faixas personalizados sob medida." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://amtfightwear.com.br/loja/custom-shop" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://amtfightwear.com.br/loja/custom-shop" }],
  }),

  component: CustomShopIndex,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

const STEPS = [
  { icon: Shirt, title: "Escolha o produto", desc: "Kimono, rashguard ou faixa como base." },
  { icon: Palette, title: "Personalize", desc: "Cores por zona, patches e bordado no editor visual." },
  { icon: Scissors, title: "Produzimos sob medida", desc: "Corte, costura e bordado feitos para você." },
  { icon: Package, title: "Enviamos", desc: "Prazo de produção mostrado em cada produto." },
];

function CustomShopIndex() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  return (
    <StoreShell categories={categories}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Custom Shop
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            Seu produto <span className="text-primary">100% customizado</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-background/80 sm:text-base">
            O Custom Shop é o nosso ateliê digital: você escolhe um produto base — kimono, rashguard ou faixa —
            e personaliza tudo em um editor visual. Cor por zona, tecido, patches posicionáveis e bordado de texto.
            Cada peça é fabricada sob encomenda com o padrão AMT Fight Wear.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3 sm:max-w-2xl">
            {[
              { icon: Palette, label: "Cores por zona" },
              { icon: Shirt, label: "Patches posicionáveis" },
              { icon: Sparkles, label: "Bordado de texto" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 rounded-md bg-background/5 px-3 py-2 text-xs">
                <f.icon className="h-4 w-4 text-primary" /> {f.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Como funciona</div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">Do editor à sua porta em 4 passos</h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-sm font-bold">{s.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Catálogo */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Catálogo</div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">Escolha o que quer customizar</h2>
          </div>
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Feito sob encomenda
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {templates.map((t) => {
            const comingSoon = t.kind.toLowerCase().includes("rashguard");
            const inner = (
              <>
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {t.base_image_url ? (
                    <img
                      src={t.base_image_url}
                      alt={t.name}
                      loading="lazy"
                      className={`h-full w-full object-contain transition-transform duration-500 ${comingSoon ? "opacity-60 grayscale" : "group-hover:scale-105"}`}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-4xl">🥋</div>
                  )}
                  {comingSoon ? (
                    <div className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-background">
                      Em breve
                    </div>
                  ) : (
                    <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                      Customizável
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="truncate text-sm font-black">{t.name}</h3>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{t.description}</p>
                  )}
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground">a partir de</div>
                      <div className="text-base font-black leading-tight">{formatBRL(Number(t.base_price))}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Ruler className="h-3 w-3" /> {t.production_days} dias
                      </div>
                    </div>
                    {comingSoon ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1.5 text-xs font-bold text-muted-foreground">
                        Em breve
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground group-hover:opacity-90">
                        Criar <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </>
            );

            if (comingSoon) {
              return (
                <div
                  key={t.id}
                  aria-disabled
                  className="group flex flex-col overflow-hidden rounded-lg border bg-card opacity-80 cursor-not-allowed"
                >
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={t.id}
                to="/loja/custom-shop/$kind"
                params={{ kind: t.kind }}
                className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                {inner}
              </Link>
            );
          })}
        </div>

        {templates.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Módulo em preparação.
          </div>
        )}
      </section>
    </StoreShell>
  );
}
