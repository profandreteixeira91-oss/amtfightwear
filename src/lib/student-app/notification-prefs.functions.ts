import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationCategoryKey =
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
  | "plan_change";

export const DEFAULT_NOTIFICATION_CATEGORIES: Record<NotificationCategoryKey, boolean> = {
  class_reminder: true,
  invoice_due_soon: true,
  invoice_overdue: true,
  payment_received: true,
  announcement: true,
  graduation: true,
  new_video: true,
  evaluation: true,
  attendance_confirmed: true,
  contract: true,
  competition: true,
  plan_change: true,
};

export const NOTIFICATION_CATEGORY_META: Array<{
  key: NotificationCategoryKey;
  label: string;
  description: string;
  group: "Aulas & Presença" | "Financeiro" | "Comunicação" | "Desempenho";
}> = [
  { key: "class_reminder", label: "Lembrete de aulas", description: "Aviso antes do início das aulas do dia.", group: "Aulas & Presença" },
  { key: "attendance_confirmed", label: "Check-in confirmado", description: "Confirmação enviada após presença registrada.", group: "Aulas & Presença" },
  { key: "invoice_due_soon", label: "Cobrança a vencer", description: "Aviso automático de faturas próximas do vencimento.", group: "Financeiro" },
  { key: "invoice_overdue", label: "Cobrança vencida", description: "Alerta quando o pagamento passa da data.", group: "Financeiro" },
  { key: "payment_received", label: "Pagamento confirmado", description: "Notifica o aluno quando um pagamento é aprovado.", group: "Financeiro" },
  { key: "plan_change", label: "Alteração de plano", description: "Avisa o aluno em mudanças de plano/contrato.", group: "Financeiro" },
  { key: "announcement", label: "Quadro de avisos", description: "Comunicados publicados pelo dono do dojo.", group: "Comunicação" },
  { key: "contract", label: "Contratos e documentos", description: "Novos contratos disponíveis ou pendentes.", group: "Comunicação" },
  { key: "new_video", label: "Novos vídeos postados", description: "Aula ou vídeo técnico novo na biblioteca.", group: "Comunicação" },
  { key: "graduation", label: "Graduações", description: "Faixa/grau concedido ou próximo da data.", group: "Desempenho" },
  { key: "evaluation", label: "Avaliações", description: "Nova avaliação registrada ou disponível.", group: "Desempenho" },
  { key: "competition", label: "Competições", description: "Inscrições, resultados e lembretes de eventos.", group: "Desempenho" },
];

function normalize(input: unknown): Record<NotificationCategoryKey, boolean> {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_NOTIFICATION_CATEGORIES };
  for (const k of Object.keys(DEFAULT_NOTIFICATION_CATEGORIES) as NotificationCategoryKey[]) {
    if (typeof src[k] === "boolean") out[k] = src[k] as boolean;
  }
  return out;
}

export const getStudentNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dojo_student_notification_prefs")
      .select("categories, updated_at")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      categories: normalize((data as any)?.categories),
      updated_at: (data as any)?.updated_at ?? null,
    };
  });

export const saveStudentNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categories: Partial<Record<NotificationCategoryKey, boolean>> }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const categories = normalize(data.categories);
    const { error } = await supabase
      .from("dojo_student_notification_prefs")
      .upsert(
        { owner_id: userId, categories, updated_at: new Date().toISOString() } as never,
        { onConflict: "owner_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, categories };
  });
