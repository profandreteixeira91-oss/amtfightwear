// Server functions para inscrever/gerenciar Web Push do dono do Dojo Manager.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CATEGORY_KEYS = [
  "sales",
  "enrollments",
  "graduations",
  "store_orders",
  "support",
  "system",
] as const;
export type OwnerPushCategory = (typeof CATEGORY_KEYS)[number];

const CategoriesSchema = z
  .object({
    sales: z.boolean().optional(),
    enrollments: z.boolean().optional(),
    graduations: z.boolean().optional(),
    store_orders: z.boolean().optional(),
    support: z.boolean().optional(),
    system: z.boolean().optional(),
  })
  .partial();

export const getOwnerPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) throw new Error("VAPID_PUBLIC_KEY não configurada");
  return { publicKey: key };
});

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(4),
  user_agent: z.string().max(500).optional().nullable(),
  device_label: z.string().max(120).optional().nullable(),
  categories: CategoriesSchema.optional(),
});

export const subscribeOwnerPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SubscribeSchema.parse(i))
  .handler(async ({ data, context }) => {
    const payload: Record<string, unknown> = {
      user_id: context.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.user_agent ?? null,
      device_label: data.device_label ?? null,
      updated_at: new Date().toISOString(),
    };
    if (data.categories) payload.categories = data.categories;

    const { error } = await context.supabase
      .from("dojo_owner_push_subscriptions" as never)
      .upsert(payload as never, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribeOwnerPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ endpoint: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("dojo_owner_push_subscriptions" as never)
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyOwnerPushSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_owner_push_subscriptions" as never)
      .select("id, endpoint, user_agent, device_label, categories, last_success_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { subscriptions: (data ?? []) as any[] };
  });

export const updateOwnerPushCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        endpoint: z.string().url().optional(),
        categories: CategoriesSchema,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("dojo_owner_push_subscriptions" as never)
      .update({ categories: data.categories } as never)
      .eq("user_id", context.userId);
    if (data.endpoint) q = q.eq("endpoint", data.endpoint);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendOwnerPushTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToDojoOwner } = await import("@/lib/push/dojo-owner-push.server");
    return await sendPushToDojoOwner(context.userId, "system", {
      title: "AMT Dojo Manager",
      body: "Notificações ativadas com sucesso 🎉",
      url: "/dojo/app",
      tag: "dojo-owner-test",
    });
  });
