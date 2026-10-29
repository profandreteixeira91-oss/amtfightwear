import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ME_PROD = "https://www.melhorenvio.com.br/api/v2";
const ME_SANDBOX = "https://sandbox.melhorenvio.com.br/api/v2";

function baseUrl(env: string) {
  return env === "sandbox" ? ME_SANDBOX : ME_PROD;
}

function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

/* --------------------- Settings --------------------- */

export const getShippingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_shipping_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const SettingsInput = z.object({
  env: z.enum(["sandbox", "production"]),
  origin_zip: z.string().min(8),
  default_weight_kg: z.number().positive(),
  default_length_cm: z.number().int().positive(),
  default_width_cm: z.number().int().positive(),
  default_height_cm: z.number().int().positive(),
  default_insurance_value: z.number().min(0),
  sender_address_id: z.number().int().positive().nullable().optional(),
});

export const updateShippingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof SettingsInput>) => SettingsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const patch = { ...data, origin_zip: onlyDigits(data.origin_zip) };
    if (!/^\d{8}$/.test(patch.origin_zip)) throw new Error("Informe um CEP de origem válido.");
    if (data.sender_address_id) {
      const { meRequest } = await import("./shipping-admin.server");
      const { SenderAddressesSchema } = await import("./shipping-sender");
      const address = SenderAddressesSchema.parse(await meRequest("/me/addresses", data.env)).find((a) => a.id === data.sender_address_id);
      if (!address) throw new Error("Endereço de remetente não encontrado no Melhor Envio.");
      patch.origin_zip = onlyDigits(address.postal_code);
    }
    const { data: updated, error } = await context.supabase
      .from("store_shipping_settings")
      .update(patch)
      .eq("singleton", true)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

/* --------------------- Cotação pública --------------------- */

const QuoteInput = z.object({
  to_zip: z.string().min(8),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      variant_id: z.string().uuid().nullable().optional(),
      quantity: z.number().int().positive(),
      // Preço unitário efetivamente pago pelo cliente (após atacado/descontos).
      // Quando informado, o seguro do Melhor Envio será exatamente igual ao
      // valor da compra sem o frete. Caso ausente, usamos o preço do catálogo.
      unit_price: z.number().nonnegative().optional(),
    }),
  ).min(1),
});


export type ShippingOption = {
  id: number;
  name: string;
  company: string;
  company_picture: string | null;
  price: number;
  delivery_time: number | null;
  delivery_range: { min: number | null; max: number | null } | null;
  error: string | null;
};

