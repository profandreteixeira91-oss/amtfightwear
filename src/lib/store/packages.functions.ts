import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PackageProduct = {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  category_id: string | null;
  status: string;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
};

export const adminListPackageProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PackageProduct[]> => {
    const { data, error } = await context.supabase
      .from("products")
      .select("id, name, sku, image_url, category_id, status, weight_grams, length_cm, width_cm, height_cm")
      .order("name", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      ...p,
      weight_grams: p.weight_grams ?? null,
      length_cm: p.length_cm === null || p.length_cm === undefined ? null : Number(p.length_cm),
      width_cm: p.width_cm === null || p.width_cm === undefined ? null : Number(p.width_cm),
      height_cm: p.height_cm === null || p.height_cm === undefined ? null : Number(p.height_cm),
    })) as PackageProduct[];
  });

const dimsSchema = z.object({
  weight_grams: z.number().int().min(0).max(200000).nullable().optional(),
  length_cm: z.number().min(0).max(500).nullable().optional(),
  width_cm: z.number().min(0).max(500).nullable().optional(),
  height_cm: z.number().min(0).max(500).nullable().optional(),
});

export const adminSavePackageDimensions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        rows: z
          .array(dimsSchema.extend({ id: z.string().uuid() }))
          .min(1)
          .max(1000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let updated = 0;
    for (const row of data.rows) {
      const { id, ...patch } = row;
      const { error } = await context.supabase.from("products").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      updated += 1;
    }
    return { ok: true, updated };
  });

export const adminBulkApplyPackageDimensions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(2000),
        values: dimsSchema,
        onlyEmpty: z.boolean().default(false),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(data.values)) {
      if (v !== undefined) patch[k] = v as number | null;
    }
    if (Object.keys(patch).length === 0) return { ok: true, updated: 0 };

    let ids = data.ids;
    if (data.onlyEmpty) {
      const { data: rows } = await context.supabase
        .from("products")
        .select("id, weight_grams, length_cm, width_cm, height_cm")
        .in("id", ids);
      const keys = Object.keys(patch) as (keyof PackageProduct)[];
      ids = (rows ?? [])
        .filter((r) => keys.every((k) => (r as Record<string, unknown>)[k] === null || (r as Record<string, unknown>)[k] === undefined))
        .map((r) => r.id);
      if (ids.length === 0) return { ok: true, updated: 0 };
    }

    const { error } = await context.supabase.from("products").update(patch).in("id", ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: ids.length };
  });
