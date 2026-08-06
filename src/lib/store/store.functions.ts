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

async function readWholesaleSettings(sb: ReturnType<typeof publicClient>): Promise<WholesaleSettings> {
  const { data } = await sb.from("app_settings").select("value").eq("key", "wholesale_settings").maybeSingle();
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
    const { error, count } = await context.supabase
      .from("store_products" as any)
      .update({ wholesale_enabled: data.enabled }, { count: "exact" })
      .neq("wholesale_enabled", data.enabled);
    if (error) throw new Error(error.message);
    return { ok: true, updated: count ?? 0 };
  });

// ---------- Wholesale catalog (public) ----------

export const listWholesaleCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const settings = await readWholesaleSettings(sb);
  // Fetch variants in pages to bypass the PostgREST 1000-row default cap.
  const PAGE = 1000;
  const fetchAllVariants = async (productIds: string[]) => {
    const out: Array<{ id: string; product_id: string; size: string | null; color: string | null; option_label: string | null; sku: string | null; price: number | null; sort_order: number; active: boolean }> = [];
    if (productIds.length === 0) return out;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from("store_product_variants")
        .select("id, product_id, size, color, option_label, sku, price, sort_order, active")
        .eq("active", true)
        .in("product_id", productIds)
        .order("product_id")
        .order("sort_order")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = data ?? [];
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  };
  const [cats, prodsRes] = await Promise.all([
    sb.from("store_categories").select("id, slug, name, parent_id").eq("active", true).order("sort_order"),
    sb.from("store_products" as any)
      .select("id, name, slug, price, compare_at_price, image_url, category_id, stock, short_description, wholesale_discount_percent")
      .eq("status", "active")
      .eq("wholesale_enabled", true)
      .order("name"),
  ]);
  const prods = (prodsRes.data as any[]) ?? [];
  const variants = await fetchAllVariants(prods.map((p: any) => p.id));
  return { categories: cats.data ?? [], products: prods, variants, settings };
});



const WholesaleItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1),
});

