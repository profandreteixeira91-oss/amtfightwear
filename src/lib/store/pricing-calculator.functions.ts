import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPricingConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("app_pricing_configs")
      .select("*")
      .eq("tenant_id", context.userId)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      return {
        min_net_margin: 15,
        min_contribution_margin: 35,
        default_tax_rate: 8,
        default_gateway_fee: 4,
        default_marketing_percent: 10,
        wholesale_min_qty: 10,
        wholesale_discount_percent: 25,
        apportionment_method: "revenue"
      };
    }
    
    return data;
  });

export const updatePricingConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    min_net_margin: z.number().optional(),
    min_contribution_margin: z.number().optional(),
    default_tax_rate: z.number().optional(),
    default_gateway_fee: z.number().optional(),
    default_marketing_percent: z.number().optional(),
    wholesale_min_qty: z.number().optional(),
    wholesale_discount_percent: z.number().optional(),
    apportionment_method: z.string().optional(),
  }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { data, error } = await (context.supabase as any)
      .from("app_pricing_configs")
      .upsert({
        tenant_id: context.userId,
        ...input,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

export const getFixedExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("fixed_expenses")
      .select("*")
      .eq("tenant_id", context.userId)
      .order("name");

    if (error) throw error;
    return data;
  });

export const saveFixedExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    value: z.number(),
    category: z.string().optional()
  }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { data, error } = await (context.supabase as any)
      .from("fixed_expenses")
      .upsert({
        ...input,
        tenant_id: context.userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

export const deleteFixedExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { error } = await (context.supabase as any)
      .from("fixed_expenses")
      .delete()
      .eq("id", input.id)
      .eq("tenant_id", context.userId);

    if (error) throw error;
    return { success: true };
  });

export const getMarketingInvestments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("marketing_investments")
      .select("*")
      .eq("tenant_id", context.userId)
      .order("channel");

    if (error) throw error;
    return data;
  });

export const saveMarketingInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid().optional(),
    channel: z.string(),
    monthly_investment: z.number(),
    new_customers_goal: z.number().optional()
  }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { data, error } = await (context.supabase as any)
      .from("marketing_investments")
      .upsert({
        ...input,
        tenant_id: context.userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

export const deleteMarketingInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { error } = await (context.supabase as any)
      .from("marketing_investments")
      .delete()
      .eq("id", input.id)
      .eq("tenant_id", context.userId);

    if (error) throw error;
    return { success: true };
  });

export const getCostCompositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ productId: z.string().uuid() }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { data, error } = await (context.supabase as any)
      .from("product_cost_compositions")
      .select("*")
      .eq("product_id", input.productId)
      .eq("tenant_id", context.userId)
      .order("created_at");

    if (error) throw error;
    return data;
  });

export const saveCostComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    unit_of_measure: z.string().optional(),
    quantity: z.number(),
    unit_cost: z.number(),
    waste_percent: z.number().optional(),
    provider: z.string().optional(),
    is_active: z.boolean().optional(),
  }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { data: oldData } = input.id 
      ? await (context.supabase as any).from("product_cost_compositions").select("unit_cost").eq("id", input.id).single()
      : { data: null };

    const { data, error } = await (context.supabase as any)
      .from("product_cost_compositions")
      .upsert({
        ...input,
        tenant_id: context.userId,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    if (oldData && oldData.unit_cost !== input.unit_cost) {
      await (context.supabase as any).from("cost_change_history").insert({
        tenant_id: context.userId,
        composition_id: data.id,
        old_cost: oldData.unit_cost,
        new_cost: input.unit_cost,
        reason: "Manual update",
        changed_by: context.userId
      });
    }

    return data;
  });

export const deleteCostComposition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data: input, context }) => {
    const { error } = await (context.supabase as any)
      .from("product_cost_compositions")
      .delete()
      .eq("id", input.id)
      .eq("tenant_id", context.userId);

    if (error) throw error;
    return { success: true };
  });

export const listAllProductPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("products")
      .select(`
        id,
        name,
        sku,
        category,
        price,
        cost,
        category_id,
        product_cost_compositions (*)
      `)
      .order("name");

    if (error) throw error;
    return data;
  });

export const updateCategoryBOM = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    category: z.string().optional(),
    sub_category_id: z.string().uuid().optional(),
    composition: z.array(z.object({
      name: z.string(),
      type: z.string(),
      unit_of_measure: z.string().optional(),
      quantity: z.number(),
      unit_cost: z.number(),
      waste_percent: z.number().optional(),
      provider: z.string().optional(),
    }))
  }).parse(data))
  .handler(async ({ data: input, context }) => {
    // 1. Get all products in this category or subcategory
    let query = (context.supabase as any).from("products").select("id");
    
    if (input.sub_category_id) {
      query = query.eq("category_id", input.sub_category_id);
    } else if (input.category) {
      query = query.eq("category", input.category);
    } else {
      throw new Error("Category or sub-category is required");
    }

    const { data: products, error: pError } = await query;

    if (pError) throw pError;
    if (!products || products.length === 0) return { success: true, count: 0 };

    // 2. Clear existing compositions for these products
    const productIds = products.map((p: any) => p.id);
    await (context.supabase as any)
      .from("product_cost_compositions")
      .delete()
      .in("product_id", productIds)
      .eq("tenant_id", context.userId);

    // 3. Insert new compositions for all products
    const newCompositions = productIds.flatMap((pid: string) => 
      input.composition.map(c => ({
        ...c,
        product_id: pid,
        tenant_id: context.userId,
        updated_at: new Date().toISOString()
      }))
    );

    const { error: iError } = await (context.supabase as any)
      .from("product_cost_compositions")
      .insert(newCompositions);

    if (iError) throw iError;

    // 4. Update the products base cost as the sum of compositions
    const totalCost = input.composition.reduce((acc, curr) => acc + (curr.quantity * curr.unit_cost), 0);
    await (context.supabase as any)
      .from("products")
      .update({ cost: totalCost })
      .in("id", productIds);

    return { success: true, count: products.length };
  });

export const getStoreCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("store_categories")
      .select("*")
      .order("name");

    if (error) throw error;
    return data;
  });
