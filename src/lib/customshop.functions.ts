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

export const listCustomTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("custom_shop_templates")
    .select("id, kind, name, description, base_price, production_days, base_image_url, preview_ratio, sort_order")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
});

export const getCustomTemplate = createServerFn({ method: "GET" })
  .inputValidator((i: { kind: string }) => z.object({ kind: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: template } = await sb
      .from("custom_shop_templates")
      .select("*")
      .eq("kind", data.kind)
      .eq("active", true)
      .maybeSingle();
    if (!template) return null;
    const [variantsR, zonesR, slotsR, fabricsR, patchesR] = await Promise.all([
      sb.from("custom_shop_variants").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_zones").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_patch_slots").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_fabrics").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_patches").select("*").eq("active", true).order("sort_order"),
    ]);
    return {
      template,
      variants: variantsR.data ?? [],
      zones: zonesR.data ?? [],
      slots: slotsR.data ?? [],
      fabrics: fabricsR.data ?? [],
      patches: patchesR.data ?? [],
    };
  });

// ============ Admin layout editor ============

const numPct = z.number().min(-50).max(150);

const layoutInput = z.object({
  template_id: z.string().uuid(),
  variant_key: z.string().min(1),
  zones: z.array(z.object({
    key: z.string().min(1),
    x_pct: numPct,
    y_pct: numPct,
    w_pct: z.number().min(0).max(200),
    h_pct: z.number().min(0).max(200),
    solid: z.boolean().optional(),
    rotation_deg: z.number().min(-360).max(360).optional(),
  })),
  slots: z.array(z.object({
    key: z.string().min(1),
    x_pct: numPct,
    y_pct: numPct,
    w_pct: z.number().min(0).max(400),
    h_pct: z.number().min(0).max(400).optional(),
    rotation_deg: z.number().min(-360).max(360).optional(),
  })),
});

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

export const updateCustomLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => layoutInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    for (const z of data.zones) {
      const { error } = await context.supabase
        .from("custom_shop_zones")
        .update({
          x_pct: z.x_pct,
          y_pct: z.y_pct,
          w_pct: z.w_pct,
          h_pct: z.h_pct,
          ...(z.solid !== undefined ? { solid: z.solid } : {}),
        })
        .eq("template_id", data.template_id)
        .eq("variant_key", data.variant_key)
        .eq("key", z.key);
      if (error) throw new Error(`zone ${z.key}: ${error.message}`);
    }
    for (const s of data.slots) {
      const { error } = await context.supabase
        .from("custom_shop_patch_slots")
        .update({
          x_pct: s.x_pct,
          y_pct: s.y_pct,
          w_pct: s.w_pct,
        })
        .eq("template_id", data.template_id)
        .eq("variant_key", data.variant_key)
        .eq("key", s.key);
      if (error) throw new Error(`slot ${s.key}: ${error.message}`);
    }
    return { ok: true };
  });
