import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireStoreOwner } from "@/lib/auth/owner-middleware";
import { productionCost, round2 } from "@/lib/store/product-costs";

/**
 * Custos e formação de preço dos produtos (/admin/produtos/custos).
 *
 * As tabelas de custo (product_cost_compositions, app_pricing_configs, fixed_expenses) têm
 * RLS por usuário, mas os custos são da LOJA, não de quem está logado: depois do
 * requireStoreOwner usamos o client admin para que todo admin da AMT veja e edite a mesma
 * ficha. `tenant_id` só registra quem gravou.
 */

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

const SALES_WINDOW_DAYS = 90;
const PAID_STATUSES = ["paid", "approved"];

export type CostWorkspaceProduct = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  category_id: string | null;
  image_url: string | null;
  status: string;
  price: number;
  cost: number;
  wholesale_enabled: boolean;
  wholesale_discount_percent: number | null;
  percents: {
    taxes: number | null;
    gateway: number | null;
    commission: number | null;
    marketing: number | null;
    reserve: number | null;
    profit: number | null;
  };
  items: {
    name: string;
    type: string;
    quantity: number;
    unit_cost: number;
    waste_percent: number;
    unit_of_measure: string | null;
  }[];
  /**
   * Preços das variações ativas diferentes do preço do produto (preço por tamanho). Essas não
   * mudam ao aplicar um preço novo; as que acompanham o produto mudam junto.
   */
  variant_prices: number[];
  /** Peças pagas nos últimos 90 dias. */
  units_sold: number;
};

export type CostWorkspace = {
  products: CostWorkspaceProduct[];
  categories: { id: string; name: string; parent_id: string | null }[];
  defaults: {
    taxes: number;
    gateway: number;
    commission: number;
    marketing: number;
    reserve: number;
    profit: number;
    wholesale_discount_percent: number;
  };
  fixed_expenses: { id: string; name: string; value: number }[];
  sales: {
    window_days: number;
    /** Faturamento em produtos (sem frete) dos pedidos pagos na janela. */
    revenue: number;
    units: number;
  };
};

const num = (v: unknown, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : num(v));

