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
      .select("id, price, weight_grams")
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
      const unitPrice = Number(variant?.price ?? prod?.price ?? 0);
      const weightKg = prod?.weight_grams ? Number(prod.weight_grams) / 1000 : Number(settings.default_weight_kg);
      return {
        id: `${idx}`,
        width: Number(settings.default_width_cm),
        height: Number(settings.default_height_cm),
        length: Number(settings.default_length_cm),
        weight: weightKg > 0 ? weightKg : Number(settings.default_weight_kg),
        insurance_value: unitPrice * item.quantity,
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
