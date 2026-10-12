import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSetupState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [progress, academy, plans, classes, students] = await Promise.all([
      context.supabase.from("dojo_setup_progress").select("step, status").eq("owner_id", context.userId).maybeSingle(),
      context.supabase.from("dojo_academy_profile").select("trade_name, whatsapp, city, state, modalities, logo_url, slug").eq("owner_id", context.userId).maybeSingle(),
      context.supabase.from("dojo_plans").select("id, name").eq("owner_id", context.userId).eq("active", true),
      context.supabase.from("dojo_classes").select("id, name").eq("owner_id", context.userId).eq("status", "active"),
      context.supabase.from("dojo_students").select("id", { count: "exact", head: true }).eq("owner_id", context.userId),
    ]);
    for (const result of [progress, academy, plans, classes, students]) {
      if (result.error) throw new Error(result.error.message);
    }
    return { progress: progress.data, academy: academy.data, plans: plans.data ?? [], classes: classes.data ?? [], students: students.count ?? 0 };
  });

export const saveSetupProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ step: z.number().int().min(0).max(4), status: z.enum(["paused", "completed"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("dojo_setup_progress").upsert({ owner_id: context.userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSetupIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    trade_name: z.string().trim().min(2).max(200),
    whatsapp: z.string().trim().max(20), city: z.string().trim().max(120),
    state: z.string().trim().regex(/^([A-Za-z]{2})?$/),
    modalities: z.array(z.string().trim().min(1).max(60)).min(1).max(20),
    logo_url: z.string().url().nullable().optional(),
  }).parse(input))
  .handler(async ({ context, data }) => {
    // Do not touch onboarding_completed: it belongs to AMT Pay.
    const { error } = await context.supabase.from("dojo_academy_profile").upsert({ owner_id: context.userId, ...data, state: data.state.toUpperCase() }, { onConflict: "owner_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SetupState = Awaited<ReturnType<typeof getSetupState>>;