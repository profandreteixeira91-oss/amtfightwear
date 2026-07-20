import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStoreProvider, computeWholesalePrice, type StoreProduct } from "./provider";

const UUID = z.string().uuid();

/* ============================================================
   CATÁLOGO
   ============================================================ */
export const dsListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return getStoreProvider(context.supabase).listCategories();
  });

export const dsListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    search: z.string().optional(),
    categorySlug: z.string().optional(),
    featured: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    sort: z.enum(["recent", "price_asc", "price_desc", "name"]).optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    return getStoreProvider(context.supabase).listProducts(data);
  });

export const dsGetProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    return getStoreProvider(context.supabase).getProductBySlug(data.slug);
  });

/* ============================================================
   CONFIGURAÇÕES DE ATACADO
   ============================================================ */
async function getSettings(supabase: any, ownerId: string) {
  const { data } = await supabase.from("dojo_store_settings").select("*").eq("owner_id", ownerId).maybeSingle();
  if (data) return data;
  const { data: created } = await supabase.from("dojo_store_settings").insert({ owner_id: ownerId }).select("*").single();
  return created;
}

export const dsGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getSettings(context.supabase, context.userId));

export const dsUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    wholesale_min_qty_per_product: z.number().int().min(1).max(1000).optional(),
    wholesale_min_order_value: z.number().min(0).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await getSettings(context.supabase, context.userId);
    const { error } = await context.supabase.from("dojo_store_settings").update(data).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
   CARRINHO
   ============================================================ */
async function getOrCreateCart(supabase: any, ownerId: string): Promise<string> {
  const { data } = await supabase.from("dojo_store_carts").select("id").eq("owner_id", ownerId).maybeSingle();
  if (data?.id) return data.id;
  const { data: created, error } = await supabase.from("dojo_store_carts").insert({ owner_id: ownerId }).select("id").single();
  if (error) throw new Error(error.message);
  return created.id;
}

type CartLine = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  customization: any;
  student_id: string | null;
  billable_to_student: boolean;
  product: StoreProduct | null;
  variant_label: string | null;
  variant_price: number | null;
  unit_retail: number;
  unit_wholesale: number;
  is_wholesale: boolean;
  unit_final: number;
  line_total: number;
};

async function computeCart(supabase: any, ownerId: string) {
  const settings = await getSettings(supabase, ownerId);
  const cartId = await getOrCreateCart(supabase, ownerId);
  const { data: items } = await supabase
    .from("dojo_store_cart_items")
    .select("id, product_id, variant_id, quantity, customization, student_id, billable_to_student")
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });
  const rows = items ?? [];
  const productIds = Array.from(new Set(rows.map((r: any) => r.product_id as string))) as string[];
  const products = await getStoreProvider(supabase).getProductsByIds(productIds);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const variantIds = rows.map((r: any) => r.variant_id).filter(Boolean);
  const variantMap = new Map<string, any>();
  if (variantIds.length) {
    const { data: variants } = await supabase.from("store_product_variants").select("id, price, size, color, option_label").in("id", variantIds);
    (variants ?? []).forEach((v: any) => variantMap.set(v.id, v));
  }

  // Somar quantidades por produto (para regra de atacado por produto)
  const qtyByProduct = new Map<string, number>();
  rows.forEach((r: any) => qtyByProduct.set(r.product_id, (qtyByProduct.get(r.product_id) ?? 0) + r.quantity));

  const lines: CartLine[] = rows.map((r: any) => {
    const p = productMap.get(r.product_id) ?? null;
    const v = r.variant_id ? variantMap.get(r.variant_id) : null;
    // Preço sempre igual ao da loja AMT Fight Wear.
    // Regras de atacado/desconto ficam a cargo do dono da loja (loja principal),
    // portanto o Dojo Manager espelha exatamente `products.price` (ou o preço da variante).
    const unitRetail = v?.price != null ? Number(v.price) : (p?.price ?? 0);
    const unitFinal = unitRetail;
    return {
      id: r.id,
      product_id: r.product_id,
      variant_id: r.variant_id,
      quantity: r.quantity,
      customization: r.customization,
      student_id: r.student_id,
      billable_to_student: r.billable_to_student,
      product: p,
      variant_label: v?.option_label ?? [v?.size, v?.color].filter(Boolean).join(" / ") ?? null,
      variant_price: v?.price != null ? Number(v.price) : null,
      unit_retail: unitRetail,
      unit_wholesale: unitRetail,
      is_wholesale: false,
      unit_final: unitFinal,
      line_total: Math.round(unitFinal * r.quantity * 100) / 100,
    };
  });

  const retail_total = Math.round(lines.reduce((s, l) => s + l.unit_retail * l.quantity, 0) * 100) / 100;
  const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const savings = 0;
  const has_wholesale = false;

  return {
    cart_id: cartId,
    settings,
    items: lines,
    retail_total,
    subtotal,
    savings,
    has_wholesale,
  };
}

export const dsGetCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => computeCart(context.supabase, context.userId));

