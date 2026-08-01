// Helpers server-only para envio de Web Push aos admins AMT.
// Usa Web Crypto (Cloudflare Workers compatible).

import { sendWebPushOnce } from "./webpush-native.server";

export type AdminPushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

async function sendToRows(
  subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: AdminPushPayload,
  updateOnSuccess: boolean,
): Promise<{ sent: number; failed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      const result = await sendWebPushOnce(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        payload,
      );
      if (result.ok) {
        sent++;
        if (updateOnSuccess) {
          await supabaseAdmin
            .from("store_admin_push_subscriptions")
            .update({ last_success_at: new Date().toISOString(), last_error: null } as never)
            .eq("id", s.id);
        }
      } else if (result.expired) {
        failed++;
        await supabaseAdmin.from("store_admin_push_subscriptions").delete().eq("id", s.id);
      } else {
        failed++;
        console.warn("[push:admin] falha no envio", s.id, result.status, result.error);
        if (updateOnSuccess) {
          await supabaseAdmin
            .from("store_admin_push_subscriptions")
            .update({ last_error: result.error } as never)
            .eq("id", s.id);
        }
      }
    }),
  );
  return { sent, failed };
}

/**
 * Envia notificação a todos admins AMT (papel amt_admin) inscritos, respeitando
 * as preferências por tipo de evento de cada administrador.
 */
export async function sendPushToAmtAdmins(
  payload: AdminPushPayload,
  event?: string,
): Promise<{ sent: number; failed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "amt_admin");
  const adminIds = (admins ?? []).map((r: any) => r.user_id).filter(Boolean);
  if (adminIds.length === 0) return { sent: 0, failed: 0 };

  // Preferências: ausência de linha = habilitado (padrão).
  let allowed = new Set<string>(adminIds);
  if (event) {
    const { data: prefs } = await supabaseAdmin
      .from("store_admin_notification_prefs")
      .select("user_id, enabled")
      .eq("event", event)
      .in("user_id", adminIds);
    const disabled = new Set(
      (prefs ?? []).filter((p: any) => p.enabled === false).map((p: any) => p.user_id),
    );
    allowed = new Set(adminIds.filter((id: string) => !disabled.has(id)));
  }
  if (allowed.size === 0) return { sent: 0, failed: 0 };

  const { data: subs } = await supabaseAdmin
    .from("store_admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", Array.from(allowed));
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };
  return sendToRows(subs as any, payload, true);
}


/** Envia notificação apenas a inscrições de um usuário específico (usado no teste). */
export async function sendPushToUser(userId: string, payload: AdminPushPayload): Promise<{ sent: number; failed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("store_admin_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };
  return sendToRows(subs as any, payload, false);
}
