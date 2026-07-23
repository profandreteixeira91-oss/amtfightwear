// Envio de Web Push para o dono do dojo (painel Dojo Manager).
// Filtra por categoria e limpa inscrições inválidas automaticamente.
import webpush from "web-push";
import type { OwnerPushCategory } from "@/lib/dojo/owner-push.functions";

export type DojoOwnerPushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@amtfightwear.com.br";
  if (!pub || !priv) throw new Error("VAPID keys ausentes (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY)");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

/**
 * Envia um push a todas as inscrições do dono do dojo cuja categoria esteja habilitada.
 */
export async function sendPushToDojoOwner(
  userId: string,
  category: OwnerPushCategory,
  payload: DojoOwnerPushPayload,
): Promise<{ sent: number; failed: number }> {
  configure();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: subs } = await supabaseAdmin
    .from("dojo_owner_push_subscriptions" as never)
    .select("id, endpoint, p256dh, auth, categories")
    .eq("user_id", userId);

  const enabled = ((subs ?? []) as any[]).filter((s) => {
    const cats = (s.categories ?? {}) as Record<string, boolean | undefined>;
    // default = true quando não definido
    return cats[category] !== false;
  });
  if (enabled.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    enabled.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 },
        );
        sent++;
        await supabaseAdmin
          .from("dojo_owner_push_subscriptions" as never)
          .update({ last_success_at: new Date().toISOString(), last_error: null } as never)
          .eq("id", s.id);
      } catch (err: any) {
        failed++;
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          await supabaseAdmin
            .from("dojo_owner_push_subscriptions" as never)
            .delete()
            .eq("id", s.id);
        } else {
          await supabaseAdmin
            .from("dojo_owner_push_subscriptions" as never)
            .update({ last_error: String(err?.body || err?.message || err).slice(0, 500) } as never)
            .eq("id", s.id);
        }
      }
    }),
  );

  return { sent, failed };
}
