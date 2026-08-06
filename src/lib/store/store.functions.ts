import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// ============ PUBLIC READS ============

// ---------- Wholesale settings (shared by storefront and admin) ----------

type WholesaleSettings = {
  enabled: boolean;
  default_discount_percent: number;
  min_qty_per_subcategory: number;
  conditions: string;
};

const WHOLESALE_SETTINGS_DEFAULT: WholesaleSettings = {
  enabled: true,
  default_discount_percent: 25,
  min_qty_per_subcategory: 10,
  conditions: "Mínimo de 10 unidades por subcategoria. Etiqueta personalizada grátis. Prazo de produção de até 10 dias úteis. Frete calculado no checkout.",
};

function normalizeWholesaleSettings(raw: unknown): WholesaleSettings {
  const v = (raw ?? {}) as Partial<WholesaleSettings>;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : WHOLESALE_SETTINGS_DEFAULT.enabled,
    default_discount_percent: Number(v.default_discount_percent ?? WHOLESALE_SETTINGS_DEFAULT.default_discount_percent),
    min_qty_per_subcategory: Math.max(1, Math.floor(Number(v.min_qty_per_subcategory ?? WHOLESALE_SETTINGS_DEFAULT.min_qty_per_subcategory))),
    conditions: String(v.conditions ?? WHOLESALE_SETTINGS_DEFAULT.conditions),
  };
}

async function readWholesaleSettings(sb: any): Promise<WholesaleSettings> {
  const { data } = (await sb.from("app_settings").select("value").eq("key", "wholesale_settings").maybeSingle()) as any;
  return normalizeWholesaleSettings(data?.value);
}

export const getWholesaleSettings = createServerFn({ method: "GET" }).handler(async () => {
  return readWholesaleSettings(publicClient());
});

export const adminSaveWholesaleSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      enabled: z.boolean(),
      default_discount_percent: z.number().min(0).max(90),
      min_qty_per_subcategory: z.number().int().min(1).max(1000),
      conditions: z.string().max(2000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("app_settings")
      .upsert({ key: "wholesale_settings", value: data as never, updated_by: context.userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkSetWholesaleEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error, count } = await (context.supabase
      .from("store_products" as any)
      .update({ wholesale_enabled: data.enabled }, { count: "exact" })
      .neq("wholesale_enabled", data.enabled)) as any;
    if (error) throw new Error(error.message);
    return { ok: true, updated: count ?? 0 };
  });

// ---------- Wholesale catalog (public) ----------

export const listWholesaleCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const settings = await readWholesaleSettings(sb);
  const PAGE = 1000;
  const fetchAllVariants = async (productIds: string[]) => {
    const out: any[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = (await sb.from("store_product_variants")
        .select("*")
        .eq("active", true)
        .in("product_id", productIds)
        .order("product_id")
        .order("sort_order")
        .range(from, from + PAGE - 1)) as any;
      if (error) throw error;
      const rows = data ?? [];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  };
  const [cats, prodsRes] = await Promise.all([
    sb.from("store_categories").select("id, slug, name, parent_id").eq("active", true).order("sort_order"),
    sb.from("store_products" as any).select("id, name, slug, price, compare_at_price, image_url, category_id, stock, short_description, wholesale_discount_percent").eq("status", "active").eq("wholesale_enabled", true).order("name"),
  ]);
  const prods = (prodsRes.data as any[]) ?? [];
  const variants = await fetchAllVariants(prods.map((p: any) => p.id));
  return { categories: cats.data ?? [], products: prods, variants, settings };
});

export const adminCreateWholesaleOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      customer_name: z.string().min(1),
      customer_email: z.string().email(),
      customer_phone: z.string().optional().nullable(),
      customer_document: z.string().optional().nullable(),
      items: z.array(z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().optional().nullable(),
        quantity: z.number().int().min(1),
      })).min(1),
      label_logo: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const settingsRow = (await supabaseAdmin.from("app_settings").select("value").eq("key", "wholesale_settings").maybeSingle()) as any;
    const settings = normalizeWholesaleSettings(settingsRow?.data?.value);
    if (!settings.enabled) throw new Error("Vendas no atacado estão desativadas.");
    const MIN_QTY = settings.min_qty_per_subcategory;
    const DEFAULT_PCT = settings.default_discount_percent;

    const productIds = [...new Set(data.items.map((i) => i.product_id))];
    const variantIds = [...new Set(data.items.map((i) => i.variant_id).filter(Boolean) as string[])];
    
    const [{ data: products }, { data: variants }] = (await Promise.all([
      supabaseAdmin.from("store_products" as any).select("id, name, price, image_url, category_id, wholesale_enabled, wholesale_discount_percent").in("id", productIds),
      variantIds.length ? supabaseAdmin.from("store_product_variants").select("id, product_id, size, color, option_label, sku, price").in("id", variantIds) : Promise.resolve({ data: [] }),
    ])) as any[];

    if (!products || products.length < productIds.length) throw new Error("Um ou mais produtos não encontrados.");
    
    let subtotal = 0;
    const orderItems: any[] = [];
    for (const it of data.items) {
      const p = products.find((pp: any) => pp.id === it.product_id)!;
      const v = it.variant_id ? variants?.find((vv: any) => vv.id === it.variant_id) ?? null : null;
      const originalPrice = Number(v?.price ?? p.price);
      const productPct = p.wholesale_discount_percent != null ? Number(p.wholesale_discount_percent) : DEFAULT_PCT;
      const pct = Math.max(0, Math.min(90, productPct));
      const unit_price = Number((originalPrice * (1 - pct / 100)).toFixed(2));
      const total_price = unit_price * it.quantity;
      subtotal += total_price;
      orderItems.push({
        product_id: p.id,
        variant_id: v?.id ?? null,
        product_name: p.name,
        variant_label: v ? [v.size, v.color, v.option_label].filter(Boolean).join(" / ") : null,
        quantity: it.quantity,
        unit_price,
        total_price,
      });
    }

    const { data: order, error } = (await supabaseAdmin.from("store_orders").insert({
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      customer_document: data.customer_document,
      subtotal,
      shipping_cost: 0,
      total: subtotal,
      status: "pending_payment",
      metadata: { wholesale: true, label_logo: data.label_logo },
    }).select("*").single()) as any;

    if (error || !order) throw new Error(error?.message ?? "Erro ao criar pedido");

    const { error: itemsErr } = await supabaseAdmin.from("store_order_items").insert(orderItems.map(oi => ({ ...oi, order_id: order.id })));
    if (itemsErr) throw new Error(itemsErr.message);

    return { id: order.id, order_number: order.order_number };
  });

