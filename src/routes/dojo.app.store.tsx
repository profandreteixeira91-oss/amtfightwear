import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart, ClipboardList, Store as StoreIcon, ChevronRight } from "lucide-react";
import { dsGetCart } from "@/lib/dojo/store/store.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dojo/app/store")({
  head: () => ({ meta: [{ title: "AMT Store — Dojo Manager" }] }),
  component: StoreLayout,
});

type Step = "categoria" | "subcategoria" | "produto" | "carrinho" | "checkout";

function StoreLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const getCart = useServerFn(dsGetCart);
  const { data: cart } = useQuery({
    queryKey: ["dojo-store", "cart"],
    queryFn: () => getCart(),
    staleTime: 10_000,
  });

  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  // Deriva o passo atual pelo pathname
  let step: Step = "categoria";
  const inCategoria = /^\/dojo\/app\/store\/c\/[^/]+$/.test(pathname);
  const inSubcategoria = /^\/dojo\/app\/store\/c\/[^/]+\/[^/]+$/.test(pathname);
  const inProduto = pathname.startsWith("/dojo/app/store/produtos/");
  const inCarrinho = pathname.startsWith("/dojo/app/store/carrinho");
  if (inCarrinho) step = "carrinho";
  else if (inProduto) step = "produto";
  else if (inSubcategoria) step = "subcategoria";
  else if (inCategoria) step = "categoria";
  else step = "categoria";

  const steps: { key: Step; label: string }[] = [
    { key: "categoria", label: "Categoria" },
    { key: "subcategoria", label: "Subcategoria" },
    { key: "produto", label: "Produto" },
    { key: "carrinho", label: "Carrinho" },
    { key: "checkout", label: "Checkout" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[color:var(--dojo-border)] bg-gradient-to-r from-primary/90 to-primary p-5 text-primary-foreground shadow-sm sm:flex sm:flex-wrap sm:justify-between">
        <Link to="/dojo/app/store" className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <StoreIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80">AMT Fight Wear</div>
            <div className="truncate text-xl font-bold leading-tight">AMT Store</div>
            <div className="hidden text-xs opacity-80 sm:block">Compre passo a passo · atacado automático para academias.</div>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/dojo/app/store/carrinho"
            className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
          >
            <ShoppingCart className="h-4 w-4" />
            Carrinho
            {count > 0 && (
              <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-primary">
                {count}
              </span>
            )}
          </Link>
          <Link
            to="/dojo/app/store/pedidos"
            className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25 sm:inline-flex"
          >
            <ClipboardList className="h-4 w-4" /> Pedidos
          </Link>
        </div>
      </header>

      {/* Progress */}
      <nav
        aria-label="Progresso da compra"
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[color:var(--dojo-border)] bg-white/70 p-2 text-xs backdrop-blur"
      >
        {steps.map((s, i) => {
          const active = i === currentIdx;
          const done = i < currentIdx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium whitespace-nowrap",
                  active && "bg-primary text-primary-foreground",
                  done && "bg-primary/10 text-primary",
                  !active && !done && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full text-[10px]",
                    active && "bg-white text-primary",
                    done && "bg-primary text-primary-foreground",
                    !active && !done && "bg-muted text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
            </div>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
