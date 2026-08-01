import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAmtAdmin(context: any) {
  const { isSaasOwner } = await import("@/lib/auth/is-saas-owner");
  if (!(await isSaasOwner(context))) throw new Error("Somente admins AMT podem gerenciar notificações do painel.");
}

/** Retorna a chave pública VAPID para o navegador se inscrever. */
export const getAdminPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) throw new Error("VAPID_PUBLIC_KEY não configurada");
  return { publicKey: key };
});

/** Salva/atualiza a inscrição do navegador do admin. */
export const saveAdminPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { endpoint: string; p256dh: string; auth: string; userAgent?: string | null }) => data,
  )
  .handler(async ({ data, context }) => {
    await ensureAmtAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      user_id: context.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.userAgent ?? null,
      updated_at: new Date().toISOString(),
    } as never;
    const { error } = await supabaseAdmin
      .from("store_admin_push_subscriptions")
      .upsert(payload, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove a inscrição por endpoint (chamado ao desativar as notificações). */
export const removeAdminPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("store_admin_push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Verifica se o navegador atual está inscrito (útil para o toggle). */
export const listMyAdminPushSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_admin_push_subscriptions")
      .select("id, endpoint, user_agent, last_success_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { subscriptions: data ?? [] };
  });

/** Dispara uma notificação de teste para o próprio usuário. */
export const sendAdminPushTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAmtAdmin(context);
    const { sendPushToUser } = await import("@/lib/push/admin-push.server");
    const result = await sendPushToUser(context.userId, {
      title: "AMT Admin — teste",
      body: "As notificações estão funcionando 🎉",
      url: "/store",
      tag: "amt-admin-test",
    });
    return result;
  });

/** Lista as preferências de notificação por evento do admin logado. */
export const getAdminNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAmtAdmin(context);
    const { data, error } = await context.supabase
      .from("store_admin_notification_prefs")
      .select("event, enabled")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const prefs: Record<string, boolean> = {};
    for (const row of data ?? []) prefs[String((row as any).event)] = (row as any).enabled !== false;
    return { prefs };
  });

/** Ativa/desativa um tipo de notificação para o admin logado. */
export const setAdminNotificationPref = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { event: string; enabled: boolean }) => data)
  .handler(async ({ data, context }) => {
    await ensureAmtAdmin(context);
    const { isAdminNotificationEvent } = await import("@/lib/push/admin-events");
    if (!isAdminNotificationEvent(data.event)) throw new Error("Evento de notificação inválido.");
    const { error } = await context.supabase.from("store_admin_notification_prefs").upsert(
      {
        user_id: context.userId,
        event: data.event,
        enabled: data.enabled,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,event" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Envia uma notificação de teste de um evento específico para o admin logado. */
export const sendAdminPushEventTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { event: string }) => data)
  .handler(async ({ data, context }) => {
    await ensureAmtAdmin(context);
    const { ADMIN_NOTIFICATION_CATALOG, isAdminNotificationEvent } = await import(
      "@/lib/push/admin-events"
    );
    if (!isAdminNotificationEvent(data.event)) throw new Error("Evento de notificação inválido.");
    const def = ADMIN_NOTIFICATION_CATALOG.find((d) => d.event === data.event)!;
    const { sendPushToUser } = await import("@/lib/push/admin-push.server");
    return sendPushToUser(context.userId, {
      title: `Teste — ${def.label}`,
      body: def.description,
      url: "/admin/notificacoes",
      tag: `test-${def.event}`,
      data: { event: def.event },
    });
  });