export const calculateShipping = createServerFn({ method: "POST" })
  .inputValidator((i: z.infer<typeof QuoteInput>) => QuoteInput.parse(i))
  .handler(async ({ data }): Promise<{ options: ShippingOption[] }> => {
    const token = process.env.MELHOR_ENVIO_TOKEN;
    const userAgent = process.env.MELHOR_ENVIO_USER_AGENT ?? "AMT Fight Wear";
    if (!token) throw new Error("MELHOR_ENVIO_TOKEN não configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("store_shipping_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (!settings) throw new Error("Configuração de envio não encontrada");

    // Load products/variants for weight/price
    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)));
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, price, weight_grams, length_cm, width_cm, height_cm")
      .in("id", productIds);

    const variantIds = data.items.map((i) => i.variant_id).filter((v): v is string => !!v);
    const variantMap = new Map<string, { price: number | null; product_id: string }>();
    if (variantIds.length > 0) {
      const { data: variants } = await supabaseAdmin
        .from("store_product_variants")
        .select("id, price, product_id")
        .in("id", variantIds);
      for (const v of variants ?? []) variantMap.set(v.id, { price: v.price ? Number(v.price) : null, product_id: v.product_id });
    }

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

    const meProducts = data.items.map((item, idx) => {
      const prod = productMap.get(item.product_id);
      const variant = item.variant_id ? variantMap.get(item.variant_id) : null;
      const catalogPrice = Number(variant?.price ?? prod?.price ?? 0);
      // O seguro precisa refletir o valor da compra sem o frete. Quando o
      // cliente enviar o preço unitário pago (após atacado/descontos), usamos
      // exatamente esse valor; caso contrário, caímos no preço de catálogo.
      const unitPrice = item.unit_price != null ? Number(item.unit_price) : catalogPrice;
      const weightKg = prod?.weight_grams ? Number(prod.weight_grams) / 1000 : Number(settings.default_weight_kg);
      const dim = (v: unknown, fallback: unknown) => (v != null && Number(v) > 0 ? Number(v) : Number(fallback));
      return {
        id: `${idx}`,
        width: dim(prod?.width_cm, settings.default_width_cm),
        height: dim(prod?.height_cm, settings.default_height_cm),
        length: dim(prod?.length_cm, settings.default_length_cm),
        weight: weightKg > 0 ? weightKg : Number(settings.default_weight_kg),
        insurance_value: Number((unitPrice * item.quantity).toFixed(2)),
        quantity: item.quantity,
      };
    });


    const body = {
      from: { postal_code: onlyDigits(String(settings.origin_zip)) },
      to: { postal_code: onlyDigits(data.to_zip) },
      products: meProducts,
    };

    const url = `${baseUrl(String(settings.env))}/me/shipment/calculate`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Melhor Envio [${res.status}]: ${txt.slice(0, 300)}`);
    }

    const raw = (await res.json()) as Array<{
      id: number;
      name: string;
      price?: string | number;
      custom_price?: string | number;
      delivery_time?: number;
      delivery_range?: { min?: number; max?: number };
      company?: { name?: string; picture?: string };
      error?: string;
    }>;

    const options: ShippingOption[] = raw.map((r) => ({
      id: r.id,
      name: r.name,
      company: r.company?.name ?? "",
      company_picture: r.company?.picture ?? null,
      price: r.error ? 0 : Number(r.custom_price ?? r.price ?? 0),
      delivery_time: r.delivery_time ?? null,
      delivery_range: r.delivery_range
        ? { min: r.delivery_range.min ?? null, max: r.delivery_range.max ?? null }
        : null,
      error: r.error ?? null,
    }));

    return { options };
  });

/* --------------------- Melhor Envio: operações admin --------------------- */

async function meFetch(path: string, init: RequestInit = {}, env = "production") {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT ?? "AMT Fight Wear (contato@amtfightwear.com.br)";
  if (!token) throw new Error("MELHOR_ENVIO_TOKEN não configurado");
  const url = `${baseUrl(env)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": userAgent,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const msg = typeof json === "object" && json && "message" in json ? String((json as { message?: unknown }).message) : text.slice(0, 400);
    throw new Error(`Melhor Envio [${res.status}]: ${msg}`);
  }
  return json;
}

async function loadMeEnv() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("store_shipping_settings").select("env").eq("singleton", true).maybeSingle();
  return String(data?.env ?? "production");
}

export const adminMelhorEnvioBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const env = await loadMeEnv();
    const me = (await meFetch("/me", { method: "GET" }, env)) as { id?: number; name?: string; email?: string; firstname?: string; lastname?: string } | null;
    const balance = (await meFetch("/me/balance", { method: "GET" }, env)) as { balance?: number } | null;
    return {
      name: me?.name ?? [me?.firstname, me?.lastname].filter(Boolean).join(" ") ?? null,
      email: me?.email ?? null,
      balance: Number(balance?.balance ?? 0),
    };
  });

const OrderIdInput = z.object({ order_id: z.string().uuid() });

/**
 * Cota o envio para um pedido existente usando o CEP salvo em shipping_address.
 */
export const adminMelhorEnvioQuoteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof OrderIdInput>) => OrderIdInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = await loadMeEnv();
    const { data: order } = await supabaseAdmin.from("store_orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    const { data: settings } = await supabaseAdmin.from("store_shipping_settings").select("*").eq("singleton", true).maybeSingle();
    if (!settings) throw new Error("Configuração de envio ausente");

    const { data: items } = await supabaseAdmin.from("store_order_items").select("*").eq("order_id", data.order_id);
    if (!items || items.length === 0) throw new Error("Pedido sem itens");

    const productIds = Array.from(new Set(items.map((i) => i.product_id).filter((x): x is string => !!x)));
    const productMap = new Map<string, { price: number | null; weight_grams: number | null; length_cm: number | null; width_cm: number | null; height_cm: number | null }>();
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin.from("products").select("id, price, weight_grams, length_cm, width_cm, height_cm").in("id", productIds);
      for (const p of products ?? [])
        productMap.set(p.id, {
          price: p.price ? Number(p.price) : null,
          weight_grams: p.weight_grams ?? null,
          length_cm: p.length_cm != null ? Number(p.length_cm) : null,
          width_cm: p.width_cm != null ? Number(p.width_cm) : null,
          height_cm: p.height_cm != null ? Number(p.height_cm) : null,
        });
    }

    const shipping = order.shipping_address as Record<string, unknown>;
    const toZip = onlyDigits(String(shipping.zip ?? shipping.postal_code ?? shipping.cep ?? ""));
    if (!toZip) throw new Error("Pedido sem CEP de destino");

    const meProducts = items.map((it, idx) => {
      const prod = it.product_id ? productMap.get(it.product_id) : null;
      const weightKg = prod?.weight_grams ? Number(prod.weight_grams) / 1000 : Number(settings.default_weight_kg);
      const dim = (v: number | null | undefined, fallback: unknown) => (v != null && v > 0 ? v : Number(fallback));
      return {
        id: `${idx}`,
        width: dim(prod?.width_cm, settings.default_width_cm),
        height: dim(prod?.height_cm, settings.default_height_cm),
        length: dim(prod?.length_cm, settings.default_length_cm),
        weight: weightKg > 0 ? weightKg : Number(settings.default_weight_kg),
        insurance_value: Number(it.unit_price) * it.quantity,
        quantity: it.quantity,
      };
    });

    const raw = (await meFetch(
      "/me/shipment/calculate",
      {
        method: "POST",
        body: JSON.stringify({
          from: { postal_code: onlyDigits(String(settings.origin_zip)) },
          to: { postal_code: toZip },
          products: meProducts,
        }),
      },
      env,
    )) as Array<{
      id: number;
      name: string;
      price?: string | number;
      custom_price?: string | number;
      delivery_time?: number;
      company?: { name?: string; picture?: string };
      error?: string;
    }>;

    return raw.map((r) => ({
      id: r.id,
      name: r.name,
      company: r.company?.name ?? "",
      picture: r.company?.picture ?? null,
      price: r.error ? 0 : Number(r.custom_price ?? r.price ?? 0),
      delivery_time: r.delivery_time ?? null,
      error: r.error ?? null,
    }));
  });

const AddToCartInput = z.object({
  order_id: z.string().uuid(),
  service_id: z.number().int().positive(),
  service_name: z.string().optional(),
  agency_id: z.number().int().positive().optional(),
});

/**
 * Adiciona o pedido ao carrinho do Melhor Envio (POST /me/cart).
 * Retorna o cart_id, salvo no pedido para permitir checkout/geração de etiqueta.
 */
export const adminMelhorEnvioAddToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof AddToCartInput>) => AddToCartInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { loadShippingOrders, addShippingToCart } = await import("./shipping-admin.server");
    const [order] = await loadShippingOrders([data.order_id]);
    if (!order) throw new Error("Pedido não encontrado.");
    return addShippingToCart(order, data);
  });

const CartIdsInput = z.object({ order_ids: z.array(z.string().uuid()).min(1) });

/**
 * Faz checkout dos itens no carrinho do Melhor Envio (paga com saldo da conta).
 */
export const adminMelhorEnvioCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof CartIdsInput>) => CartIdsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { loadShippingOrders, checkoutShipping } = await import("./shipping-admin.server");
    for (const order of await loadShippingOrders(data.order_ids)) await checkoutShipping(order);
    return { ok: true };
  });