export const adminGetCostWorkspace = createServerFn({ method: "GET" })
  .middleware([requireStoreOwner])
  .handler(async (): Promise<CostWorkspace> => {
    const sb = await admin();
    const since = new Date(Date.now() - SALES_WINDOW_DAYS * 86_400_000).toISOString();

    const [productsRes, compsRes, cfgRes, fixedRes, variantsRes, ordersRes, catsRes] =
      await Promise.all([
        sb
          .from("products")
          .select(
            "id, name, sku, category, category_id, image_url, status, price, cost, wholesale_enabled, wholesale_discount_percent, pricing_taxes_percent, pricing_gateway_percent, pricing_commission_percent, pricing_marketing_percent, pricing_reserve_percent, pricing_profit_percent",
          )
          .order("name", { ascending: true })
          .limit(2000),
        sb
          .from("product_cost_compositions")
          .select(
            "product_id, name, type, quantity, unit_cost, waste_percent, unit_of_measure, is_active, created_at",
          )
          .order("created_at", { ascending: true })
          .limit(20000),
        sb
          .from("app_pricing_configs")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb.from("fixed_expenses").select("id, name, value").order("name", { ascending: true }),
        sb
          .from("store_product_variants")
          .select("product_id, price, active")
          .not("price", "is", null)
          .limit(20000),
        sb
          .from("store_orders")
          .select("id")
          .in("payment_status", PAID_STATUSES)
          .gte("created_at", since)
          .limit(5000),
        sb.from("store_categories").select("id, name, parent_id, sort_order").order("sort_order"),
      ]);
    for (const r of [productsRes, compsRes, cfgRes, fixedRes, variantsRes, ordersRes, catsRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    // Itens dos pedidos pagos, em lotes (o filtro `in` vai na URL).
    const orderIds = (ordersRes.data ?? []).map((o) => o.id);
    const unitsByProduct = new Map<string, number>();
    let revenue = 0;
    let units = 0;
    for (let i = 0; i < orderIds.length; i += 200) {
      const { data, error } = await sb
        .from("store_order_items")
        .select("product_id, quantity, total_price")
        .in("order_id", orderIds.slice(i, i + 200));
      if (error) throw new Error(error.message);
      for (const it of data ?? []) {
        const q = num(it.quantity);
        revenue += num(it.total_price);
        units += q;
        if (it.product_id)
          unitsByProduct.set(it.product_id, (unitsByProduct.get(it.product_id) ?? 0) + q);
      }
    }

    const itemsByProduct = new Map<string, CostWorkspaceProduct["items"]>();
    for (const c of compsRes.data ?? []) {
      if (!c.product_id || c.is_active === false) continue;
      const list = itemsByProduct.get(c.product_id) ?? [];
      list.push({
        name: c.name,
        type: c.type,
        quantity: num(c.quantity, 1),
        unit_cost: num(c.unit_cost),
        waste_percent: num(c.waste_percent),
        unit_of_measure: c.unit_of_measure ?? null,
      });
      itemsByProduct.set(c.product_id, list);
    }

    const productPrice = new Map((productsRes.data ?? []).map((p) => [p.id, num(p.price)]));
    const variantPrices = new Map<string, number[]>();
    for (const v of variantsRes.data ?? []) {
      if (v.active === false || v.price === null) continue;
      if (Math.abs(num(v.price) - (productPrice.get(v.product_id) ?? NaN)) < 0.005) continue;
      const list = variantPrices.get(v.product_id) ?? [];
      list.push(num(v.price));
      variantPrices.set(v.product_id, list);
    }

    const cfg = cfgRes.data as Record<string, unknown> | null;
    return {
      categories: (catsRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        parent_id: c.parent_id,
      })),
      products: (productsRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        category_id: p.category_id,
        image_url: p.image_url,
        status: p.status,
        price: num(p.price),
        cost: num(p.cost),
        wholesale_enabled: Boolean(p.wholesale_enabled),
        wholesale_discount_percent: numOrNull(p.wholesale_discount_percent),
        percents: {
          taxes: numOrNull(p.pricing_taxes_percent),
          gateway: numOrNull(p.pricing_gateway_percent),
          commission: numOrNull(p.pricing_commission_percent),
          marketing: numOrNull(p.pricing_marketing_percent),
          reserve: numOrNull(p.pricing_reserve_percent),
          profit: numOrNull(p.pricing_profit_percent),
        },
        items: itemsByProduct.get(p.id) ?? [],
        variant_prices: variantPrices.get(p.id) ?? [],
        units_sold: unitsByProduct.get(p.id) ?? 0,
      })),
      defaults: {
        taxes: num(cfg?.default_tax_rate, 8),
        gateway: num(cfg?.default_gateway_fee, 4),
        commission: 0,
        marketing: num(cfg?.default_marketing_percent, 10),
        reserve: 0,
        profit: num(cfg?.min_net_margin, 15),
        wholesale_discount_percent: num(cfg?.wholesale_discount_percent, 25),
      },
      fixed_expenses: (fixedRes.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        value: num(f.value),
      })),
      sales: { window_days: SALES_WINDOW_DAYS, revenue: round2(revenue), units },
    };
  });

const pct = z.number().min(0).max(100);
const pctOrNull = pct.nullable();

const itemsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(120),
      type: z.string().trim().min(1).max(30),
      quantity: z.number().min(0).max(100_000),
      unit_cost: z.number().min(0).max(1_000_000),
      waste_percent: pct,
      unit_of_measure: z.string().trim().max(20).nullable(),
    }),
  )
  .max(100);

const percentsSchema = z.object({
  taxes: pctOrNull,
  gateway: pctOrNull,
  commission: pctOrNull,
  marketing: pctOrNull,
  reserve: pctOrNull,
  profit: pctOrNull,
});

type SheetItems = z.infer<typeof itemsSchema>;
type SheetPercents = z.infer<typeof percentsSchema>;

/**
 * Troca a ficha de custo de um ou mais produtos pela mesma lista de itens e grava o custo
 * total em products.cost. `percents` undefined mantém os percentuais de cada produto.
 * A ficha nova é gravada antes de apagar a antiga: uma falha no meio não deixa produto sem custo.
 */
