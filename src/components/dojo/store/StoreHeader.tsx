import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, ClipboardList, ShoppingBag, Store as StoreIcon } from "lucide-react";
import { useMemo } from "react";
import { dsGetCart, dsListCategories } from "@/lib/dojo/store/store.functions";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { cn } from "@/lib/utils";

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

/**
 * Header persistente do módulo AMT Store.
 * Puramente visual — todas as ações continuam usando as rotas/queries existentes.
 */
export function StoreHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const getCart = useServerFn(dsGetCart);
  const listCats = useServerFn(dsListCategories);

  const { data: cart } = useQuery({
    queryKey: ["dojo-store", "cart"],
    queryFn: () => getCart(),
    staleTime: 10_000,
  });
  const { data: cats } = useQuery({
    queryKey: ["dojo-store", "cats"],
    queryFn: () => listCats(),
    staleTime: 60_000,
  });

  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const crumbs = useMemo(() => buildBreadcrumbs(pathname, cats ?? []), [pathname, cats]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-3xl border border-[color:var(--dojo-border)] bg-white/90 p-2 shadow-[var(--dojo-shadow-sm)] backdrop-blur sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:p-4">
        <Link
          to="/dojo/app/store"
          className="hidden shrink-0 items-center gap-2.5 rounded-2xl px-2 py-1 transition hover:bg-black/[0.03] sm:flex"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            <StoreIcon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AMT</div>
            <div className="truncate text-sm font-bold tracking-tight text-foreground">Store</div>
          </div>
        </Link>

        <div className="col-span-2 sm:col-span-1 min-w-0">
          <SearchAutocomplete />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/dojo/app/store/pedidos"
            aria-label="Meus pedidos"
            className="hidden h-11 items-center gap-2 rounded-full border border-[color:var(--dojo-border)] bg-white px-4 text-sm font-medium text-foreground transition hover:border-foreground/40 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:inline-flex"
          >
            <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
            Pedidos
          </Link>
          <Link
            to="/dojo/app/store/carrinho"
            aria-label={`Carrinho${count > 0 ? ` — ${count} itens` : ""}`}
            className="relative inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-[var(--dojo-shadow-md)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Carrinho</span>
            <span
              className={cn(
                "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums transition",
                count > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/20 text-background/70",
              )}
            >
              {count}
            </span>
          </Link>
        </div>
      </div>

      {crumbs.length > 0 && (
        <nav
          aria-label="Trilha"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
              {c.to && i < crumbs.length - 1 ? (
                <Link to={c.to} params={c.params as any} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className={cn(i === crumbs.length - 1 && "font-medium text-foreground")}>
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}

type Crumb = { label: string; to?: string; params?: Record<string, string> };

function buildBreadcrumbs(pathname: string, cats: Cat[]): Crumb[] {
  const base: Crumb = { label: "AMT Store", to: "/dojo/app/store" };

  if (pathname === "/dojo/app/store" || pathname === "/dojo/app/store/") return [base];

  if (pathname.startsWith("/dojo/app/store/carrinho")) {
    return [base, { label: "Carrinho" }];
  }
  if (pathname.startsWith("/dojo/app/store/pedidos")) {
    const rest = pathname.replace("/dojo/app/store/pedidos", "").replace(/^\//, "");
    if (!rest) return [base, { label: "Meus pedidos" }];
    return [
      base,
      { label: "Meus pedidos", to: "/dojo/app/store/pedidos" },
      { label: "Detalhe do pedido" },
    ];
  }

  const catMatch = pathname.match(/^\/dojo\/app\/store\/c\/([^/]+)(?:\/([^/]+))?$/);
  if (catMatch) {
    const [, cSlug, sSlug] = catMatch;
    const parent = cats.find((c) => c.slug === cSlug);
    const sub = sSlug && sSlug !== "todos" ? cats.find((c) => c.slug === sSlug) : null;
    const arr: Crumb[] = [base];
    arr.push({
      label: parent?.name ?? cSlug,
      to: "/dojo/app/store/c/$categoria",
      params: { categoria: cSlug },
    });
    if (sub) arr.push({ label: sub.name });
    else if (sSlug === "todos") arr.push({ label: "Todos os produtos" });
    return arr;
  }

  const pdp = pathname.match(/^\/dojo\/app\/store\/produtos\/([^/]+)$/);
  if (pdp) return [base, { label: "Produto" }];

  return [base];
}