/**
 * Gera as etiquetas (imprimir).
 */
export const adminMelhorEnvioGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof CartIdsInput>) => CartIdsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { loadShippingOrders, printShipping } = await import("./shipping-admin.server");
    return { url: await printShipping(await loadShippingOrders(data.order_ids)) };
  });

/**
 * Consulta o rastreio dos pedidos no Melhor Envio e atualiza a base local.
 */
export const adminMelhorEnvioSyncTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof CartIdsInput>) => CartIdsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { loadShippingOrders, loadShippingSettings, shipmentStatus, saveShippingOrder, meRequest, releaseShipping } = await import("./shipping-admin.server");
    const { z } = await import("zod");
    const settings = await loadShippingSettings();
    let updated = 0;
    for (const order of await loadShippingOrders(data.order_ids)) {
      if (!order.melhor_envio_cart_id && !order.melhor_envio_order_id) continue;
      const current = await shipmentStatus(order, settings.env);
      const tracking = z.record(z.string(), z.object({ tracking: z.string().nullish(), melhorenvio_tracking: z.string().nullish() })).parse(await meRequest("/me/shipment/tracking", order.melhor_envio_env || settings.env, { orders: [current.id] }));
      const row = tracking[current.id];
      const code = row?.tracking || row?.melhorenvio_tracking;
      await saveShippingOrder(order.id, { melhor_envio_status: current.status, melhor_envio_order_id: current.id, melhor_envio_synced_at: new Date().toISOString(), ...(code ? { shipping_tracking: code } : {}), ...(current.status === "posted" ? { status: "shipped" } : {}), ...(current.status === "delivered" ? { status: "delivered" } : {}) });
      if (order.melhor_envio_operation_id && ["paid", "released", "generated", "posted", "delivered"].includes(current.status)) await releaseShipping(order.id, order.melhor_envio_operation_id);
      updated += 1;
    }
    return { updated };
  });

export const adminMelhorEnvioSenderOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { senderOptions } = await import("./shipping-admin.server");
    return senderOptions();
  });

export const adminMelhorEnvioPrepare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ order_id: z.string().uuid(), service_id: z.number().int().positive() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { loadShippingOrders, prepareShipping } = await import("./shipping-admin.server");
    const [order] = await loadShippingOrders([data.order_id]);
    if (!order) throw new Error("Pedido não encontrado.");
    return prepareShipping(order, data.service_id);
  });

export const adminMelhorEnvioSaveRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(async (input: unknown) => {
    const { RecipientSchema } = await import("./shipping-preflight");
    return z.object({ order_id: z.string().uuid(), recipient: RecipientSchema }).parse(input);
  })
  .handler(async ({ data, context }) => {
    const { assertSaasOwner } = await import("@/lib/auth/is-saas-owner");
    await assertSaasOwner(context);
    const { loadShippingOrders, saveShippingOrder } = await import("./shipping-admin.server");
    const { recipientIssues } = await import("./shipping-preflight");
    const issues = recipientIssues(data.recipient);
    if (issues.length) throw new Error(`Corrija os campos: ${issues.join(", ")}.`);
    const [order] = await loadShippingOrders([data.order_id]);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.melhor_envio_cart_id || order.melhor_envio_order_id || order.melhor_envio_operation_id) throw new Error("Não é possível alterar o destinatário após iniciar a contratação.");
    const { recipient: r } = data;
    const previous = z.record(z.string(), z.unknown()).safeParse(order.shipping_address);
    await saveShippingOrder(order.id, { customer_name: r.name, customer_email: r.email, customer_phone: r.phone.replace(/\D/g, ""), customer_document: r.document.replace(/\D/g, ""), shipping_address: { ...(previous.success ? previous.data : {}), street: r.address, number: r.number, complement: r.complement, neighborhood: r.district, city: r.city, zip: r.postal_code.replace(/\D/g, ""), state: r.state_abbr } });
    return { ok: true };
  });