export const createWholesaleOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      customer_email: z.string().email(),
      customer_name: z.string().min(2),
      customer_phone: z.string().optional().nullable(),
      customer_document: z.string().optional().nullable(),
      shipping_address: AddressSchema,
      items: z.array(WholesaleItemSchema).min(1),
      label_logo: z.object({ data_url: z.string(), filename: z.string() }).optional().nullable(),
      notes: z.string().optional().nullable(),
      user_id: z.string().uuid().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


    // Read admin-controlled wholesale settings.
    const { data: settingsRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "wholesale_settings")
      .maybeSingle();
    const settings = normalizeWholesaleSettings(settingsRow?.value);
    const PAGE = 24;
    const from = ((data.page || 1) - 1) * PAGE;
    const sb = supabaseAdmin;
    const productSel = "id, name, slug, price, compare_at_price, image_url, category_id, wholesale_enabled, wholesale_discount_percent, ncm, cfop_internal";
    const [productsR, categoriesR] = await Promise.all([
      sb.from("store_products" as any)
        .select(productSel)
        .eq("status", "active")
        .eq("wholesale_enabled", true)
        .order("name")
        .range(from, from + PAGE - 1),
      sb.from("store_categories").select("id, name, slug").eq("active", true),
    ]);
    const products = (productsR.data as any[]) || [];
    const categories = (categoriesR.data as any[]) || [];
    const productIds = products.map((p) => p.id);
    const variants: any[] = [];
    if (productIds.length > 0) {
      const { data, error } = await sb.from("store_product_variants")
        .select("id, product_id, size, color, option_label, sku, price, sort_order, active")
        .eq("active", true)
        .in("product_id", productIds)
        .order("product_id")
        .order("sort_order");
      if (!error && data) variants.push(...data);
    }
    return { products, variants, categories, settings };

    // Group quantities by leaf category (subcategoria)
    const qtyByCategory = new Map<string, number>();
    for (const it of data.items) {
      const p =  (products as any[]).find((pp: any) => pp.id === it.product_id)!;
      const cat = p.category_id ?? "__no_category__";
      qtyByCategory.set(cat, (qtyByCategory.get(cat) ?? 0) + it.quantity);
    }
    // Validate min qty per subcategory (from settings)
    const violations: string[] = [];
    for (const [cat, qty] of qtyByCategory) {
      if (qty < MIN_QTY) violations.push(`${cat}:${qty}`);
    }
    if (violations.length > 0) {
      throw new Error(
        `Atacado exige no mínimo ${MIN_QTY} unidades por subcategoria. Categorias abaixo do mínimo: ${violations.join(", ")}`,
      );
    }

    let subtotalOriginal = 0;
    let subtotal = 0;
    const orderItems: Array<Record<string, unknown>> = [];
    for (const it of data.items) {
      const p =  (products as any[]).find((pp: any) => pp.id === it.product_id)!;
      const v = it.variant_id ?  (variants as any[]).find((vv: any) => vv.id === it.variant_id) ?? null : null;
      const originalPrice = Number(v?.price ?? p.price);
      const productPct = p.wholesale_discount_percent != null ? Number(p.wholesale_discount_percent) : DEFAULT_PCT;
      const pct = Math.max(0, Math.min(90, productPct));
      const unit_price = Number((originalPrice * (1 - pct / 100)).toFixed(2));
      const total_price = unit_price * it.quantity;
      subtotal += total_price;
      subtotalOriginal += originalPrice * it.quantity;
      const sizeLabel = v ? [v.size, v.color, v.option_label].filter(Boolean).join(" / ") : null;
      const tag = `Atacado (${pct}% off · etiqueta personalizada grátis)`;
      orderItems.push({
        product_id: p.id,
        variant_id: v?.id ?? null,
        product_name: p.name,
        variant_label: sizeLabel ? `${sizeLabel} · ${tag}` : tag,
        sku: v?.sku ?? null,
        image_url: p.image_url,
        quantity: it.quantity,
        unit_price,
        total_price,
        custom_config: {
          wholesale: true,
          discount_percent: pct,
          original_unit_price: originalPrice,
          category_id: p.category_id,
          size: v?.size ?? null,
        },
        production_days: 10,
      });
    }


    const discount = Number((subtotalOriginal - subtotal).toFixed(2));
    const total = subtotal;

    const { data: order, error } = await supabaseAdmin
      .from("store_orders")
      .insert({
        user_id: context.userId ?? data.user_id ?? null,
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_document: data.customer_document,
        shipping_address: data.shipping_address,
        subtotal,
        shipping_cost: 0,
        discount,
        total,
        notes: data.notes,
        status: "pending_payment",
        payment_status: "pending",
        max_production_days: 10,
        metadata: {
          wholesale: true,
          default_discount_percent: DEFAULT_PCT,
          min_qty_per_subcategory: MIN_QTY,
          label_logo: data.label_logo ?? null,
          subtotal_original: subtotalOriginal,
        },
      })
      .select("*")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Erro ao criar pedido");

    // Notificar admins sobre o novo pedido de ATACADO
    try {
      const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
      await sendPushToAmtAdmins({
        title: "Novo Pedido de Atacado",
        body: `${order.customer_name}: R$ ${order.total.toFixed(2)} (Aguardando pagamento)`,
        url: `/admin/pedidos?id=${order.id}`,
        tag: `order-new-${order.id}`,
      }, "store_order.new");
    } catch (e) {
      console.warn("Falha ao notificar admin sobre novo pedido atacado:", e);
    }

    // Notificar admins sobre o novo pedido de ATACADO
    try {
      const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
      await sendPushToAmtAdmins({
        title: "Novo Pedido de Atacado",
        body: `${order.customer_name}: R$ ${order.total.toFixed(2)} (Aguardando pagamento)`,
        url: `/admin/pedidos?id=${order.id}`,
        tag: `order-new-${order.id}`,
      }, "store_order.new");
    } catch (e) {
      console.warn("Falha ao notificar admin sobre novo pedido atacado:", e);
    }

    const insertPayload = orderItems.map((oi) => ({ ...oi, order_id: order.id })) as never;
    const { error: itemsErr } = await supabaseAdmin.from("store_order_items").insert(insertPayload);
    if (itemsErr) throw new Error(itemsErr.message);

    return { id: order.id, order_number: order.order_number, total: order.total, discount };
  });