async function replaceCostSheets(
  productIds: string[],
  items: SheetItems,
  percents: SheetPercents | undefined,
  userId: string,
) {
  const sb = await admin();
  const { data: existing, error: exErr } = await sb
    .from("product_cost_compositions")
    .select("id")
    .in("product_id", productIds);
  if (exErr) throw new Error(exErr.message);

  if (items.length > 0) {
    const now = new Date().toISOString();
    const rows = productIds.flatMap((product_id) =>
      items.map((it) => ({
        ...it,
        product_id,
        tenant_id: userId,
        is_active: true,
        updated_at: now,
      })),
    );
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from("product_cost_compositions").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
  }
  const oldIds = (existing ?? []).map((r) => r.id);
  for (let i = 0; i < oldIds.length; i += 200) {
    const { error } = await sb
      .from("product_cost_compositions")
      .delete()
      .in("id", oldIds.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }

  const cost = round2(productionCost(items));
  const patch = {
    cost,
    ...(percents
      ? {
          pricing_taxes_percent: percents.taxes,
          pricing_gateway_percent: percents.gateway,
          pricing_commission_percent: percents.commission,
          pricing_marketing_percent: percents.marketing,
          pricing_reserve_percent: percents.reserve,
          pricing_profit_percent: percents.profit,
        }
      : {}),
  };
  for (let i = 0; i < productIds.length; i += 200) {
    const { error } = await sb
      .from("products")
      .update(patch)
      .in("id", productIds.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  return { cost };
}

export const adminSaveProductCosts = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({ product_id: z.string().uuid(), items: itemsSchema, percents: percentsSchema })
      .parse(i),
  )
  .handler(async ({ data, context }) =>
    replaceCostSheets([data.product_id], data.items, data.percents, context.userId),
  );

/** Aplica a mesma ficha de custo (e, se enviados, os percentuais) a vários produtos de uma vez. */
export const adminApplyCategoryCosts = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        product_ids: z.array(z.string().uuid()).min(1).max(1000),
        items: itemsSchema.min(1),
        percents: percentsSchema.optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const res = await replaceCostSheets(
      data.product_ids,
      data.items,
      data.percents,
      context.userId,
    );
    return { ...res, count: data.product_ids.length };
  });

export const adminSavePricingDefaults = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z.object({ taxes: pct, gateway: pct, marketing: pct, profit: pct }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await admin();
    const patch = {
      default_tax_rate: data.taxes,
      default_gateway_fee: data.gateway,
      default_marketing_percent: data.marketing,
      min_net_margin: data.profit,
      updated_at: new Date().toISOString(),
    };
    const { data: current, error: curErr } = await sb
      .from("app_pricing_configs")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);

    const { error } = current
      ? await sb.from("app_pricing_configs").update(patch).eq("id", current.id)
      : await sb.from("app_pricing_configs").insert({ ...patch, tenant_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveFixedExpenses = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              id: z.string().uuid().optional(),
              name: z.string().trim().min(1).max(120),
              value: z.number().min(0).max(10_000_000),
            }),
          )
          .max(200),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = await admin();
    const now = new Date().toISOString();

    const { data: existing, error: exErr } = await sb.from("fixed_expenses").select("id");
    if (exErr) throw new Error(exErr.message);
    const keep = new Set(data.items.map((it) => it.id).filter(Boolean));

    for (const it of data.items) {
      const { error } = it.id
        ? await sb
            .from("fixed_expenses")
            .update({ name: it.name, value: it.value, updated_at: now })
            .eq("id", it.id)
        : await sb
            .from("fixed_expenses")
            .insert({ name: it.name, value: it.value, tenant_id: context.userId, updated_at: now });
      if (error) throw new Error(error.message);
    }
    const removed = (existing ?? []).map((r) => r.id).filter((id) => !keep.has(id));
    if (removed.length > 0) {
      const { error } = await sb.from("fixed_expenses").delete().in("id", removed);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/**
 * Troca o preço de venda de um ou mais produtos na loja. As variações que acompanhavam o preço
 * do produto mudam junto (é o preço que o cliente paga); as de preço por tamanho ficam.
 */
export const adminApplyProductPrices = createServerFn({ method: "POST" })
  .middleware([requireStoreOwner])
  .validator((i: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({ product_id: z.string().uuid(), price: z.number().min(0.01).max(1_000_000) }),
          )
          .min(1)
          .max(1000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { setProductPrice } = await import("@/lib/store/product-price.server");
    let updated = 0;
    let ownPriced = 0;
    for (const it of data.items) {
      const r = await setProductPrice(sb, it.product_id, it.price);
      updated++;
      ownPriced += r.ownPriced;
    }
    return { updated, ownPriced };
  });
