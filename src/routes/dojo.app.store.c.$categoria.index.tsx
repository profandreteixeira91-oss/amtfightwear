import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListCategories } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, Layers } from "lucide-react";

export const Route = createFileRoute("/dojo/app/store/c/$categoria/")({ component: SubcategoryPage });

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

function SubcategoryPage() {
  const { categoria } = Route.useParams();
  const nav = useNavigate();
  const fn = useServerFn(dsListCategories);
  const { data, isLoading } = useQuery({ queryKey: ["dojo-store", "cats"], queryFn: () => fn() });

  const list: Cat[] = data ?? [];
  const parent = list.find((c) => c.slug === categoria);
  const subs = parent ? list.filter((c) => c.parent_id === parent.id) : [];

  return (
    <div className="space-y-6">
      <button
        onClick={() => nav({ to: "/dojo/app/store" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Categorias
      </button>

      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</div>
        <h1 className="text-2xl font-bold tracking-tight">{parent?.name ?? categoria}</h1>
        <p className="text-sm text-muted-foreground">Escolha uma subcategoria para ver os produtos.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : !parent ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Categoria não encontrada.</Card>
      ) : subs.length === 0 ? (
        <Card className="space-y-3 p-8 text-center">
          <div className="text-sm text-muted-foreground">
            Essa categoria não possui subcategorias. Veja todos os produtos.
          </div>
          <Link
            to="/dojo/app/store/c/$categoria/$subcategoria"
            params={{ categoria: parent.slug, subcategoria: "todos" }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ver produtos <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s) => (
            <Link
              key={s.id}
              to="/dojo/app/store/c/$categoria/$subcategoria"
              params={{ categoria: parent.slug, subcategoria: s.slug }}
              className="group"
            >
              <Card className="flex items-center justify-between gap-3 p-6 transition hover:border-primary hover:shadow-md">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">Ver produtos</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
