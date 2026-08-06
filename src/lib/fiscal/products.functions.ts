import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProductsWithFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("id, name, price, category_id, ncm, cest, cfop, store_categories(ncm, cest)")
      .order("name");
    if (error) throw new Error(error.message);
    return (data || []).map((p: any) => ({
      ...p,
      ncm: p.ncm || p.store_categories?.ncm,
      cest: p.cest || p.store_categories?.cest
    }));
  });

export const updateProductFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid(),
    ncm: z.string().optional().nullable(),
    cest: z.string().optional().nullable(),
    cfop: z.string().optional().nullable(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const patch: any = {};
    if (data.ncm !== undefined) patch.ncm = data.ncm;
    if (data.cest !== undefined) patch.cest = data.cest;
    if (data.cfop !== undefined) patch.cfop = data.cfop;

    const { error } = await context.supabase
      .from("products")
      .update(patch)
      .eq("id", data.id);
      
    if (error) throw new Error(error.message);
    return { success: true };
  });
