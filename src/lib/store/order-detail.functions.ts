import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Página individual de pedido (admin).
 * Reúne pedido + itens + produtos + cliente + histórico + produção + envio.
 */
export const adminGetOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("store_orders")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado.");

    const { data: items } = await supabaseAdmin
      .from("store_order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    const productIds = Array.from(
      new Set((items ?? []).map((i) => i.product_id).filter(Boolean) as string[]),
    );
    const products = productIds.length
      ? (
          await supabaseAdmin
            .from("products")
            .select("id, name, slug, sku, stock, image_url, weight_grams, length_cm, width_cm, height_cm")
            .in("id", productIds)
        ).data ?? []
      : [];

    const { data: events } = await supabaseAdmin
      .from("store_order_events")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: notifications } = await supabaseAdmin
      .from("order_notifications")
      .select("id, event, title, body, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: production } = await supabaseAdmin
      .from("store_production_jobs")
      .select("id, reference, product_name, variant_label, quantity, status, stage, deadline, updated_at")
      .eq("source_id", order.id);

    // Histórico do cliente (por e-mail)
    let customerOrders: Array<{ id: string; order_number: string; total: number; status: string; created_at: string }> = [];
    if (order.customer_email) {
      const { data: co } = await supabaseAdmin
        .from("store_orders")
        .select("id, order_number, total, status, created_at")
        .eq("customer_email", order.customer_email)
        .order("created_at", { ascending: false })
        .limit(20);
      customerOrders = (co ?? []) as typeof customerOrders;
    }

    return {
      order,
      items: items ?? [],
      products,
      events: events ?? [],
      notifications: notifications ?? [],
      production: production ?? [],
      customerOrders,
    };
  });

export const adminAddOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { logOrderEvent } = await import("@/lib/store/order-events.server");
    await logOrderEvent({
      order_id: data.id,
      event: "note",
      message: data.note,
      actor_user_id: context.userId,
      actor_email: (context.claims?.email as string | undefined) ?? null,
    });
    return { ok: true };
  });

export const adminUpdateOrderFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        notes: z.string().max(4000).optional(),
        shipping_tracking: z.string().max(120).optional(),
        customer_name: z.string().max(160).optional(),
        customer_email: z.string().max(160).optional(),
        customer_phone: z.string().max(60).optional(),
        customer_document: z.string().max(40).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) return { ok: true };
    const { error } = await supabaseAdmin
      .from("store_orders")
      .update({ ...clean, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);

    const { logOrderEvent } = await import("@/lib/store/order-events.server");
    await logOrderEvent({
      order_id: id,
      event: "order_updated",
      message: `Dados do pedido atualizados: ${Object.keys(clean).join(", ")}`,
      metadata: clean as Record<string, unknown>,
      actor_user_id: context.userId,
      actor_email: (context.claims?.email as string | undefined) ?? null,
    });
    return { ok: true };
  });
