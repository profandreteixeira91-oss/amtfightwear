import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/store/ProductImage";
import { expandSearchTerms } from "@/lib/store/search-terms";
import { trackStoreEvent } from "@/lib/store/analytics";

type Suggestion = {
  id: string;
  name: string;
  slug: string | null;
  price: number | string;
  image_url: string | null;
  category: string | null;
};

type Cat = { id: string; slug: string; name: string; parent_id: string | null };

export function SearchBar({ className }: { className?: string } = {}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>(""); // "" = todas
  const [catOpen, setCatOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load categories once
  useEffect(() => {
    supabase
      .from("store_categories")
      .select("id, slug, name, parent_id")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name")
      .then(({ data }) => setCats((data ?? []) as Cat[]));
  }, []);

  const { childrenByParent, topCats, catById } = useMemo(() => {
    const map = new Map<string, Cat[]>();
    const byId = new Map<string, Cat>();
    for (const c of cats) {
      byId.set(c.id, c);
      if (c.parent_id) {
        const arr = map.get(c.parent_id) ?? [];
        arr.push(c);
        map.set(c.parent_id, arr);
      }
    }
    return { childrenByParent: map, topCats: cats.filter((c) => !c.parent_id), catById: byId };
  }, [cats]);

  const descendantIds = (id: string): string[] => {
    const out = [id];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      const kids = childrenByParent.get(cur) ?? [];
      for (const k of kids) {
        out.push(k.id);
        stack.push(k.id);
      }
    }
    return out;
  };

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Search with debounce — OR across words and fields
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      // Palavras digitadas + correções de digitação + sinônimos.
      const words = expandSearchTerms(term);
      let query = supabase
        .from("products")
        .select("id, name, slug, price, image_url, category")
        .eq("status", "active");

      if (selectedCatId) {
        query = query.in("category_id", descendantIds(selectedCatId));
      }

      if (words.length > 0) {
        const escape = (s: string) => s.replace(/[,%()]/g, " ").trim();
        const orParts: string[] = [];
        for (const w of words) {
          const like = `%${escape(w)}%`;
          orParts.push(`name.ilike.${like}`);
          orParts.push(`short_description.ilike.${like}`);
          orParts.push(`description.ilike.${like}`);
          orParts.push(`category.ilike.${like}`);
        }
        query = query.or(orParts.join(","));
      }

      const { data } = await query.limit(12);
      setItems((data ?? []) as Suggestion[]);
      setActiveIdx(-1);
      setLoading(false);
      trackStoreEvent("search", { search_term: term, results: (data ?? []).length });
    }, 200);
    return () => clearTimeout(handle);
  }, [q, selectedCatId, cats]);


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
  const selectedLabel = selectedCatId ? catById.get(selectedCatId)?.name ?? "Todas" : "Todas";

  return (
    <div ref={wrapRef} className={className ?? "relative hidden md:flex flex-1"}>
      <div className="flex flex-1 items-stretch rounded-md border bg-muted/40">
        {/* Category selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            className="flex h-full items-center gap-1 border-r px-3 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-accent"
          >
            <span className="max-w-[140px] truncate">{selectedLabel}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          {catOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-[280px] overflow-auto rounded-md border bg-popover p-1 shadow-lg">
              <button
                type="button"
                onClick={() => { setSelectedCatId(""); setCatOpen(false); }}
                className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent ${selectedCatId === "" ? "bg-accent font-semibold" : ""}`}
              >
                Todas as categorias
              </button>
              <div className="my-1 h-px bg-border" />
              {topCats.map((c) => (
                <div key={c.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedCatId(c.id); setCatOpen(false); }}
                    className={`block w-full rounded px-3 py-2 text-left text-sm font-semibold hover:bg-accent ${selectedCatId === c.id ? "bg-accent" : ""}`}
                  >
                    {c.name}
                  </button>
                  {(childrenByParent.get(c.id) ?? []).map((sub) => (
                    <div key={sub.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedCatId(sub.id); setCatOpen(false); }}
                        className={`block w-full rounded px-3 py-1.5 pl-6 text-left text-xs hover:bg-accent ${selectedCatId === sub.id ? "bg-accent font-semibold" : "text-muted-foreground"}`}
                      >
                        ↳ {sub.name}
                      </button>
                      {(childrenByParent.get(sub.id) ?? []).map((sub2) => (
                        <button
                          key={sub2.id}
                          type="button"
                          onClick={() => { setSelectedCatId(sub2.id); setCatOpen(false); }}
                          className={`block w-full rounded px-3 py-1.5 pl-10 text-left text-xs hover:bg-accent ${selectedCatId === sub2.id ? "bg-accent font-semibold" : "text-muted-foreground"}`}
                        >
                          · {sub2.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center px-3">
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
            placeholder="Buscar por palavras: ex. 'pro bordada'..."
            className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-auto rounded-md border bg-popover shadow-lg">
          {items.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{q}"
              {selectedCatId && <> em <strong>{selectedLabel}</strong></>}
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
