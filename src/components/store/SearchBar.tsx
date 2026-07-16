import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/store/ProductImage";

type Suggestion = {
  id: string;
  name: string;
  slug: string | null;
  price: number | string;
  image_url: string | null;
  category: string | null;
};

export function SearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fecha ao clicar fora
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Busca com debounce
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      // Divide em palavras e busca cada uma em name/short_description/category
      const words = term.split(/\s+/).filter(Boolean);
      let query = supabase
        .from("products")
        .select("id, name, slug, price, image_url, category")
        .eq("status", "active");
      for (const w of words) {
        const like = `%${w}%`;
        query = query.or(
          `name.ilike.${like},short_description.ilike.${like},category.ilike.${like}`,
        );
      }
      const { data } = await query.limit(8);
      setItems((data ?? []) as Suggestion[]);
      setActiveIdx(-1);
      setLoading(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  const go = (s: Suggestion) => {
    setOpen(false);
    setQ("");
    navigate({ to: "/loja/produto/$slug", params: { slug: s.slug ?? s.id } });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && items[activeIdx]) {
        e.preventDefault();
        go(items[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && q.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative hidden md:flex flex-1">
      <div className="flex flex-1 items-center rounded-md border bg-muted/40 px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Buscar kimono, rashguard, faixa..."
          className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-md border bg-popover shadow-lg">
          {items.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{q}"
            </div>
          )}
          {items.map((s, i) => {
            const price = Number(s.price);
            return (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => go(s)}
                className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left transition-colors last:border-0 ${
                  i === activeIdx ? "bg-accent" : "hover:bg-accent/60"
                }`}
              >
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-muted">
                  <ProductImage src={s.image_url} alt={s.name} aspect="square" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                  {s.category && (
                    <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.category}
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold text-foreground">
                  {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </button>
            );
          })}
          {items.length > 0 && (
            <Link
              to="/loja"
              onClick={() => setOpen(false)}
              className="block border-t bg-muted/30 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-primary hover:bg-muted"
            >
              Ver todos os produtos
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
