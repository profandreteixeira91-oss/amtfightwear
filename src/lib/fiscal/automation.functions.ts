import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFiscalCategorySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('fiscal_category_settings' as any)
      .select('*, store_categories(name)');
    if (error) throw new Error(error.message);
    return data as any[];
  });

export const saveFiscalCategorySetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({
    category_id: z.string(),
    ncm: z.string(),
    cest: z.string().optional().nullable(),
    cfop_internal: z.string(),
    cfop_interstate: z.string(),
    cst_csosn: z.string().optional().nullable(),
    icms_rate: z.number().optional().default(0),
    unit_commercial: z.string().optional().default('UN'),
    unit_taxable: z.string().optional().default('UN'),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('fiscal_category_settings' as any)
      .upsert({
        ...data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'category_id' });

    if (error) throw new Error(error.message);

    // Log auditoria
    await context.supabase.from('fiscal_audit_logs' as any).insert({
      user_id: context.userId,
      resource_type: 'category_settings',
      resource_id: data.category_id,
      action: 'upsert',
      new_values: data
    });

    return { success: true };
  });

export const getFiscalSuggestion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: any) => z.object({ category_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: settings } = await context.supabase
      .from('fiscal_category_settings' as any)
      .select('*')
      .eq('category_id', data.category_id)
      .maybeSingle();
    
    return settings;
  });
