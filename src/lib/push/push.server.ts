// Helpers server-only para envio de Web Push (VAPID) aos alunos.
// Não importar de arquivos que fazem parte do bundle client — use dynamic import.

import webpush from "web-push";

type PushPayload = {
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

export async function sendPushToStudent(studentId: string, payload: PushPayload): Promise<void> {
  configure();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("dojo_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("student_id", studentId);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 },
        );
        await supabaseAdmin
          .from("dojo_push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), last_error: null } as never)
          .eq("id", s.id);
      } catch (err: any) {
        const code = err?.statusCode;
        // 404/410 = inscrição inválida, apagar
        if (code === 404 || code === 410) {
          await supabaseAdmin.from("dojo_push_subscriptions").delete().eq("id", s.id);
        } else {
          await supabaseAdmin
            .from("dojo_push_subscriptions")
            .update({ last_error: String(err?.body || err?.message || err) } as never)
            .eq("id", s.id);
        }
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
