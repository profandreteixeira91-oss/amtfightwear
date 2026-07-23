import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { dsListProducts } from "@/lib/dojo/store/store.functions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Busca instantânea global da AMT Store.
 * Reaproveita dsListProducts (mesma fonte de dados usada nas listagens);
 * a filtragem é apenas visual/local no dropdown, sem alterar navegação
 * ou o comportamento existente do input de busca dentro das listagens.
 */
export function SearchAutocomplete() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q.trim(), 220);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // fecha ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // click outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const fn = useServerFn(dsListProducts);
  const { data, isFetching } = useQuery({
    queryKey: ["dojo-store", "search", debounced],
    queryFn: () => fn({ data: { search: debounced, sort: "name", limit: 8 } }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const showDropdown = open && q.trim().length >= 2;

  return (
    <div ref={ref} className="relative w-full">
      <label className="sr-only" htmlFor="amt-store-search">
        Buscar produtos na AMT Store
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <input
          id="amt-store-search"
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && items[0]) {
              nav({
                to: "/dojo/app/store/produtos/$slug",
                params: { slug: items[0].slug },
              });
            }
          }}
          placeholder="Buscar faixas, kimonos, patches, rash guards..."
          className="h-12 w-full rounded-full border border-[color:var(--dojo-border)] bg-white pl-12 pr-12 text-sm text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-black/[0.05] hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-[color:var(--dojo-border)] bg-white shadow-[var(--dojo-shadow-lg)] animate-in fade-in-0 zoom-in-95"
        >
          {isFetching && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nada encontrado para <span className="font-medium text-foreground">"{q}"</span>.
            </div>
          ) : (
            <ul className="p-2">
              {items.map((p: any) => (
                <li key={p.id}>
                  <Link
                    to="/dojo/app/store/produtos/$slug"
                    params={{ slug: p.slug }}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-black/[0.04] focus-visible:bg-black/[0.05] focus-visible:outline-none"
                    role="option"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[color:var(--dojo-surface-3)]">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                      {p.category_name && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {p.category_name}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                      {brl(Number(p.price))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
