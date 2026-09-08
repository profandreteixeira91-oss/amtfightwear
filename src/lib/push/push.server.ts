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

export type StudentNotificationCategory =
  | "class_reminder"
  | "invoice_due_soon"
  | "invoice_overdue"
  | "payment_received"
  | "announcement"
  | "graduation"
  | "new_video"
  | "evaluation"
  | "attendance_confirmed"
  | "contract"
  | "competition"
  | "plan_change"
  | "schedule_change";

async function isCategoryEnabledForStudent(
  studentId: string,
  category: StudentNotificationCategory | undefined,
): Promise<boolean> {
  if (!category) return true;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: st } = await supabaseAdmin
      .from("dojo_students")
      .select("owner_id")
      .eq("id", studentId)
      .maybeSingle();
    const ownerId = (st as any)?.owner_id as string | undefined;
    if (!ownerId) return true;
    const { data: prefs } = await supabaseAdmin
      .from("dojo_student_notification_prefs")
      .select("categories")
      .eq("owner_id", ownerId)
      .maybeSingle();
    const cats = (prefs as any)?.categories as Record<string, boolean> | undefined;
    if (!cats) return true; // sem preferências salvas → padrão (tudo ligado)
    // undefined em categoria específica também trata como ligado
    return cats[category] !== false;
  } catch (err) {
    console.warn("[push:student] falha ao ler preferências, seguindo com envio:", (err as any)?.message);
    return true;
  }
}

export async function sendPushToStudent(
  studentId: string,
  payload: PushPayload,
  category?: StudentNotificationCategory,
): Promise<void> {
  const allowed = await isCategoryEnabledForStudent(studentId, category);
  if (!allowed) {
    console.log("[push:student] categoria desativada pelo dono do dojo", { studentId, category });
    return;
  }

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
  category?: StudentNotificationCategory,
): void {
  if (!studentId) return;
  void sendPushToStudent(studentId, payload, category).catch((err) => {
    console.warn("[safeNotifyStudent] falhou:", err?.message ?? err);
  });
}
