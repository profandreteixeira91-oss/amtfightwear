// Server fns para lembretes automáticos de cobrança (AMT Pay — Fase 5).
// Configurações vivem em dojo_payment_settings.extras.reminders.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReminderRule = {
  offset_days: number; // negativo = antes do vencimento, positivo = após
  label: string;
  enabled: boolean;
};

export type ReminderSettings = {
  enabled: boolean;
  channels: { email: boolean; push: boolean; whatsapp: boolean };
  rules: ReminderRule[];
  quiet_hours: { start: number; end: number }; // 0-23 (horário do disparo permitido)
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  channels: { email: true, push: true, whatsapp: false },
  rules: [
    { offset_days: -3, label: "Aviso prévio (3 dias antes)", enabled: true },
    { offset_days: 0, label: "Vence hoje", enabled: true },
    { offset_days: 3, label: "Em atraso (3 dias)", enabled: true },
    { offset_days: 7, label: "Cobrança final (7 dias)", enabled: true },
  ],
  quiet_hours: { start: 8, end: 20 },
};

async function ensureSettings(supabase: any, ownerId: string): Promise<any> {
  const { data } = await supabase
    .from("dojo_payment_settings")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("dojo_payment_settings")
    .insert({ owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

function readReminderSettings(row: any): ReminderSettings {
  const extras = row?.extras ?? {};
  const stored = extras.reminders as Partial<ReminderSettings> | undefined;
  if (!stored) return DEFAULT_REMINDER_SETTINGS;
  return {
    enabled: stored.enabled ?? DEFAULT_REMINDER_SETTINGS.enabled,
    channels: {
      email: stored.channels?.email ?? true,
      push: stored.channels?.push ?? true,
      whatsapp: stored.channels?.whatsapp ?? false,
    },
    rules:
      Array.isArray(stored.rules) && stored.rules.length > 0
        ? (stored.rules as ReminderRule[])
        : DEFAULT_REMINDER_SETTINGS.rules,
    quiet_hours: {
      start: stored.quiet_hours?.start ?? 8,
      end: stored.quiet_hours?.end ?? 20,
    },
  };
}

export const getReminderSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await ensureSettings(context.supabase, context.userId);
    return readReminderSettings(row);
  });

const updateSchema = z.object({
  enabled: z.boolean(),
  channels: z.object({ email: z.boolean(), whatsapp: z.boolean() }),
  rules: z
    .array(
      z.object({
        offset_days: z.number().int().min(-60).max(60),
        label: z.string().min(1).max(80),
        enabled: z.boolean(),
      }),
    )
    .max(10),
  quiet_hours: z.object({
    start: z.number().int().min(0).max(23),
    end: z.number().int().min(0).max(23),
  }),
});

export const updateReminderSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const row = await ensureSettings(context.supabase, context.userId);
    const extras = { ...(row.extras ?? {}), reminders: data };
    const { error } = await context.supabase
      .from("dojo_payment_settings")
      .update({ extras })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return data;
  });

export const listRecentReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("dojo_invoice_reminders")
      .select(
        "id, invoice_id, offset_days, channel, status, error_message, sent_at, invoice:dojo_invoices(description, amount, due_date, student:dojo_students(full_name, email))",
      )
      .eq("owner_id", context.userId)
      .order("sent_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

export const sendReminderNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ invoiceId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Verifica se a fatura pertence ao dono (RLS já protege, mas duplo check).
    const { data: inv, error: invErr } = await context.supabase
      .from("dojo_invoices")
      .select(
        "id, owner_id, description, amount, due_date, status, payment_link, asaas_invoice_url, asaas_pix_copypaste, student:dojo_students(full_name, email)",
      )
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (invErr || !inv) throw new Error("Fatura não encontrada");
    if ((inv as any).owner_id !== context.userId)
      throw new Error("Sem permissão");
    const { dispatchInvoiceReminder } = await import(
      "./payments/reminder-dispatcher.server"
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // offset dinâmico = hoje - vencimento
    const today = new Date();
    const due = new Date(`${(inv as any).due_date}T00:00:00Z`);
    const diff = Math.round(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    );
    const result = await dispatchInvoiceReminder(supabaseAdmin as any, {
      invoice: inv as any,
      offsetDays: diff,
      manual: true,
    });
    return result;
  });
