import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProductsWithFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Sem embed de store_categories: não existe FK entre products.category_id
    // e store_categories, então o PostgREST rejeita o join e a aba ficava vazia.
    const [prodRes, catRes] = await Promise.all([
      context.supabase
        .from("products" as any)
        .select("id, name, price, category_id, ncm, cest, cfop, origem, unidade, cfop_internal, cfop_interstate, unit_commercial, unit_taxable")
        .order("name"),
      context.supabase.from("store_categories" as any).select("id, name, ncm, cest, cfop, origem, unidade"),
    ]);
    if (prodRes.error) throw new Error(prodRes.error.message);
    if (catRes.error) throw new Error(catRes.error.message);
    const catMap = new Map<string, any>(
      ((catRes.data as any[]) || []).map((c: any) => [c.id, c]),
    );
    return ((prodRes.data as any[]) || []).map((p: any) => {
      const cat = p.category_id ? catMap.get(p.category_id) : null;
      return {
        ...p,
        // Herança visível na UI: o produto herda o fiscal da categoria quando vazio.
        store_categories: cat
          ? { name: cat.name, ncm: cat.ncm, cest: cat.cest, cfop: cat.cfop, origem: cat.origem, unidade: cat.unidade }
          : null,
        category_name: cat?.name ?? null,
        effective_ncm: p.ncm || cat?.ncm || null,
        effective_cest: p.cest || cat?.cest || null,
        effective_cfop_internal: p.cfop_internal || p.cfop || cat?.cfop || "5102",
        effective_cfop_interstate: p.cfop_interstate || "6102",
      };
    });

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
