import type { ShippingOption } from "@/lib/store/shipping.functions";

const ME_PROD = "https://www.melhorenvio.com.br/api/v2";
const ME_SANDBOX = "https://sandbox.melhorenvio.com.br/api/v2";

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

export type ShippingQuoteItem = {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  /** Preço unitário pago (após atacado/descontos); sem ele, o seguro usa o preço de catálogo. */
  unit_price?: number;
};

/**
 * Cotação do Melhor Envio para o carrinho. Usada pela vitrine (calculateShipping) e de
 * novo pelo servidor ao criar o pedido, para não confiar no preço de frete do navegador.
 * Cada opção leva `cheapest_price`, a mais barata disponível, que define o frete grátis.
 */
export async function quoteShipping(input: { to_zip: string; items: ShippingQuoteItem[] }): Promise<ShippingOption[]> {
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
  const productIds = Array.from(new Set(input.items.map((i) => i.product_id)));
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, price, weight_grams, length_cm, width_cm, height_cm")
    .in("id", productIds);

  const variantIds = input.items.map((i) => i.variant_id).filter((v): v is string => !!v);
  const variantMap = new Map<string, { price: number | null; product_id: string }>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabaseAdmin
      .from("store_product_variants")
      .select("id, price, product_id")
      .in("id", variantIds);
    for (const v of variants ?? []) variantMap.set(v.id, { price: v.price ? Number(v.price) : null, product_id: v.product_id });
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const meProducts = input.items.map((item, idx) => {
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
    to: { postal_code: onlyDigits(input.to_zip) },
    products: meProducts,
  };

  const url = `${String(settings.env) === "sandbox" ? ME_SANDBOX : ME_PROD}/me/shipment/calculate`;
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

  const prices = options.filter((o) => !o.error && o.price > 0).map((o) => o.price);
  const cheapest = prices.length ? Math.min(...prices) : null;
  return options.map((o) => ({ ...o, cheapest_price: cheapest }));
}
