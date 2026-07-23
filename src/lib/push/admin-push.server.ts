// Helpers server-only para envio de Web Push aos admins AMT.
// Não importar de arquivos que participam do bundle client — usar dynamic import.

import webpush from "web-push";

export type AdminPushPayload = {
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

/** Envia notificação a todos admins AMT (papel amt_admin) inscritos. */
export async function sendPushToAmtAdmins(payload: AdminPushPayload): Promise<{ sent: number; failed: number }> {
  configure();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Descobre ids com papel amt_admin
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "amt_admin");
  const adminIds = (admins ?? []).map((r: any) => r.user_id).filter(Boolean);
  if (adminIds.length === 0) return { sent: 0, failed: 0 };

  const { data: subs } = await supabaseAdmin
    .from("store_admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", adminIds);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 },
        );
        sent++;
        await supabaseAdmin
          .from("store_admin_push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), last_error: null } as never)
          .eq("id", s.id);
      } catch (err: any) {
        failed++;
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          await supabaseAdmin.from("store_admin_push_subscriptions").delete().eq("id", s.id);
        } else {
          await supabaseAdmin
            .from("store_admin_push_subscriptions")
            .update({ last_error: String(err?.body || err?.message || err).slice(0, 500) } as never)
            .eq("id", s.id);
        }
      }
    }),
  );
  return { sent, failed };
}

/** Envia notificação apenas a inscrições de um usuário específico (usado no teste). */
export async function sendPushToUser(userId: string, payload: AdminPushPayload): Promise<{ sent: number; failed: number }> {
  configure();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("store_admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (err: any) {
        failed++;
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          await supabaseAdmin.from("store_admin_push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
  return { sent, failed };
}
