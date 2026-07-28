// Envio de Web Push para o dono do dojo (painel Dojo Manager).
// Usa Web Crypto (Cloudflare Workers compatible).
import type { OwnerPushCategory } from "@/lib/dojo/owner-push.functions";
import { sendWebPushOnce } from "./webpush-native.server";

export type DojoOwnerPushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export async function sendPushToDojoOwner(
  userId: string,
  category: OwnerPushCategory,
  payload: DojoOwnerPushPayload,
): Promise<{ sent: number; failed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: subs } = await supabaseAdmin
    .from("dojo_owner_push_subscriptions" as never)
    .select("id, endpoint, p256dh, auth, categories")
    .eq("user_id", userId);

  const enabled = ((subs ?? []) as any[]).filter((s) => {
    const cats = (s.categories ?? {}) as Record<string, boolean | undefined>;
    return cats[category] !== false;
  });
  if (enabled.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.all(
    enabled.map(async (s: any) => {
      const result = await sendWebPushOnce(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        payload,
      );
      if (result.ok) {
        sent++;
        await supabaseAdmin
          .from("dojo_owner_push_subscriptions" as never)
          .update({ last_success_at: new Date().toISOString(), last_error: null } as never)
          .eq("id", s.id);
      } else if (result.expired) {
        failed++;
        await supabaseAdmin
          .from("dojo_owner_push_subscriptions" as never)
          .delete()
          .eq("id", s.id);
      } else {
        failed++;
        console.warn("[push:owner] falha no envio", s.id, result.status, result.error);
        await supabaseAdmin
          .from("dojo_owner_push_subscriptions" as never)
          .update({ last_error: result.error } as never)
          .eq("id", s.id);
      }
    }),
  );

  return { sent, failed };
}