export const listStorefrontHome = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();

  // 1) Fetch categories to resolve root -> descendant IDs.
  const { data: allCats } = await sb
    .from("store_categories")
    .select("id, slug, name, parent_id")
    .eq("active", true);
  const cats = allCats ?? [];
  const descendantIds = (rootSlug: string): string[] => {
    const root = cats.find((c) => c.slug === rootSlug);
    if (!root) return [];
    const ids = new Set<string>([root.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of cats) {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
          ids.add(c.id);
          added = true;
        }
      }
    }
    return Array.from(ids);
  };
  const bjjBeltIds = descendantIds("faixas-de-jiu-jitsu");
  const judoBeltIds = descendantIds("faixas-de-judo");
  const kimonoIds = descendantIds("kimonos-de-jiu-jitsu");

  const productSel = "id, name, slug, price, compare_at_price, image_url, category_id";

  const [categories, featured, newest, bjjBelts, judoBelts, kimonos] = await Promise.all([
    sb.from("store_categories").select("id, slug, name, image_url, sort_order").eq("active", true).order("sort_order").limit(12),
    sb.from("store_products" as any).select(productSel).eq("status", "active").limit(200),
    sb.from("store_products" as any).select(productSel).eq("status", "active").order("created_at", { ascending: false }).limit(12),
    bjjBeltIds.length
      ? sb.from("store_products" as any).select(productSel).eq("status", "active").in("category_id", bjjBeltIds).limit(60)
      : Promise.resolve({ data: [] as never[] }),
    judoBeltIds.length
      ? sb.from("store_products" as any).select(productSel).eq("status", "active").in("category_id", judoBeltIds).limit(60)
      : Promise.resolve({ data: [] as never[] }),
    kimonoIds.length
      ? sb.from("store_products" as any).select(productSel).eq("status", "active").in("category_id", kimonoIds).limit(24)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // Daily-seeded shuffle for BJJ belts so the picks rotate once per day.
  const today = new Date();
  const seed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
  const shuffle = <T,>(arr: T[], s: number): T[] => {
    const out = arr.slice();
    let state = s || 1;
    for (let i = out.length - 1; i > 0; i--) {
      state = (state * 1664525 + 1013904223) >>> 0;
      const j = state % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const bjjBeltsDaily = shuffle(bjjBelts.data ?? [], seed).slice(0, 12);
  const featuredDaily = shuffle(featured.data ?? [], seed ^ 0x9e3779b1).slice(0, 12);

  return {
    categories: categories.data ?? [],
    featured: featuredDaily,
    newest: newest.data ?? [],
    bjjBelts: bjjBeltsDaily,
    judoBelts: (judoBelts.data ?? []).slice(0, 12),
    kimonos: (kimonos.data ?? []).slice(0, 12),
  };
});


export const listStoreCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb.from("store_categories").select("id, slug, name, image_url, description, sort_order, parent_id").eq("active", true).order("sort_order");
  const cats = data ?? [];
  if (cats.length === 0) return [] as Array<(typeof cats)[number] & { preview_image: string | null }>;

  // Build descendants map so a top-level category can borrow an image from any child product.
  const childrenByParent = new Map<string, string[]>();
  for (const c of cats) {
    if (!c.parent_id) continue;
    const arr = childrenByParent.get(c.parent_id) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parent_id, arr);
  }
  const collectIds = (rootId: string) => {
    const out: string[] = [];
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      out.push(cur);
      const kids = childrenByParent.get(cur);
      if (kids) stack.push(...kids);
    }
    return out;
  };

  const ids = cats.map((c) => c.id);
  const { data: prods } = await sb
    .from("store_products" as any)
    .select("category_id, image_url, featured, created_at")
    .eq("status", "active")
    .in("category_id", ids)
    .not("image_url", "is", null)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const imageByCat = new Map<string, string>();
  for (const p of (prods as any[]) ?? []) {
    if (!p.category_id || !p.image_url) continue;
    if (!imageByCat.has(p.category_id)) imageByCat.set(p.category_id, p.image_url);
  }

  return cats.map((c) => {
    let preview: string | null = c.image_url ?? null;
    if (!preview) {
      for (const cid of collectIds(c.id)) {
        const img = imageByCat.get(cid);
        if (img) { preview = img; break; }
      }
    }
    return { ...c, preview_image: preview };
  });
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
      .from("store_products" as any)
      .select("id, name, slug, price, compare_at_price, image_url, short_description, category_id")
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
    const { data: product } = await sb.from("store_products" as any).select("*").eq("slug", data.slug).eq("status", "active").maybeSingle();
    if (!product) return { product: null, images: [], variants: [], related: [], category: null };
    const [imagesR, variantsR, categoryR] = await Promise.all([
      sb.from("store_product_images").select("*").eq("product_id", product.id).order("sort_order"),
      sb.from("store_product_variants").select("*").eq("product_id", product.id).eq("active", true).order("sort_order"),
      product.category_id
        ? sb.from("store_categories").select("id, slug, name").eq("id", product.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const { data: related } = product.category_id
      ? await sb.from("store_products" as any).select("id, name, slug, price, compare_at_price, image_url").eq("status", "active").eq("category_id", product.category_id).neq("id", product.id).limit(4)
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

const CheckoutItemSchema = z.union([
  z.object({
    type: z.literal("product").optional(),
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("custom"),
    name: z.string(),
    quantity: z.number().int().min(1),
    unit_price: z.number(),
    image_url: z.string().nullable().optional(),
    production_days: z.number().int().nullable().optional(),
    custom_config: z.record(z.string(), z.any()),
  }),
]);

export const createStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
      shipping_cost: z.number().min(0).optional(),
      shipping_method: z.string().optional().nullable(),
      payment_method: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");


    const productItems = data.items.filter((i) => !("type" in i) || i.type !== "custom") as Array<{
      type?: "product";
      product_id: string;
      variant_id?: string | null;
      quantity: number;
    }>;
    const customItems = data.items.filter((i) => "type" in i && i.type === "custom") as Array<{
      type: "custom";
      name: string;
      quantity: number;
      unit_price: number;
      image_url?: string | null;
      production_days?: number | null;
      custom_config: Record<string, unknown>;
    }>;

    const productIds = [...new Set(productItems.map((i) => i.product_id))];
    const { data: products } = productIds.length
      ? await supabaseAdmin.from("store_products" as any).select("id, name, price, image_url").in("id", productIds)
      : { data: [] };
    const variantIds = productItems.map((i) => i.variant_id).filter(Boolean) as string[];
    const { data: variants } = variantIds.length
      ? await supabaseAdmin.from("store_product_variants").select("*").in("id", variantIds)
      : { data: [] };

    let subtotal = 0;
    const orderItems: Array<Record<string, unknown>> = [];

    for (const it of productItems) {
      const p =  (products as any[]).find((pp: any) => pp.id === it.product_id);
      if (!p) throw new Error(`Produto ${it.product_id} não encontrado`);
      const v = it.variant_id ?  (variants as any[]).find((vv: any) => vv.id === it.variant_id) : null;
      const unit_price = Number(v?.price ?? p.price);
      const total_price = unit_price * it.quantity;
      subtotal += total_price;
      orderItems.push({
        product_id: p.id,
        variant_id: v?.id ?? null,
        product_name: p.name,
        variant_label: v ? [v.size, v.color].filter(Boolean).join(" / ") || v.option_label : null,
        sku: v?.sku ?? null,
        image_url: p.image_url,
        quantity: it.quantity,
        unit_price,
        total_price,
      });
    }

    for (const ci of customItems) {
      const total_price = ci.unit_price * ci.quantity;
      subtotal += total_price;
      orderItems.push({
        product_id: null,
        variant_id: null,
        product_name: ci.name,
        variant_label: "Personalizado",
        sku: null,
        image_url: ci.image_url ?? null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price,
        custom_config: ci.custom_config,
        production_days: ci.production_days ?? null,
      });
    }

    if (orderItems.length === 0) throw new Error("Nenhum item válido");

    const shipping_cost = data.shipping_cost ?? 0;
    const FREE_SHIPPING_THRESHOLD = 399;
    const PIX_DISCOUNT_RATE = 0.05;
    const shipping_discount = subtotal >= FREE_SHIPPING_THRESHOLD ? shipping_cost : 0;
    // Varejo: 5% de desconto à vista no PIX, aplicado sobre os produtos (não sobre o frete).
    const pix_discount =
      data.payment_method === "PIX" ? Math.round(subtotal * PIX_DISCOUNT_RATE * 100) / 100 : 0;
    const total =
      Math.round((subtotal - pix_discount + shipping_cost - shipping_discount) * 100) / 100;

    const { data: order, error } = await supabaseAdmin
      .from("store_orders")
      .insert({
        user_id: context.userId ?? data.user_id ?? null,
        customer_email: data.customer_email,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_document: data.customer_document,
        shipping_address: data.shipping_address,
        shipping_method: data.shipping_method ?? null,
        subtotal,
        shipping_cost,
        discount: shipping_discount + pix_discount,
        total,
        payment_method: data.payment_method ?? null,
        notes: data.notes,
        status: "pending_payment",
        payment_status: "pending",
      })
      .select("*")
      .single();

    if (error || !order) throw new Error(error?.message ?? "Erro ao criar pedido");

    const insertPayload = orderItems.map((oi) => ({ ...oi, order_id: order.id })) as never;
    const { error: itemsErr } = await supabaseAdmin
      .from("store_order_items")
      .insert(insertPayload);
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

export const cancelStoreOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("store_orders").select("id, status, payment_status").eq("id", data.id).maybeSingle();
    if (!order) throw new Error("Pedido não encontrado.");
    const allowed = ["pending_payment", "pending", "failed"];
    if (!allowed.includes(String(order.status ?? "").toLowerCase())) {
      throw new Error("Este pedido não pode mais ser cancelado.");
    }
    const { error } = await supabaseAdmin
      .from("store_orders")
      .update({ status: "cancelled", payment_status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    try {
      const { createOrderNotification, notifyEventFromStatus } = await import("@/lib/store/notifications.server");
      const evt = notifyEventFromStatus("cancelled", "cancelled");
      if (evt) await createOrderNotification(data.id, evt);
    } catch (err) {
      console.error("[notifications] cancel order notify failed", err);
    }
    return { ok: true };
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
    const { data: order, error } = await context.supabase
      .from("store_orders")
      .update(patch)
      .eq("id", data.id)
      .select("id, order_number, status, payment_status, total, customer_name")
      .single();
    if (error) throw new Error(error.message);

    // Notificar admins sobre mudanças importantes no pedido
    if (data.status === "paid" || data.payment_status === "paid") {
      try {
        const { sendPushToAmtAdmins } = await import("@/lib/push/admin-push.server");
        await sendPushToAmtAdmins({
          title: "Pagamento Confirmado",
          body: `Pedido ${order.order_number} (${order.customer_name}): R$ ${order.total.toFixed(2)}`,
          url: `/admin/pedidos?id=${order.id}`,
          tag: `order-paid-${order.id}`,
        }, "store_order.paid");
      } catch (e) {
        console.warn("Falha ao notificar admin sobre pagamento:", e);
      }
    }

    try {
      const { sendWhatsAppOrderStatus, eventFromStatusTransition } = await import("@/lib/store/whatsapp.server");
      const evt = eventFromStatusTransition(data.status, data.payment_status);
      if (evt) await sendWhatsAppOrderStatus(data.id, evt);
    } catch (err) {
      console.error("[whatsapp] status update notify failed", err);
    }
    try {
      const { createOrderNotification, notifyEventFromStatus } = await import("@/lib/store/notifications.server");
      const evt = notifyEventFromStatus(data.status, data.payment_status);
      if (evt) await createOrderNotification(data.id, evt);
    } catch (err) {
      console.error("[notifications] status update notify failed", err);
    }
    return { ok: true };
  });

export const adminDeleteStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const adminListStoreProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("store_products" as any)
      .select("id, name, slug, price, compare_at_price, stock, status, featured, category_id, image_url, updated_at, wholesale_enabled, wholesale_discount_percent, ncm, cfop_internal, cfop_interstate")
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
      ncm: z.string().optional().nullable(),
      cest: z.string().optional().nullable(),
      origem: z.string().optional().nullable(),
      cfop: z.string().optional().nullable(),
      unidade: z.string().optional().nullable(),
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

/**
 * Aplica os dados fiscais (NCM, CEST, Origem, CFOP, Unidade) de uma categoria
 * em todos os produtos vinculados a ela. Sobrescreve o valor em cada produto.
 */
export const adminApplyCategoryFiscalToProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      category_id: z.string().uuid(),
      fields: z.array(z.enum(["ncm", "cest", "origem", "cfop", "unidade"])).min(1),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: cat, error: cErr } = await context.supabase
      .from("store_categories")
      .select("ncm, cest, origem, cfop, unidade")
      .eq("id", data.category_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cat) throw new Error("Categoria não encontrada");
    const patch: {
      ncm?: string | null;
      cest?: string | null;
      origem?: string | null;
      cfop?: string | null;
      unidade?: string | null;
    } = {};
    const catRec = cat as {
      ncm: string | null;
      cest: string | null;
      origem: string | null;
      cfop: string | null;
      unidade: string | null;
    };
    for (const f of data.fields) patch[f] = catRec[f] ?? null;
    const { data: updated, error } = await context.supabase
      .from("store_products" as any)
      .update(patch)
      .eq("category_id", data.category_id)
      .select("id") as any;
    if (error) throw new Error(error.message);
    return { ok: true, updated: updated?.length ?? 0 };
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
        wholesale_enabled: z.boolean().optional(),
        wholesale_discount_percent: z.number().min(0).max(90).nullable().optional(),
        ncm: z.string().optional().nullable(),
        cest: z.string().optional().nullable(),
        origem: z.string().optional().nullable(),
        cfop_internal: z.string().optional().nullable(),
        cfop_interstate: z.string().optional().nullable(),
        unit_commercial: z.string().optional().nullable(),
        unit_taxable: z.string().optional().nullable(),
        unidade: z.string().optional().nullable(),
        gtin: z.string().optional().nullable(),
      }),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_products" as any).update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    // Sincroniza estoque entre todas as variantes ativas quando alterado em massa
    if (typeof data.patch.stock === "number") {
      const { error: vErr } = await context.supabase
        .from("store_product_variants")
        .update({ stock: data.patch.stock })
        .eq("product_id", data.id);
      if (vErr) throw new Error(vErr.message);
    }
    // Sincroniza preço de todas as variantes quando o preço do produto é alterado.
    // Diferenças por variante devem ser editadas individualmente após esta alteração.
    if (typeof data.patch.price === "number") {
      const { error: pErr } = await context.supabase
        .from("store_product_variants")
        .update({ price: data.patch.price })
        .eq("product_id", data.id);
      if (pErr) throw new Error(pErr.message);
    }
    return { ok: true };
  });

