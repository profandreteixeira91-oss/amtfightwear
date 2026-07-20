/**
 * StoreProvider — camada de abstração entre o AMT Store (Dojo Manager) e a
 * fonte real do catálogo. A implementação atual (LocalAmtProvider) lê
 * diretamente as tabelas `products`, `store_categories` e
 * `store_product_variants` do próprio Supabase. Se futuramente a loja for
 * migrada para outra plataforma, basta criar um `RemoteHttpProvider` que
 * implemente esta mesma interface — nenhum componente do UI precisa mudar.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  price: number;
  compare_at_price: number | null;
  wholesale_enabled: boolean;
  wholesale_discount_percent: number;
  wholesale_price: number;
  stock: number;
  image_url: string | null;
  featured: boolean;
  status: string | null;
  created_at: string;
};

export type StoreVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  option_label: string | null;
  price: number | null;
  stock: number;
  active: boolean;
};

export type StoreCategory = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  active: boolean;
  sort_order: number;
};

export interface StoreProvider {
  listCategories(): Promise<StoreCategory[]>;
  listProducts(input: {
    search?: string;
    categorySlug?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sort?: "recent" | "price_asc" | "price_desc" | "name";
  }): Promise<{ items: StoreProduct[]; total: number }>;
  getProductBySlug(slug: string): Promise<{ product: StoreProduct; variants: StoreVariant[] } | null>;
  getProductsByIds(ids: string[]): Promise<StoreProduct[]>;
}

function wholesalePrice(price: number, enabled: boolean, discountPct: number | null | undefined): number {
  if (!enabled || !discountPct) return price;
  const p = Math.max(0, Math.min(90, Number(discountPct)));
  return Math.round(price * (1 - p / 100) * 100) / 100;
}

function normalizeProduct(row: any): StoreProduct {
  const price = Number(row.price ?? 0);
  const wsEnabled = !!row.wholesale_enabled;
  const wsPct = Number(row.wholesale_discount_percent ?? 0);
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name ?? "Produto",
    description: row.description ?? row.description_html ?? null,
    short_description: row.short_description ?? null,
    category: row.category ?? null,
    category_id: row.category_id ?? null,
    category_slug: row.store_categories?.slug ?? null,
    category_name: row.store_categories?.name ?? row.category ?? null,
    price,
    compare_at_price: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    wholesale_enabled: wsEnabled,
    wholesale_discount_percent: wsPct,
    wholesale_price: wholesalePrice(price, wsEnabled, wsPct),
    stock: Number(row.stock ?? 0),
    image_url: row.image_url ?? null,
    featured: !!row.featured,
    status: row.status ?? null,
    created_at: row.created_at,
  };
}

const PRODUCT_COLS =
  "id, slug, name, description, description_html, short_description, category, category_id, price, compare_at_price, wholesale_enabled, wholesale_discount_percent, stock, image_url, featured, status, created_at, store_categories!products_category_id_fkey(slug, name)";

export class LocalAmtProvider implements StoreProvider {
  constructor(private supabase: SupabaseClient<any, any, any>) {}

  async listCategories(): Promise<StoreCategory[]> {
    const { data, error } = await this.supabase
      .from("store_categories")
      .select("id, slug, name, parent_id, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as StoreCategory[];
  }

  async listProducts(input: {
    search?: string;
    categorySlug?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sort?: "recent" | "price_asc" | "price_desc" | "name";
  }) {
    const limit = Math.min(input.limit ?? 24, 100);
    const offset = input.offset ?? 0;
    let query = this.supabase
      .from("products")
      .select(PRODUCT_COLS, { count: "exact" })
      .eq("status", "active");

    if (input.search && input.search.trim()) {
      // Busca por palavras soltas (OR entre tokens) — inclui nome de categoria.
      const tokens = input.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length) {
        // Pré-busca IDs de categorias cujo nome/slug bate com algum token.
        const catOr = tokens.map((t) => `name.ilike.%${t}%,slug.ilike.%${t}%`).join(",");
        const { data: matchedCats } = await this.supabase
          .from("store_categories")
          .select("id")
          .or(catOr);
        const catIds = (matchedCats ?? []).map((c: any) => c.id);
        const textOr = tokens
          .map((t) => `name.ilike.%${t}%,description.ilike.%${t}%,short_description.ilike.%${t}%,category.ilike.%${t}%`)
          .join(",");
        const finalOr = catIds.length ? `${textOr},category_id.in.(${catIds.join(",")})` : textOr;
        query = query.or(finalOr);
      }
    }
    if (input.categorySlug) {
      const { data: cat } = await this.supabase.from("store_categories").select("id").eq("slug", input.categorySlug).maybeSingle();
      if (cat?.id) {
        // Inclui produtos da categoria e de TODAS as suas descendentes (subárvore),
        // igual ao comportamento da loja principal — evita "nenhum produto"
        // quando os produtos estão em subcategorias filhas.
        const { data: allCats } = await this.supabase
          .from("store_categories")
          .select("id, parent_id")
          .eq("active", true);
        const childrenByParent = new Map<string, string[]>();
        for (const c of (allCats ?? []) as Array<{ id: string; parent_id: string | null }>) {
          if (!c.parent_id) continue;
          const arr = childrenByParent.get(c.parent_id) ?? [];
          arr.push(c.id);
          childrenByParent.set(c.parent_id, arr);
        }
        const ids: string[] = [];
        const stack: string[] = [cat.id];
        while (stack.length) {
          const cur = stack.pop()!;
          ids.push(cur);
          const kids = childrenByParent.get(cur);
          if (kids) stack.push(...kids);
        }
        query = query.in("category_id", ids);
      }
    }
    if (input.featured) query = query.eq("featured", true);

    switch (input.sort) {
      case "price_asc": query = query.order("price", { ascending: true }); break;
      case "price_desc": query = query.order("price", { ascending: false }); break;
      case "name": query = query.order("name", { ascending: true }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    return { items: (data ?? []).map(normalizeProduct), total: count ?? 0 };
  }

  async getProductBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const product = normalizeProduct(data);
    const { data: variants } = await this.supabase
      .from("store_product_variants")
      .select("id, product_id, size, color, option_label, price, stock, active")
      .eq("product_id", product.id)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return { product, variants: (variants ?? []) as StoreVariant[] };
  }

  async getProductsByIds(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await this.supabase
      .from("products")
      .select(PRODUCT_COLS)
      .in("id", ids);
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalizeProduct);
  }
}

export function getStoreProvider(supabase: SupabaseClient<any, any, any>): StoreProvider {
  return new LocalAmtProvider(supabase);
}

export function computeWholesalePrice(product: Pick<StoreProduct, "price" | "wholesale_enabled" | "wholesale_discount_percent">) {
  return wholesalePrice(product.price, product.wholesale_enabled, product.wholesale_discount_percent);
}
