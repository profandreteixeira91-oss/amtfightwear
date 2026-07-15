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

export const listStorefrontHome = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [categories, featured, newest] = await Promise.all([
    sb.from("store_categories").select("id, slug, name, image_url, sort_order").eq("active", true).order("sort_order").limit(12),
    sb.from("products").select("id, name, slug, price, compare_at_price, image_url, category_id").eq("status", "active").eq("featured", true).limit(8),
    sb.from("products").select("id, name, slug, price, compare_at_price, image_url, category_id").eq("status", "active").order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    categories: categories.data ?? [],
    featured: featured.data ?? [],
    newest: newest.data ?? [],
  };
});

export const listStoreCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("store_categories").select("id, slug, name, image_url, description, sort_order, parent_id").eq("active", true).order("sort_order");
  return data ?? [];
});

export const getCategoryWithProducts = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: category } = await sb.from("store_categories").select("*").eq("slug", data.slug).eq("active", true).maybeSingle();
    if (!category) return { category: null, products: [] };

    // Include products from this category AND all descendant categories,
    // so a root category page shows every product under its subtree.
    const { data: allCats } = await sb
      .from("store_categories")
      .select("id, parent_id")
      .eq("active", true);
    const childrenByParent = new Map<string, string[]>();
    for (const c of allCats ?? []) {
      if (!c.parent_id) continue;
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c.id);
      childrenByParent.set(c.parent_id, arr);
    }
    const ids: string[] = [];
    const stack: string[] = [category.id];
    while (stack.length) {
      const cur = stack.pop()!;
      ids.push(cur);
      const kids = childrenByParent.get(cur);
      if (kids) stack.push(...kids);
    }

    const { data: products } = await sb
      .from("products")
      .select("id, name, slug, price, compare_at_price, image_url, short_description")
      .eq("status", "active")
      .in("category_id", ids)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    return { category, products: products ?? [] };
  });


export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: product } = await sb.from("products").select("*").eq("slug", data.slug).eq("status", "active").maybeSingle();
    if (!product) return { product: null, images: [], variants: [], related: [], category: null };
    const [imagesR, variantsR, categoryR] = await Promise.all([
      sb.from("store_product_images").select("*").eq("product_id", product.id).order("sort_order"),
      sb.from("store_product_variants").select("*").eq("product_id", product.id).eq("active", true).order("sort_order"),
      product.category_id
        ? sb.from("store_categories").select("id, slug, name").eq("id", product.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const { data: related } = product.category_id
      ? await sb.from("products").select("id, name, slug, price, compare_at_price, image_url").eq("status", "active").eq("category_id", product.category_id).neq("id", product.id).limit(4)
      : { data: [] };
    return {
      product,
      images: imagesR.data ?? [],
      variants: variantsR.data ?? [],
      related: related ?? [],
      category: categoryR.data,
    };
  });

// ============ CHECKOUT (public but authenticated where possible) ============

const AddressSchema = z.object({
  zip: z.string().min(8).max(9),
  street: z.string().min(2),
  number: z.string().min(1),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
});

const CheckoutItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1),
});

export const createStoreOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      customer_email: z.string().email(),
      customer_name: z.string().min(2),
      customer_phone: z.string().optional().nullable(),
      customer_document: z.string().optional().nullable(),
      shipping_address: AddressSchema,
      items: z.array(CheckoutItemSchema).min(1),
      user_id: z.string().uuid().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch products/variants to compute prices server-side
    const productIds = [...new Set(data.items.map((i) => i.product_id))];
    const { data: products } = await supabaseAdmin.from("products").select("id, name, price, image_url").in("id", productIds);
    const variantIds = data.items.map((i) => i.variant_id).filter(Boolean) as string[];
    const { data: variants } = variantIds.length
      ? await supabaseAdmin.from("store_product_variants").select("*").in("id", variantIds)
      : { data: [] };

    if (!products || products.length === 0) throw new Error("Produtos inválidos");

    let subtotal = 0;
    const orderItems = data.items.map((it) => {
      const p = products.find((pp) => pp.id === it.product_id);
      if (!p) throw new Error(`Produto ${it.product_id} não encontrado`);
      const v = it.variant_id ? variants?.find((vv) => vv.id === it.variant_id) : null;
      const unit_price = Number(v?.price ?? p.price);
      const total_price = unit_price * it.quantity;
      subtotal += total_price;
      return {
        product_id: p.id,
        variant_id: v?.id ?? null,
        product_name: p.name,
        variant_label: v ? [v.size, v.color].filter(Boolean).join(" / ") || v.option_label : null,
        sku: v?.sku ?? null,
        image_url: p.image_url,
        quantity: it.quantity,
        unit_price,
        total_price,
      };
    });

    const shipping_cost = 0; // Fase 2: Melhor Envio
    const total = subtotal + shipping_cost;

    const { data: order, error } = await supabaseAdmin
      .from("store_orders")
      .insert({
        user_id: data.user_id ?? null,
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_document: data.customer_document,
        shipping_address: data.shipping_address,
        subtotal,
        shipping_cost,
        total,
        notes: data.notes,
        status: "pending_payment",
        payment_status: "pending",
      })
      .select()
      .single();

    if (error || !order) throw new Error(error?.message ?? "Erro ao criar pedido");

    const { error: itemsErr } = await supabaseAdmin
      .from("store_order_items")
      .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
    if (itemsErr) throw new Error(itemsErr.message);

    return { id: order.id, order_number: order.order_number, total: order.total };
  });

export const getStoreOrder = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("store_orders").select("*").eq("id", data.id).maybeSingle();
    if (!order) return null;
    const { data: items } = await supabaseAdmin.from("store_order_items").select("*").eq("order_id", order.id);
    return { order, items: items ?? [] };
  });

// ============ ADMIN ============

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("store_orders").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.string(), payment_status: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const patch: { status: string; payment_status?: string } = { status: data.status };
    if (data.payment_status) patch.payment_status = data.payment_status;
    const { error } = await context.supabase.from("store_orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListStoreProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("products")
      .select("id, name, slug, price, compare_at_price, stock, status, featured, category_id, image_url, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const adminUpsertStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      image_url: z.string().optional().nullable(),
      sort_order: z.number().int().default(0),
      active: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("store_categories").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase.from("store_categories").insert(data).select("id").single();
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
        slug: z.string().optional(),
        short_description: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        description_html: z.string().optional().nullable(),
        price: z.number().optional(),
        compare_at_price: z.number().optional().nullable(),
        stock: z.number().int().optional(),
        status: z.string().optional(),
        featured: z.boolean().optional(),
        category_id: z.string().uuid().optional().nullable(),
        image_url: z.string().optional().nullable(),
      }),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
