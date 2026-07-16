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
    const payload = {
      category_key: data.category_key.toLowerCase(),
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
    return { ok: true };
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
