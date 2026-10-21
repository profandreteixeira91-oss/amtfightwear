import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildShippingSender, shippingDocument } from "@/lib/store/shipping-sender";

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
});

export const updateShippingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof SettingsInput>) => SettingsInput.parse(i))
  .handler(async ({ data, context }) => {
    const patch = { ...data, origin_zip: onlyDigits(data.origin_zip) };
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
  .handler(async () => {
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
  .handler(async ({ data }) => {
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
  agency_id: z.number().int().optional(),
});

/**
 * Adiciona o pedido ao carrinho do Melhor Envio (POST /me/cart).
 * Retorna o cart_id, salvo no pedido para permitir checkout/geração de etiqueta.
 */
export const adminMelhorEnvioAddToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof AddToCartInput>) => AddToCartInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = await loadMeEnv();
    const { data: order } = await supabaseAdmin.from("store_orders").select("*").eq("id", data.order_id).maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    const { data: settings } = await supabaseAdmin.from("store_shipping_settings").select("*").eq("singleton", true).maybeSingle();
    if (!settings) throw new Error("Configuração de envio ausente");
    const { data: items } = await supabaseAdmin.from("store_order_items").select("*").eq("order_id", data.order_id);
    if (!items || items.length === 0) throw new Error("Pedido sem itens");

    const productIds = Array.from(new Set(items.map((i) => i.product_id).filter((x): x is string => !!x)));
    const productMap = new Map<string, { weight_grams: number | null }>();
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin.from("products").select("id, weight_grams").in("id", productIds);
      for (const p of products ?? []) productMap.set(p.id, { weight_grams: p.weight_grams ?? null });
    }

    const shipping = order.shipping_address as Record<string, string | undefined>;
    const totalWeight = items.reduce((sum, it) => {
      const prod = it.product_id ? productMap.get(it.product_id) : null;
      const w = prod?.weight_grams ? Number(prod.weight_grams) / 1000 : Number(settings.default_weight_kg);
      return sum + (w > 0 ? w : Number(settings.default_weight_kg)) * it.quantity;
    }, 0);
    const insurance = items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);

    // Resolve identity and origin only from the connected account; never
    // substitute the customer's address or a fabricated CPF for the sender.
    const [profile, registeredAddresses] = await Promise.all([
      meFetch("/me", { method: "GET" }, env),
      meFetch("/me/addresses", { method: "GET" }, env),
    ]);
    const addressPage = z.object({ data: z.array(z.unknown()) }).safeParse(registeredAddresses);
    const from = buildShippingSender(profile, addressPage.success ? addressPage.data.data : [], String(settings.origin_zip));
    const recipientDocument = shippingDocument(order.customer_document ?? "");

    const meBody: Record<string, unknown> = {
      service: data.service_id,
      agency: data.agency_id,
      from,
      to: {
        name: order.customer_name,
        phone: order.customer_phone ?? "",
        email: order.customer_email,
        ...recipientDocument,
        address: shipping.address ?? shipping.street ?? "",
        complement: shipping.complement ?? "",
        number: shipping.number ?? "S/N",
        district: shipping.district ?? shipping.neighborhood ?? "",
        city: shipping.city ?? "",
        country_id: "BR",
        postal_code: onlyDigits(String(shipping.zip ?? shipping.postal_code ?? shipping.cep ?? "")),
        state_abbr: shipping.state ?? shipping.uf ?? "",
      },
      products: items.map((it) => ({
        name: it.product_name.slice(0, 60),
        quantity: it.quantity,
        unitary_value: Number(it.unit_price),
      })),
      volumes: [
        {
          height: Number(settings.default_height_cm),
          width: Number(settings.default_width_cm),
          length: Number(settings.default_length_cm),
          weight: Math.max(0.1, Number(totalWeight.toFixed(3))),
        },
      ],
      options: {
        insurance_value: Number(insurance.toFixed(2)),
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        invoice: { key: "" },
        platform: "AMT Growth Engine",
        tags: [{ tag: order.order_number, url: null }],
      },
    };

    const cartResp = (await meFetch("/me/cart", { method: "POST", body: JSON.stringify(meBody) }, env)) as {
      id?: string;
      protocol?: string;
    };
    if (!cartResp?.id) throw new Error("Resposta inesperada ao criar item no carrinho");

    await supabaseAdmin
      .from("store_orders")
      .update({
        melhor_envio_cart_id: cartResp.id,
        melhor_envio_service_id: data.service_id,
        melhor_envio_service_name: data.service_name ?? null,
        melhor_envio_status: "in_cart",
        melhor_envio_protocol: cartResp.protocol ?? null,
        shipping_method: data.service_name ?? String(data.service_id),
      })
      .eq("id", data.order_id);

    const { logOrderEvent } = await import("@/lib/store/order-events.server");
    await logOrderEvent({
      order_id: data.order_id,
      event: "shipping_in_cart",
      message: `Envio adicionado ao carrinho Melhor Envio (${data.service_name ?? data.service_id})`,
      metadata: { cart_id: cartResp.id, service_id: data.service_id },
    });

    return { cart_id: cartResp.id, protocol: cartResp.protocol ?? null };
  });

const CartIdsInput = z.object({ order_ids: z.array(z.string().uuid()).min(1) });

