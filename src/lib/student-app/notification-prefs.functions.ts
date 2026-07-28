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
  { key: "class_reminder", label: "Lembrete de aula", description: "Avisa o aluno antes do início da aula, com base nos horários abaixo.", group: "Aulas & Presença" },
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

/**
 * Regras de temporização configuráveis pelo dono do dojo.
 * - class_reminder_offsets_min: minutos antes do início da aula em que o push é disparado (múltiplos valores).
 * - invoice_due_soon_offsets_days: dias antes do vencimento (positivos) em que a cobrança a vencer é notificada.
 * - invoice_overdue_frequency_days: intervalo em dias com que o lembrete de cobrança vencida é reenviado.
 */
export type NotificationExtras = {
  class_reminder_offsets_min: number[];
  invoice_due_soon_offsets_days: number[];
  invoice_overdue_frequency_days: number;
};

export const DEFAULT_NOTIFICATION_EXTRAS: NotificationExtras = {
  class_reminder_offsets_min: [60, 15],
  invoice_due_soon_offsets_days: [3, 1],
  invoice_overdue_frequency_days: 3,
};

function normalize(input: unknown): Record<NotificationCategoryKey, boolean> {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_NOTIFICATION_CATEGORIES };
  for (const k of Object.keys(DEFAULT_NOTIFICATION_CATEGORIES) as NotificationCategoryKey[]) {
    if (typeof src[k] === "boolean") out[k] = src[k] as boolean;
  }
  return out;
}

function normalizeIntArray(input: unknown, opts: { min: number; max: number; maxLen: number }): number[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<number>();
  const out: number[] = [];
  for (const v of input) {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) continue;
    if (n < opts.min || n > opts.max) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= opts.maxLen) break;
  }
  return out;
}

export function normalizeExtras(input: unknown): NotificationExtras {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const classOff =
    normalizeIntArray(src.class_reminder_offsets_min, { min: 0, max: 720, maxLen: 8 }) ??
    DEFAULT_NOTIFICATION_EXTRAS.class_reminder_offsets_min;
  const dueOff =
    normalizeIntArray(src.invoice_due_soon_offsets_days, { min: 0, max: 60, maxLen: 6 }) ??
    DEFAULT_NOTIFICATION_EXTRAS.invoice_due_soon_offsets_days;
  const rawFreq = Number(src.invoice_overdue_frequency_days);
  const freq =
    Number.isFinite(rawFreq) && rawFreq >= 1 && rawFreq <= 30
      ? Math.round(rawFreq)
      : DEFAULT_NOTIFICATION_EXTRAS.invoice_overdue_frequency_days;
  // Ordena para exibição estável (crescente para minutos e dias).
  return {
    class_reminder_offsets_min: [...classOff].sort((a, b) => b - a),
    invoice_due_soon_offsets_days: [...dueOff].sort((a, b) => b - a),
    invoice_overdue_frequency_days: freq,
  };
}

export const getStudentNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("dojo_student_notification_prefs")
      .select("categories, extras, updated_at")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      categories: normalize((data as any)?.categories),
      extras: normalizeExtras((data as any)?.extras),
      updated_at: (data as any)?.updated_at ?? null,
    };
  });

export const saveStudentNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    categories: Partial<Record<NotificationCategoryKey, boolean>>;
    extras?: Partial<NotificationExtras>;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const categories = normalize(data.categories);
    const extras = normalizeExtras(data.extras);
    const { error } = await supabase
      .from("dojo_student_notification_prefs")
      .upsert(
        {
          owner_id: userId,
          categories,
          extras,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "owner_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, categories, extras };
  });
