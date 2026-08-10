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
        default_tax_rate: 6,
        default_gateway_fee: 5,
        default_marketing_percent: 8,
        wholesale_min_qty: 10,
        wholesale_discount_percent: 25,
        apportionment_method: "revenue",
        monthly_production_estimate: 500,
        desired_pro_labore: 4000,
        reserve_percent: 4,
        profit_percent: 20,
        commission_percent: 0,
        marketing_percent: 8,
        taxes_percent: 6,
        gateway_percent: 5
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
      metrical_base_length: z.number().optional(), // Novo campo: comprimento base para cálculo proporcional
    }))
  }).parse(data))
  .handler(async ({ data: input, context }) => {
    // 1. Get all products in this category or subcategory
    let productsQuery = (context.supabase as any).from("products").select("id");
    
    if (input.sub_category_id) {
      productsQuery = productsQuery.eq("category_id", input.sub_category_id);
    } else if (input.category) {
      productsQuery = productsQuery.eq("category", input.category);
    } else {
      throw new Error("Category or sub-category is required");
    }

    const { data: products, error: pError } = await productsQuery;

    if (pError) throw pError;
    
    // Se não houver produtos, retornamos sucesso mas com contagem 0
    if (!products || products.length === 0) return { success: true, count: 0 };

    // 2. Clear existing compositions for these products
    const productIds = products.map((p: any) => p.id);
    await (context.supabase as any)
      .from("product_cost_compositions")
      .delete()
      .in("product_id", productIds)
      .eq("tenant_id", context.userId);

    // 3. Insert new compositions for all products
    // Buscamos as variantes para saber o tamanho de cada produto
    const { data: variants } = await (context.supabase as any)
      .from("store_product_variants")
      .select("product_id, size")
      .in("product_id", productIds);

    const newCompositions = productIds.flatMap((pid: string) => {
      // Tenta inferir a metragem com base no tamanho da primeira variante encontrada para este produto
      // Isso é uma simplificação, idealmente cada variante teria seu custo, mas a tabela products.cost é global.
      // Vamos usar a média ou a maior metragem do produto para o custo base.
      const productVariants = variants?.filter((v: any) => v.product_id === pid) || [];
      const referenceSize = productVariants[0]?.size || "Padrão";

      return input.composition.map(c => {
        let finalUnitCost = c.unit_cost;
        
        // Se for um item métrico e tivermos uma base, ajustamos proporcionalmente
        // Aqui assumimos que se o nome contém metragem, aplicamos a lógica.
        // Como não temos a metragem por tamanho no banco ainda, vamos manter o unit_cost
        // mas preparar a estrutura para que edições individuais reflitam a metragem.
        
        return {
          ...c,
          product_id: pid,
          tenant_id: context.userId,
          updated_at: new Date().toISOString()
        };
      });
    });

    const { error: iError } = await (context.supabase as any)
      .from("product_cost_compositions")
      .insert(newCompositions);

    if (iError) throw iError;

    // 4. Update the products base cost as the sum of compositions
    // Calculamos o custo total médio para o produto
    for (const pid of productIds) {
      const productComps = newCompositions.filter((nc: any) => nc.product_id === pid);
      const totalCost = productComps.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unit_cost), 0);
      
      await (context.supabase as any)
        .from("products")
        .update({ cost: totalCost })
        .eq("id", pid);
    }

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
