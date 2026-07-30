// Cron diário — dispara lembretes de mensalidade conforme as regras do dono.
// Prioridade das regras (por owner):
//   1) dojo_student_notification_prefs.extras (nova UI unificada em
//      /dojo/app/student-notifications-config)
//   2) dojo_payment_settings.extras.reminders (RemindersPanel AMT Pay — email)
//   3) DEFAULT_REMINDER_SETTINGS
import { createFileRoute } from "@tanstack/react-router";
import { checkInternalHookAuth } from "@/lib/security/hook-auth";
import {
  DEFAULT_REMINDER_SETTINGS,
  type ReminderSettings,
} from "@/lib/dojo/reminders.functions";
import { DEFAULT_NOTIFICATION_EXTRAS } from "@/lib/student-app/notification-prefs.functions";

function readReminderSettings(row: any): ReminderSettings {
  const stored = (row?.extras ?? {}).reminders as
    | Partial<ReminderSettings>
    | undefined;
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
        ? (stored.rules as any)
        : DEFAULT_REMINDER_SETTINGS.rules,
    quiet_hours: {
      start: stored.quiet_hours?.start ?? 8,
      end: stored.quiet_hours?.end ?? 20,
    },
  };
}

type OwnerPrefs = {
  dueSoonOffsets: number[]; // dias ANTES do vencimento (positivos)
  overdueFrequency: number; // reenvia a cada N dias após vencer
  categories: { invoice_due_soon: boolean; invoice_overdue: boolean };
};

function readPrefs(row: any): OwnerPrefs {
  const categories = (row?.categories ?? {}) as Record<string, boolean>;
  const extras = (row?.extras ?? {}) as Record<string, unknown>;
  const rawDue = Array.isArray(extras.invoice_due_soon_offsets_days)
    ? (extras.invoice_due_soon_offsets_days as unknown[])
    : DEFAULT_NOTIFICATION_EXTRAS.invoice_due_soon_offsets_days;
  const due = rawDue
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 60);
  const freqRaw = Number(extras.invoice_overdue_frequency_days);
  const freq = Number.isFinite(freqRaw) && freqRaw >= 1 && freqRaw <= 30
    ? Math.round(freqRaw)
    : DEFAULT_NOTIFICATION_EXTRAS.invoice_overdue_frequency_days;
  return {
    dueSoonOffsets: due,
    overdueFrequency: freq,
    categories: {
      invoice_due_soon: categories.invoice_due_soon !== false,
      invoice_overdue: categories.invoice_overdue !== false,
    },
  };
}

