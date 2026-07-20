import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dsListCategories } from "@/lib/dojo/store/store.functions";
import { Card } from "@/components/ui/card";
import { ChevronRight, Package } from "lucide-react";

export const Route = createFileRoute("/dojo/app/store/")({ component: CategoriesPage });

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

function CategoriesPage() {
  const fn = useServerFn(dsListCategories);
  const { data, isLoading } = useQuery({
    queryKey: ["dojo-store", "cats"],
    queryFn: () => fn(),
  });

  const parents: Cat[] = (data ?? []).filter((c: Cat) => !c.parent_id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Escolha uma categoria</h1>
        <p className="text-sm text-muted-foreground">
          Comece pela categoria que deseja comprar. As subcategorias aparecem no próximo passo.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : parents.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma categoria disponível no momento.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parents.map((c) => (
            <Link
              key={c.id}
              to="/dojo/app/store/c/$categoria"
              params={{ categoria: c.slug }}
              className="group"
            >
              <Card className="flex items-center justify-between gap-3 p-6 transition hover:border-primary hover:shadow-md">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">Ver subcategorias</div>
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