export const adminGetStoreProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: product, error } = await context.supabase
      .from("store_products" as any)
      .select("id, name, slug, short_description, description, description_html, price, compare_at_price, stock, status, featured, category_id, image_url, ncm, cest, origem, cfop_internal, cfop_interstate, unit_commercial, unit_taxable, unidade, gtin")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: variants } = await context.supabase
      .from("store_product_variants")
      .select("*")
      .eq("product_id", data.id)
      .order("sort_order");
    return { product, variants: variants ?? [] };
  });

const VariantSchema = z.object({
  id: z.string().uuid().optional(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  option_label: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  compare_at_price: z.number().nullable().optional(),
  stock: z.number().int().default(0),
  weight_grams: z.number().nullable().optional(),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const adminSaveVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      product_id: z.string().uuid(),
      variants: z.array(VariantSchema),
      deleted_ids: z.array(z.string().uuid()).default([]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    if (data.deleted_ids.length > 0) {
      const { error } = await context.supabase
        .from("store_product_variants")
        .delete()
        .in("id", data.deleted_ids);
      if (error) throw new Error(error.message);
    }
    for (const v of data.variants) {
      if (v.id) {
        const { id, ...patch } = v;
        const { error } = await context.supabase
          .from("store_product_variants")
          .update(patch)
          .eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await context.supabase
          .from("store_product_variants")
          .insert({ ...v, product_id: data.product_id });
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const adminListStoreCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_categories")
      .select("id, slug, name, description, image_url, sort_order, active, parent_id, ncm, cest, origem, cfop, unidade")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminDeleteStoreCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
    const { data: created, error } = await context.supabase
      .from("store_products" as any)
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (created as any).id };
  });

export const adminDeleteStoreProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("store_products" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