// ---------- Storefront Logic ----------

export const listStorefrontHome = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const productSel = "id, name, slug, price, compare_at_price, image_url, category_id, stock, short_description, wholesale_discount_percent, featured";
  const [all, newest] = (await Promise.all([
    sb.from("store_products" as any).select(productSel).eq("status", "active").limit(200),
    sb.from("store_products" as any).select(productSel).eq("status", "active").order("created_at", { ascending: false }).limit(12),
  ])) as any[];

  const prods = all.data ?? [];
  return {
    all: prods,
    featured: prods.filter((p: any) => p.featured),
    newest: newest.data ?? [],
    bjjBelts: prods.filter((p: any) => p.category_id === "a2a2d488-8b8a-4952-b066-6b2a0c44a2c0"),
  };
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: product } = (await sb.from("store_products" as any).select("*").eq("slug", data.slug).eq("status", "active").maybeSingle()) as any;
    if (!product) return { product: null, images: [], variants: [], related: [], category: null };
    const [imagesR, variantsR, categoryR] = (await Promise.all([
      sb.from("store_product_images").select("*").eq("product_id", product.id).order("sort_order"),
      sb.from("store_product_variants").select("*").eq("product_id", product.id).eq("active", true).order("sort_order"),
      product.category_id ? sb.from("store_categories").select("id, slug, name").eq("id", product.category_id).maybeSingle() : Promise.resolve({ data: null }),
    ])) as any[];
    const { data: related } = product.category_id
      ? (await sb.from("store_products" as any).select("id, name, slug, price, compare_at_price, image_url").eq("status", "active").eq("category_id", product.category_id).neq("id", product.id).limit(4)) as any
      : { data: [] };
    return { product, images: imagesR.data ?? [], variants: variantsR.data ?? [], related: related ?? [], category: categoryR.data };
  });

// ============ ADMIN PRODUCTS & CATEGORIES ============

export const adminListStoreProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = (await context.supabase.from("store_products" as any).select("*").order("updated_at", { ascending: false }).limit(500)) as any;
    return data ?? [];
  });

export const adminCreateStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      price: z.number().min(0),
      stock: z.number().int().min(0).default(0),
      category_id: z.string().uuid().optional().nullable(),
      short_description: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      image_url: z.string().optional().nullable(),
      status: z.string().default("active"),
      featured: z.boolean().default(false),
      ncm: z.string().optional().nullable(),
      cest: z.string().optional().nullable(),
      origem: z.string().optional().nullable(),
      cfop_internal: z.string().optional().nullable(),
      cfop_interstate: z.string().optional().nullable(),
      unit_commercial: z.string().optional().nullable(),
      unit_taxable: z.string().optional().nullable(),
      unidade: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: created, error } = (await context.supabase.from("store_products" as any).insert(data).select("id").single()) as any;
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const adminUpdateStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        name: z.string().optional(),
        price: z.number().optional(),
        stock: z.number().optional(),
        status: z.string().optional(),
        featured: z.boolean().optional(),
        category_id: z.string().uuid().optional().nullable(),
        ncm: z.string().optional().nullable(),
        cest: z.string().optional().nullable(),
        origem: z.string().optional().nullable(),
        cfop_internal: z.string().optional().nullable(),
        cfop_interstate: z.string().optional().nullable(),
        unit_commercial: z.string().optional().nullable(),
        unit_taxable: z.string().optional().nullable(),
        unidade: z.string().optional().nullable(),
      }),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_products" as any).update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_products" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListStoreCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = (await context.supabase.from("store_categories").select("*").order("sort_order")) as any;
    return data ?? [];
  });

export const adminUpsertStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().min(1),
      name: z.string().min(1),
      parent_id: z.string().uuid().optional().nullable(),
      sort_order: z.number().int().default(0),
      active: z.boolean().default(true),
      image_url: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_categories").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetStoreProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: product, error } = (await context.supabase.from("store_products" as any).select("*").eq("id", data.id).maybeSingle()) as any;
    if (error) throw new Error(error.message);
    const { data: variants } = (await context.supabase.from("store_product_variants").select("*").eq("product_id", data.id).order("sort_order")) as any;
    return { product, variants: variants ?? [] };
  });
