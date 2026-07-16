import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type SizePreset = {
  id: string;
  category_key: string;
  category_label: string;
  sizes: string[];
  sort_order: number;
};

async function fetchAll(): Promise<SizePreset[]> {
  const sb = publicClient();
  const { data, error } = await sb
    .from("store_size_presets" as never)
    .select("id, category_key, category_label, sizes, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Array<{ id: string; category_key: string; category_label: string; sizes: unknown; sort_order: number }>).map((r) => ({
    id: r.id,
    category_key: r.category_key,
    category_label: r.category_label,
    sizes: Array.isArray(r.sizes) ? (r.sizes as string[]) : [],
    sort_order: r.sort_order,
  }));
}

export const listSizePresets = createServerFn({ method: "GET" }).handler(async () => fetchAll());

const upsertInput = z.object({
  id: z.string().uuid().optional(),
  category_key: z.string().min(1).max(60).regex(/^[a-z0-9_-]+$/i),
  category_label: z.string().min(1).max(80),
  sizes: z.array(z.string().min(1).max(20)).max(50),
  sort_order: z.number().int().min(0).max(1000).optional(),
});

async function assertAdmin(context: { supabase: ReturnType<typeof createClient<Database>>; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const upsertSizePreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const categoryKey = data.category_key.toLowerCase();
    const payload = {
      category_key: categoryKey,
      category_label: data.category_label,
      sizes: data.sizes,
      sort_order: data.sort_order ?? 0,
    };
    if (data.id) {
      const { error } = await (context.supabase.from("store_size_presets" as never) as any)
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (context.supabase.from("store_size_presets" as never) as any)
        .insert(payload);
      if (error) throw new Error(error.message);
    }

    // Se a categoria for "faixa", propagar as alterações para todos os produtos
    // em categorias cujo slug começa com "faixas-" (BJJ + Judô). Preserva
    // preço, estoque e SKU de variantes cujo tamanho continua no preset;
    // adiciona os novos e remove os que saíram.
    let syncedProducts = 0;
    let addedVariants = 0;
    let removedVariants = 0;
    if (categoryKey === "faixa") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cats } = await supabaseAdmin
        .from("store_categories")
        .select("id, slug")
        .ilike("slug", "faixas-%");
      const catIds = (cats ?? []).map((c) => c.id);
      if (catIds.length > 0) {
        const { data: prods } = await supabaseAdmin
          .from("products")
          .select("id, price")
          .in("category_id", catIds);
        const products = prods ?? [];
        const targetSizes = data.sizes;
        for (const p of products) {
          const { data: variants } = await supabaseAdmin
            .from("store_product_variants")
            .select("id, size, sort_order")
            .eq("product_id", p.id);
          const existing = variants ?? [];
          const bySize = new Map<string, { id: string; sort_order: number | null }>();
          for (const v of existing) {
            if (v.size) bySize.set(v.size, { id: v.id, sort_order: v.sort_order });
          }
          const toRemove = existing.filter((v) => !v.size || !targetSizes.includes(v.size));
          const toInsert: Array<Record<string, unknown>> = [];
          const toUpdate: Array<{ id: string; sort_order: number }> = [];
          targetSizes.forEach((s, idx) => {
            const hit = bySize.get(s);
            if (hit) {
              if (hit.sort_order !== idx) toUpdate.push({ id: hit.id, sort_order: idx });
            } else {
              toInsert.push({
                product_id: p.id,
                size: s,
                color: null,
                option_label: null,
                sku: null,
                price: p.price ?? null,
                compare_at_price: null,
                stock: 0,
                weight_grams: null,
                sort_order: idx,
                active: true,
              });
            }
          });
          if (toRemove.length > 0) {
            await supabaseAdmin
              .from("store_product_variants")
              .delete()
              .in("id", toRemove.map((v) => v.id));
            removedVariants += toRemove.length;
          }
          if (toInsert.length > 0) {
            await supabaseAdmin.from("store_product_variants").insert(toInsert as never);
            addedVariants += toInsert.length;
          }
          for (const u of toUpdate) {
            await supabaseAdmin
              .from("store_product_variants")
              .update({ sort_order: u.sort_order })
              .eq("id", u.id);
          }
          syncedProducts += 1;
        }
      }
    }

    return { ok: true, syncedProducts, addedVariants, removedVariants };
  });

export const deleteSizePreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("store_size_presets" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
