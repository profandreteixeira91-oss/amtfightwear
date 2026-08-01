/**
 * Memória local da loja (100% nativa, sem backend):
 *  - Produtos vistos recentemente
 *  - Favoritos
 *
 * Ambos persistem em localStorage e são reativos entre abas/componentes
 * através de um CustomEvent interno.
 */

import { useCallback, useEffect, useState } from "react";

const RECENT_KEY = "amt-recent-products-v1";
const FAV_KEY = "amt-favorite-products-v1";
const SYNC_EVENT = "amt:store-memory";
const RECENT_LIMIT = 12;

export interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  price: number;
  viewed_at: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
  } catch {
    /* quota cheia — ignora */
  }
}

function useSyncedValue<T>(key: string, fallback: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    const sync = () => setValue(read<T>(key, fallback));
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      write(key, next);
      setValue(next);
    },
    [key],
  );

  return [value, update];
}

/* ------------------------------ Vistos recentemente ----------------------- */

export function pushRecentProduct(p: Omit<RecentProduct, "viewed_at">) {
  if (!p?.id || !p?.slug) return;
  const list = read<RecentProduct[]>(RECENT_KEY, []).filter((x) => x.id !== p.id);
  write(RECENT_KEY, [{ ...p, viewed_at: Date.now() }, ...list].slice(0, RECENT_LIMIT));
}

export function useRecentProducts(excludeId?: string) {
  const [list] = useSyncedValue<RecentProduct[]>(RECENT_KEY, []);
  return excludeId ? list.filter((p) => p.id !== excludeId) : list;
}

/* --------------------------------- Favoritos ------------------------------ */

export interface FavoriteProduct {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  price: number;
  added_at: number;
}

export function useFavorites() {
  const [list, setList] = useSyncedValue<FavoriteProduct[]>(FAV_KEY, []);

  const isFavorite = useCallback((id: string) => list.some((f) => f.id === id), [list]);

  const toggle = useCallback(
    (p: Omit<FavoriteProduct, "added_at">) => {
      const exists = list.some((f) => f.id === p.id);
      const next = exists
        ? list.filter((f) => f.id !== p.id)
        : [{ ...p, added_at: Date.now() }, ...list];
      setList(next);
      return !exists;
    },
    [list, setList],
  );

  const remove = useCallback(
    (id: string) => setList(list.filter((f) => f.id !== id)),
    [list, setList],
  );

  return { favorites: list, isFavorite, toggle, remove };
}