export const dsAddToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    product_id: UUID,
    variant_id: UUID.nullable().optional(),
    quantity: z.number().int().min(1).max(999).default(1),
    customization: z.any().optional(),
    student_id: UUID.nullable().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const cartId = await getOrCreateCart(context.supabase, context.userId);
    // merge por (product_id, variant_id, student_id) quando sem personalização
    if (!data.customization) {
      const { data: existing } = await context.supabase
        .from("dojo_store_cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", data.product_id)
        .is("customization", null)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await context.supabase.from("dojo_store_cart_items")
          .update({ quantity: existing.quantity + data.quantity })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        return { ok: true, id: existing.id };
      }
    }
    const { data: row, error } = await context.supabase.from("dojo_store_cart_items").insert({
      cart_id: cartId,
      owner_id: context.userId,
      product_id: data.product_id,
      variant_id: data.variant_id ?? null,
      quantity: data.quantity,
      customization: data.customization ?? null,
      student_id: data.student_id ?? null,
      billable_to_student: !!data.student_id,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const dsUpdateCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID, quantity: z.number().int().min(1).max(999) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_store_cart_items").update({ quantity: data.quantity }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dsRemoveCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_store_cart_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dsClearCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cartId = await getOrCreateCart(context.supabase, context.userId);
    await context.supabase.from("dojo_store_cart_items").delete().eq("cart_id", cartId);
    return { ok: true };
  });

/* ============================================================
   FAVORITOS
   ============================================================ */
export const dsListFavoriteLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("dojo_store_favorite_lists").select("*").order("name");
    const { data: favs } = await context.supabase.from("dojo_store_favorites").select("*, product:products(id, slug, name, image_url, price)").order("created_at", { ascending: false });
    return { lists: data ?? [], favorites: favs ?? [] };
  });

export const dsCreateFavoriteList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ name: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dojo_store_favorite_lists").insert({ owner_id: context.userId, name: data.name });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dsToggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ product_id: UUID, list_id: UUID.nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const list_id = data.list_id ?? null;
    let query = context.supabase.from("dojo_store_favorites").select("id").eq("product_id", data.product_id);
    query = list_id ? query.eq("list_id", list_id) : query.is("list_id", null);
    const { data: existing } = await query.maybeSingle();
    if (existing?.id) {
      await context.supabase.from("dojo_store_favorites").delete().eq("id", existing.id);
      return { ok: true, favorited: false };
    }
    await context.supabase.from("dojo_store_favorites").insert({ owner_id: context.userId, product_id: data.product_id, list_id });
    return { ok: true, favorited: true };
  });

/* ============================================================
   CHECKOUT & PEDIDOS
   ============================================================ */
