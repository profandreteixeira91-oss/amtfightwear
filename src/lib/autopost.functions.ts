import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAutoPostSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("auto_post_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateInput = z.object({
  enabled: z.boolean().optional(),
  schedule_hours_utc: z.array(z.number().int().min(0).max(23)).min(1).max(24).optional(),
  tone: z.string().min(1).max(60).optional(),
  categories: z.array(z.string()).optional(),
});

export const updateAutoPostSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateInput.parse(i))
  .handler(async ({ data, context }) => {
    const patch = { ...data, updated_by: context.userId } as Record<string, unknown>;
    const { data: row, error } = await context.supabase
      .from("auto_post_settings")
      .update(patch)
      .eq("singleton", true)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const runAutoPostNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const url = "https://project--673d932e-eb85-41a4-9454-a94c54c26ec9.lovable.app/api/public/hooks/auto-instagram-post?force=1";
    const res = await fetch(url, { method: "POST", headers: { "x-force": "1" } });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    try { return JSON.parse(text); } catch { return { raw: text }; }
  });
