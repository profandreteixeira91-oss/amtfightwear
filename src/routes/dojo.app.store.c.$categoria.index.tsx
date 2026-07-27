import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListCategories } from "@/lib/dojo/store/store.functions";
import { ArrowLeft, ArrowRight, Layers, PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/dojo/store/EmptyState";

export const Route = createFileRoute("/dojo/app/store/c/$categoria/")({
  component: SubcategoryPage,
});

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

function SubcategoryPage() {
  const { categoria } = Route.useParams();
  const nav = useNavigate();
  const fn = useServerFn(dsListCategories);
  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "cats"],
    queryFn: () => fn(),
  });

  const list: Cat[] = data ?? [];
  const parent = list.find((c) => c.slug === categoria);
  const subs = parent ? list.filter((c) => c.parent_id === parent.id) : [];

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <button
          onClick={() => nav({ to: "/dojo/app/store" })}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Todas as categorias
        </button>
        <div className="max-w-2xl space-y-1.5 px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Categoria
          </div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {parent?.name ?? categoria}
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma subcategoria para explorar os produtos.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-[color:var(--dojo-surface-3)]"
            />
          ))}
        </div>
      ) : !parent ? (
        <EmptyState
          icon={PackageOpen}
          title="Categoria não encontrada"
          description="Talvez o link esteja desatualizado. Volte para o início da loja."
          action={
            <Link
              to="/dojo/app/store"
              className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
            >
              Voltar para a loja
            </Link>
          }
        />
      ) : subs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sem subcategorias"
          description="Essa categoria ainda não foi ramificada. Você pode ver todos os produtos abaixo."
          action={
            <Link
              to="/dojo/app/store/c/$categoria/$subcategoria"
              params={{ categoria: parent.slug, subcategoria: "todos" }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
            >
              Ver todos os produtos <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s) => (
            <Link
              key={s.id}
              to="/dojo/app/store/c/$categoria/$subcategoria"
              params={{ categoria: parent.slug, subcategoria: s.slug }}
              className="group flex items-center gap-3 rounded-2xl border border-[color:var(--dojo-border)] bg-white p-4 shadow-[var(--dojo-shadow-xs)] transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[var(--dojo-shadow-md)] sm:gap-4 sm:p-5"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground/[0.04] text-foreground sm:h-12 sm:w-12">
                <Layers className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  {s.name}
                </div>
                <div className="text-[11px] text-muted-foreground">Ver produtos</div>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground sm:h-5 sm:w-5"
                strokeWidth={1.75}
              />
            </Link>
          ))}
          <Link
            to="/dojo/app/store/c/$categoria/$subcategoria"
            params={{ categoria: parent.slug, subcategoria: "todos" }}
            className="group flex items-center gap-3 rounded-2xl border border-dashed border-[color:var(--dojo-border)] bg-transparent p-4 text-foreground/70 transition hover:border-foreground/30 hover:text-foreground sm:gap-4 sm:p-5"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-transparent text-foreground sm:h-12 sm:w-12">
              <PackageOpen className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs sm:text-sm font-semibold tracking-tight">Ver todos de {parent.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">Sem filtro</div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" strokeWidth={1.75} />
          </Link>
        </div>
      )}
    </div>
  );
}
