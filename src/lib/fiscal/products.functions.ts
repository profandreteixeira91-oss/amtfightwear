import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProductsWithFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products" as any)
      .select("id, name, price, category_id, ncm, cest, cfop_internal, cfop_interstate, store_categories(name)")
      .order("name");
    if (error) throw new Error(error.message);
    return (data || []).map((p: any) => ({
      ...p,
    }));
  });

export const updateProductFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid(),
    ncm: z.string().optional().nullable(),
    cest: z.string().optional().nullable(),
    cfop_internal: z.string().optional().nullable(),
    cfop_interstate: z.string().optional().nullable(),
    unit_commercial: z.string().optional().nullable(),
    unit_taxable: z.string().optional().nullable(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const patch: any = {};
    if (data.ncm !== undefined) patch.ncm = data.ncm;
    if (data.cest !== undefined) patch.cest = data.cest;
    if (data.cfop_internal !== undefined) patch.cfop_internal = data.cfop_internal;
    if (data.cfop_interstate !== undefined) patch.cfop_interstate = data.cfop_interstate;
    if (data.unit_commercial !== undefined) patch.unit_commercial = data.unit_commercial;
    if (data.unit_taxable !== undefined) patch.unit_taxable = data.unit_taxable;

    const { error } = await context.supabase
      .from("products" as any)
      .update(patch)
      .eq("id", data.id);
      
    if (error) throw new Error(error.message);
    return { success: true };
  });