export const dsCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    shipping_cost: z.number().min(0).default(0),
    notes: z.string().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const cart = await computeCart(context.supabase, context.userId);
    if (!cart.items.length) throw new Error("Carrinho vazio");

    const total = Math.round((cart.subtotal + (data.shipping_cost ?? 0)) * 100) / 100;
    const orderNumber = `DOJO-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await context.supabase.from("dojo_store_orders").insert({
      owner_id: context.userId,
      order_number: orderNumber,
      subtotal: cart.subtotal,
      retail_total: cart.retail_total,
      wholesale_total: cart.subtotal,
      savings: cart.savings,
      shipping_cost: data.shipping_cost ?? 0,
      total,
      is_wholesale: cart.has_wholesale,
      status: "pending",
      payment_status: "pending",
      metadata: { notes: data.notes ?? null },
    }).select("*").single();
    if (error) throw new Error(error.message);

    const itemsPayload = cart.items.map((l) => ({
      order_id: order.id,
      owner_id: context.userId,
      product_id: l.product_id,
      variant_id: l.variant_id,
      student_id: l.student_id,
      product_name: l.product?.name ?? "Produto",
      variant_label: l.variant_label,
      image_url: l.product?.image_url ?? null,
      quantity: l.quantity,
      unit_retail_price: l.unit_retail,
      unit_price: l.unit_final,
      total_price: l.line_total,
      customization: l.customization,
      billable_to_student: l.billable_to_student,
    }));
    const { error: itemsError } = await context.supabase.from("dojo_store_order_items").insert(itemsPayload);
    if (itemsError) throw new Error(itemsError.message);

    await context.supabase.from("dojo_store_order_timeline").insert({
      owner_id: context.userId,
      order_id: order.id,
      event: "created",
      message: `Pedido ${orderNumber} criado (${cart.items.length} itens).`,
    });

    // Limpa carrinho
    await context.supabase.from("dojo_store_cart_items").delete().eq("cart_id", cart.cart_id);

    return { ok: true, order_id: order.id, order_number: orderNumber };
  });

export const dsListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("dojo_store_orders")
      .select("*, items:dojo_store_order_items(id, product_name, quantity, unit_price, total_price, image_url)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const dsGetOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("dojo_store_orders")
      .select("*, items:dojo_store_order_items(*, student:dojo_students(id, full_name)), timeline:dojo_store_order_timeline(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return order;
  });

export const dsReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ order_id: UUID }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: items } = await context.supabase
      .from("dojo_store_order_items")
      .select("product_id, variant_id, quantity, customization, student_id")
      .eq("order_id", data.order_id);
    const cartId = await getOrCreateCart(context.supabase, context.userId);
    const payload = (items ?? []).filter((it: any) => it.product_id).map((it: any) => ({
      cart_id: cartId,
      owner_id: context.userId,
      product_id: it.product_id,
      variant_id: it.variant_id,
      quantity: it.quantity,
      customization: it.customization,
      student_id: it.student_id,
      billable_to_student: !!it.student_id,
    }));
    if (payload.length) await context.supabase.from("dojo_store_cart_items").insert(payload);
    return { ok: true, added: payload.length };
  });

export const dsAttachToStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    order_item_id: UUID,
    student_ids: z.array(UUID).min(1),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: item } = await context.supabase
      .from("dojo_store_order_items")
      .select("id, product_id, product_name, variant_label, quantity, order_id")
      .eq("id", data.order_item_id)
      .single();
    if (!item) throw new Error("Item não encontrado");
    const payload = data.student_ids.map((sid) => ({
      owner_id: context.userId,
      student_id: sid,
      order_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      variant_label: item.variant_label,
      quantity: 1,
    }));
    const { error } = await context.supabase.from("dojo_store_student_deliveries").insert(payload);
    if (error) throw new Error(error.message);
    await context.supabase.from("dojo_store_order_timeline").insert({
      owner_id: context.userId,
      order_id: item.order_id,
      event: "students_attached",
      message: `Item vinculado a ${data.student_ids.length} aluno(s).`,
    });
    return { ok: true };
  });

/* ============================================================
   DASHBOARD & RECOMENDAÇÕES
   ============================================================ */
export const dsDashboardKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: orders } = await context.supabase
      .from("dojo_store_orders").select("id, status, total, savings, created_at")
      .order("created_at", { ascending: false });
    const list = orders ?? [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = list.filter((o: any) => new Date(o.created_at) >= startOfMonth);
    const kpis = {
      total_orders: list.length,
      in_progress: list.filter((o: any) => ["pending", "paid", "in_production", "shipped"].includes(o.status)).length,
      delivered: list.filter((o: any) => o.status === "delivered").length,
      month_spend: Math.round(monthOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0) * 100) / 100,
      total_savings: Math.round(list.reduce((s: number, o: any) => s + Number(o.savings ?? 0), 0) * 100) / 100,
    };
    // Top products
    const { data: topRaw } = await context.supabase
      .from("dojo_store_order_items")
      .select("product_id, product_name, image_url, quantity");
    const agg = new Map<string, { product_id: string; product_name: string; image_url: string | null; qty: number }>();
    (topRaw ?? []).forEach((r: any) => {
      if (!r.product_id) return;
      const cur = agg.get(r.product_id) ?? { product_id: r.product_id, product_name: r.product_name, image_url: r.image_url, qty: 0 };
      cur.qty += r.quantity;
      agg.set(r.product_id, cur);
    });
    const top_products = Array.from(agg.values()).sort((a, b) => b.qty - a.qty).slice(0, 6);
    const recent = list.slice(0, 5);
    // Featured / novidades do catálogo
    const provider = getStoreProvider(context.supabase);
    const [featured, latest, promos] = await Promise.all([
      provider.listProducts({ featured: true, limit: 6 }),
      provider.listProducts({ sort: "recent", limit: 6 }),
      provider.listProducts({ limit: 100 }),
    ]);
    const promoItems = promos.items.filter((p) => p.compare_at_price && p.compare_at_price > p.price).slice(0, 6);
    return { kpis, top_products, recent_orders: recent, featured: featured.items, latest: latest.items, promos: promoItems };
  });

/* ============================================================
   SINCRONIZAÇÃO
   ============================================================ */
export const dsRunSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: log } = await context.supabase.from("dojo_store_sync_logs").insert({
      owner_id: context.userId, status: "running",
    }).select("*").single();
    try {
      const [{ count: pc }, { count: cc }] = await Promise.all([
        context.supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
        context.supabase.from("store_categories").select("id", { count: "exact", head: true }).eq("active", true),
      ]);
      await context.supabase.from("dojo_store_sync_logs").update({
        finished_at: new Date().toISOString(),
        status: "success",
        products_count: pc ?? 0,
        categories_count: cc ?? 0,
        updated_count: pc ?? 0,
      }).eq("id", log?.id ?? "");
      return { ok: true, products: pc ?? 0, categories: cc ?? 0 };
    } catch (e: any) {
      await context.supabase.from("dojo_store_sync_logs").update({
        finished_at: new Date().toISOString(),
        status: "error",
        error: String(e?.message ?? e),
      }).eq("id", log?.id ?? "");
      throw e;
    }
  });

export const dsListSyncLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("dojo_store_sync_logs")
      .select("*").order("started_at", { ascending: false }).limit(20);
    return data ?? [];
  });
