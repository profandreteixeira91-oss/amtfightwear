import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
    const [zonesR, slotsR, fabricsR, patchesR] = await Promise.all([
      sb.from("custom_shop_zones").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_patch_slots").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_fabrics").select("*").eq("template_id", template.id).order("sort_order"),
      sb.from("custom_shop_patches").select("*").eq("active", true).order("sort_order"),
    ]);
    return {
      template,
      zones: zonesR.data ?? [],
      slots: slotsR.data ?? [],
      fabrics: fabricsR.data ?? [],
      patches: patchesR.data ?? [],
    };
  });
