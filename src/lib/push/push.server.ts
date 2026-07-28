// Helpers server-only para envio de Web Push (VAPID) aos alunos.
// Usa Web Crypto via @block65/webcrypto-web-push (compatível com Cloudflare Workers).

import { sendWebPushOnce } from "./webpush-native.server";

type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

export async function sendPushToStudent(studentId: string, payload: PushPayload): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs, error } = await supabaseAdmin
    .from("dojo_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("student_id", studentId);

  if (error) {
    console.error("[push:student] falha ao buscar inscrições", studentId, error.message);
    return;
  }
  if (!subs || subs.length === 0) {
    console.log("[push:student] nenhuma inscrição para", studentId);
    return;
  }

  await Promise.all(
    subs.map(async (s: any) => {
      const result = await sendWebPushOnce(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        payload,
      );
      if (result.ok) {
        await supabaseAdmin
          .from("dojo_push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), last_error: null } as never)
          .eq("id", s.id);
      } else if (result.expired) {
        await supabaseAdmin.from("dojo_push_subscriptions").delete().eq("id", s.id);
        console.warn("[push:student] inscrição expirada removida", s.id);
      } else {
        await supabaseAdmin
          .from("dojo_push_subscriptions")
          .update({ last_error: result.error } as never)
          .eq("id", s.id);
        console.warn("[push:student] falha no envio", s.id, result.status, result.error);
      }
    }),
  );
}

/**
 * Fire-and-forget: envia push ao aluno e engole qualquer erro
 * para não bloquear o fluxo principal da função chamadora.
 */
export function safeNotifyStudent(
  studentId: string | null | undefined,
  payload: PushPayload,
): void {
  if (!studentId) return;
  void sendPushToStudent(studentId, payload).catch((err) => {
    console.warn("[safeNotifyStudent] falhou:", err?.message ?? err);
  });
}
