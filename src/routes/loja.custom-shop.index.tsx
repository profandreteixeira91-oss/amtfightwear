import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { listStoreCategories } from "@/lib/store/store.functions";
import { listCustomTemplates } from "@/lib/customshop.functions";
import { formatBRL } from "@/lib/store/cart-store";
import { Sparkles, Palette, Shirt, ArrowRight } from "lucide-react";

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
    ],
  }),
  component: CustomShopIndex,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Não encontrado</div>,
});

function CustomShopIndex() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: categories } = useSuspenseQuery(catsQuery);

  return (
    <StoreShell categories={categories}>
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Custom Shop
          </div>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
            Seu produto <span className="text-primary">100% customizado</span>
          </h1>
          <p className="mt-4 max-w-2xl text-background/80">
            Escolha cores, tecido, posicione patches e adicione bordado. Fabricamos sob encomenda com o padrão AMT.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:max-w-2xl">
            <div className="flex items-center gap-2 rounded-md bg-background/5 px-3 py-2 text-xs">
              <Palette className="h-4 w-4 text-primary" /> Cores por zona
            </div>
            <div className="flex items-center gap-2 rounded-md bg-background/5 px-3 py-2 text-xs">
              <Shirt className="h-4 w-4 text-primary" /> Patches posicionáveis
            </div>
            <div className="flex items-center gap-2 rounded-md bg-background/5 px-3 py-2 text-xs">
              <Sparkles className="h-4 w-4 text-primary" /> Bordado de texto
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-black">Escolha o que quer customizar</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              to="/loja/custom-shop/$kind"
              params={{ kind: t.kind }}
              className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {t.base_image_url ? (
                  <img src={t.base_image_url} alt={t.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-6xl">🥋</div>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Customizável
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-black">{t.name}</h3>
                {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] text-muted-foreground">a partir de</div>
                    <div className="text-2xl font-black">{formatBRL(Number(t.base_price))}</div>
                    <div className="text-[11px] text-muted-foreground">Produção em {t.production_days} dias</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground group-hover:opacity-90">
                    Customizar <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
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
