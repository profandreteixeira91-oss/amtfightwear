import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProductsWithFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("id, name, price, category_id, ncm, cest, cfop_default, icms_rate")
      .order("name");
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProductFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    id: z.string().uuid(),
    ncm: z.string().optional(),
    cest: z.string().optional(),
    cfop_default: z.string().optional(),
    icms_rate: z.number().optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("products")
      .update({
        ncm: data.ncm,
        cest: data.cest,
        cfop_default: data.cfop_default,
        icms_rate: data.icms_rate,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