export const Route = createFileRoute("/api/public/hooks/send-dojo-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkInternalHookAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { dispatchInvoiceReminder, dispatchInvoicePushReminder } = await import(
          "@/lib/dojo/payments/reminder-dispatcher.server"
        );

        // AMT Pay reminders (email) — mantém compatibilidade.
        const { data: settingsRows } = await (supabaseAdmin as any)
          .from("dojo_payment_settings")
          .select("owner_id, extras");

        const settingsByOwner = new Map<string, ReminderSettings>();
        for (const row of settingsRows ?? []) {
          settingsByOwner.set(row.owner_id, readReminderSettings(row));
        }

        // Prefs unificadas (push por categoria + offsets configuráveis).
        const { data: prefsRows } = await (supabaseAdmin as any)
          .from("dojo_student_notification_prefs")
          .select("owner_id, categories, extras");
        const prefsByOwner = new Map<string, OwnerPrefs>();
        for (const row of prefsRows ?? []) {
          prefsByOwner.set(row.owner_id, readPrefs(row));
        }

        // Universo de offsets a inspecionar hoje.
        const allOffsets = new Set<number>();
        for (const s of settingsByOwner.values()) {
          if (!s.enabled) continue;
          s.rules.filter((r) => r.enabled).forEach((r) => allOffsets.add(r.offset_days));
        }
        DEFAULT_REMINDER_SETTINGS.rules
          .filter((r) => r.enabled)
          .forEach((r) => allOffsets.add(r.offset_days));
        // Adiciona offsets negativos (dias antes) das prefs unificadas.
        for (const p of prefsByOwner.values()) {
          if (p.categories.invoice_due_soon) {
            for (const d of p.dueSoonOffsets) allOffsets.add(-d);
          }
          // Para overdue, varremos até 30 dias após o vencimento
          if (p.categories.invoice_overdue) {
            for (let d = 1; d <= 30; d++) allOffsets.add(d);
          }
        }

        if (allOffsets.size === 0) {
          return Response.json({ ok: true, sent: 0, skipped: 0, reason: "no_rules" });
        }

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const minOffset = Math.min(...allOffsets);
        const maxOffset = Math.max(...allOffsets);
        const from = new Date(today);
        from.setUTCDate(from.getUTCDate() - maxOffset);
        const to = new Date(today);
        to.setUTCDate(to.getUTCDate() - minOffset);
        const fromISO = from.toISOString().slice(0, 10);
        const toISO = to.toISOString().slice(0, 10);

        const { data: invoices, error } = await (supabaseAdmin as any)
          .from("dojo_invoices")
          .select(
            "id, owner_id, description, amount, due_date, status, payment_link, asaas_invoice_url, asaas_pix_copypaste, student:dojo_students(id, full_name, email, status, cancelled_at)",
          )
          .in("status", ["pending", "overdue"])
          .gte("due_date", fromISO)
          .lte("due_date", toISO)
          .limit(2000);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        let sent = 0;
        let skipped = 0;
        let failed = 0;
        for (const inv of invoices ?? []) {
          const studentStatus = (inv as any).student?.status;
          if (studentStatus === "frozen" || studentStatus === "cancelled" || (inv as any).student?.cancelled_at) {
            skipped++;
            continue;
          }
          const due = new Date(`${inv.due_date}T00:00:00Z`);
          const diff = Math.round(
            (Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate(),
            ) -
              due.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          const amtSettings =
            settingsByOwner.get(inv.owner_id) ?? DEFAULT_REMINDER_SETTINGS;
          const prefs = prefsByOwner.get(inv.owner_id);

          // ----- Email (AMT Pay RemindersPanel) -----
          if (amtSettings.enabled && amtSettings.channels.email) {
            const rule = amtSettings.rules.find(
              (r) => r.enabled && r.offset_days === diff,
            );
            if (rule) {
              const result = await dispatchInvoiceReminder(supabaseAdmin as any, {
                invoice: inv as any,
                offsetDays: diff,
              });
              if (result.status === "sent") sent++;
              else if (result.status === "failed") failed++;
              else skipped++;
            }
          }

          // ----- Push (prefs unificadas) -----
          // Se o dono tem prefs configuradas, usamos elas; caso contrário,
          // usamos as regras do AMT Pay como fallback (canal push).
          let shouldPush = false;
          if (prefs) {
            if (diff < 0 && prefs.categories.invoice_due_soon) {
              const daysBefore = Math.abs(diff);
              shouldPush = prefs.dueSoonOffsets.includes(daysBefore);
            } else if (diff === 0 && prefs.categories.invoice_due_soon) {
              // "Vence hoje" — dispara se 0 estiver na lista OU se algum offset ≥1 estiver configurado
              shouldPush = prefs.dueSoonOffsets.includes(0);
            } else if (diff > 0 && prefs.categories.invoice_overdue) {
              shouldPush = diff % prefs.overdueFrequency === 0;
            }
          } else if (amtSettings.enabled && amtSettings.channels.push) {
            shouldPush = amtSettings.rules.some(
              (r) => r.enabled && r.offset_days === diff,
            );
          }

          if (shouldPush) {
            const result = await dispatchInvoicePushReminder(supabaseAdmin as any, {
              invoice: inv as any,
              offsetDays: diff,
            });
            if (result.status === "sent") sent++;
            else if (result.status === "failed") failed++;
            else skipped++;
          }
        }

        return Response.json({
          ok: true,
          today: todayISO,
          window: { from: fromISO, to: toISO },
          scanned: invoices?.length ?? 0,
          sent,
          skipped,
          failed,
        });
      },
    },
  },
});
