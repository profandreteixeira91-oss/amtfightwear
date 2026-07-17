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

// Mapeamento chave-preset -> padrão de slug da categoria de produtos.
// A busca é ilike, então cobre subcategorias (ex.: "faixas-de-jiu-jitsu-...").
const CATEGORY_SLUG_PATTERNS: Record<string, string[]> = {
  faixa: ["faixas-%"],
  kimono: ["kimonos-%"],
  camiseta: ["camisetas-%"],
  rashguard: ["rashguards-%"],
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

// Aplica um preset a todos os produtos das categorias que combinam com o padrão.
// Preserva preço/estoque/SKU das variantes cujo tamanho continua no preset,
// insere as novas e remove as que saíram.
async function applyPresetToProducts(
  categoryKey: string,
  targetSizes: string[],
): Promise<{ syncedProducts: number; addedVariants: number; removedVariants: number }> {
  const patterns = CATEGORY_SLUG_PATTERNS[categoryKey.toLowerCase()];
  if (!patterns || patterns.length === 0) {
    return { syncedProducts: 0, addedVariants: 0, removedVariants: 0 };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Coleta todas as categorias que combinam com qualquer um dos padrões.
  const catIdsSet = new Set<string>();
  for (const pattern of patterns) {
    const { data: cats } = await supabaseAdmin
      .from("store_categories")
      .select("id")
      .ilike("slug", pattern);
    for (const c of cats ?? []) catIdsSet.add(c.id);
  }
  const catIds = Array.from(catIdsSet);
  if (catIds.length === 0) return { syncedProducts: 0, addedVariants: 0, removedVariants: 0 };

  const { data: prods } = await supabaseAdmin
    .from("products")
    .select("id, price")
    .in("category_id", catIds);
  const products = prods ?? [];

  let syncedProducts = 0;
  let addedVariants = 0;
  let removedVariants = 0;

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

  return { syncedProducts, addedVariants, removedVariants };
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

    const sync = await applyPresetToProducts(categoryKey, data.sizes);
    return { ok: true, ...sync };
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

// Força sincronização de todos os presets contra os produtos.
// Útil quando a admin importou produtos com nomenclaturas antigas e quer
// alinhar tudo aos presets atuais.
export const syncAllSizePresets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const presets = await fetchAll();
    let syncedProducts = 0;
    let addedVariants = 0;
    let removedVariants = 0;
    for (const p of presets) {
      const r = await applyPresetToProducts(p.category_key, p.sizes);
      syncedProducts += r.syncedProducts;
      addedVariants += r.addedVariants;
      removedVariants += r.removedVariants;
    }
    return { ok: true, syncedProducts, addedVariants, removedVariants };
  });