/**
 * Faz checkout dos itens no carrinho do Melhor Envio (paga com saldo da conta).
 */
export const adminMelhorEnvioCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof CartIdsInput>) => CartIdsInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = await loadMeEnv();
    const { data: orders } = await supabaseAdmin
      .from("store_orders")
      .select("id, melhor_envio_cart_id")
      .in("id", data.order_ids);
    const cartIds = (orders ?? []).map((o) => o.melhor_envio_cart_id).filter((x): x is string => !!x);
    if (cartIds.length === 0) throw new Error("Pedidos selecionados não têm item no carrinho do Melhor Envio");

    const resp = (await meFetch(
      "/me/shipment/checkout",
      { method: "POST", body: JSON.stringify({ orders: cartIds }) },
      env,
    )) as { purchase?: { id?: string; orders?: Array<{ id: string; protocol?: string }> } } | Record<string, unknown>;

    for (const o of orders ?? []) {
      if (!o.melhor_envio_cart_id) continue;
      await supabaseAdmin
        .from("store_orders")
        .update({ melhor_envio_status: "paid", melhor_envio_order_id: o.melhor_envio_cart_id })
        .eq("id", o.id);
    }
    const { logOrderEvent } = await import("@/lib/store/order-events.server");
    for (const o of orders ?? []) {
      if (!o.melhor_envio_cart_id) continue;
      await logOrderEvent({ order_id: o.id, event: "shipping_paid", message: "Etiqueta comprada no Melhor Envio" });
    }
    return { ok: true, response: resp };
  });

/**
 * Gera as etiquetas (imprimir).
 */
export const adminMelhorEnvioGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof CartIdsInput>) => CartIdsInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = await loadMeEnv();
    const { data: orders } = await supabaseAdmin
      .from("store_orders")
      .select("id, melhor_envio_cart_id, melhor_envio_order_id")
      .in("id", data.order_ids);
    const meIds = (orders ?? []).map((o) => o.melhor_envio_order_id ?? o.melhor_envio_cart_id).filter((x): x is string => !!x);
    if (meIds.length === 0) throw new Error("Pedidos sem envio no Melhor Envio");

    await meFetch("/me/shipment/generate", { method: "POST", body: JSON.stringify({ orders: meIds }) }, env);
    const printResp = (await meFetch(
      "/me/shipment/print",
      { method: "POST", body: JSON.stringify({ mode: "public", orders: meIds }) },
      env,
    )) as { url?: string };

    for (const o of orders ?? []) {
      await supabaseAdmin
        .from("store_orders")
        .update({ melhor_envio_label_url: printResp?.url ?? null, melhor_envio_status: "generated", status: "preparing" })
        .eq("id", o.id);
    }
    const { logOrderEvent } = await import("@/lib/store/order-events.server");
    for (const o of orders ?? []) {
      await logOrderEvent({
        order_id: o.id,
        event: "shipping_label",
        message: "Etiqueta gerada",
        metadata: { url: printResp?.url ?? null },
      });
    }
    return { url: printResp?.url ?? null };
  });

/**
 * Consulta o rastreio dos pedidos no Melhor Envio e atualiza a base local.
 */
export const adminMelhorEnvioSyncTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof CartIdsInput>) => CartIdsInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const env = await loadMeEnv();
    const { data: orders } = await supabaseAdmin
      .from("store_orders")
      .select("id, melhor_envio_cart_id, melhor_envio_order_id")
      .in("id", data.order_ids);
    const meIds = (orders ?? []).map((o) => o.melhor_envio_order_id ?? o.melhor_envio_cart_id).filter((x): x is string => !!x);
    if (meIds.length === 0) return { updated: 0 };

    const resp = (await meFetch(
      "/me/shipment/tracking",
      { method: "POST", body: JSON.stringify({ orders: meIds }) },
      env,
    )) as Record<string, { status?: string; tracking?: string; melhorenvio_tracking?: string }>;

    let updated = 0;
    for (const o of orders ?? []) {
      const meId = o.melhor_envio_order_id ?? o.melhor_envio_cart_id;
      if (!meId) continue;
      const row = resp?.[meId];
      if (!row) continue;
      const tracking = row.tracking ?? row.melhorenvio_tracking ?? null;
      const patch: {
        melhor_envio_status: string | null;
        melhor_envio_data: { status?: string; tracking?: string; melhorenvio_tracking?: string };
        melhor_envio_synced_at: string;
        shipping_tracking?: string;
        status?: string;
      } = {
        melhor_envio_status: row.status ?? null,
        melhor_envio_data: row,
        melhor_envio_synced_at: new Date().toISOString(),
      };
      if (tracking) patch.shipping_tracking = tracking;
      if (row.status === "posted") patch.status = "shipped";
      if (row.status === "delivered") patch.status = "delivered";
      await supabaseAdmin.from("store_orders").update(patch).eq("id", o.id);
      const { logOrderEvent } = await import("@/lib/store/order-events.server");
      await logOrderEvent({
        order_id: o.id,
        event: "shipping_tracking",
        message: `Rastreio sincronizado: ${row.status ?? "sem status"}${tracking ? ` · ${tracking}` : ""}`,
        metadata: row as Record<string, unknown>,
      });
      updated += 1;
    }
    return { updated };
  });
