// Cron diário — dispara lembretes de mensalidade conforme as regras do dono.
import { createFileRoute } from "@tanstack/react-router";
import {
  DEFAULT_REMINDER_SETTINGS,
  type ReminderSettings,
} from "@/lib/dojo/reminders.functions";

function readReminderSettings(row: any): ReminderSettings {
  const stored = (row?.extras ?? {}).reminders as
    | Partial<ReminderSettings>
    | undefined;
  if (!stored) return DEFAULT_REMINDER_SETTINGS;
  return {
    enabled: stored.enabled ?? DEFAULT_REMINDER_SETTINGS.enabled,
    channels: {
      email: stored.channels?.email ?? true,
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

export const Route = createFileRoute("/api/public/hooks/send-dojo-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { dispatchInvoiceReminder } = await import(
          "@/lib/dojo/payments/reminder-dispatcher.server"
        );

        // Carrega settings de todos os owners que têm configuração.
        const { data: settingsRows } = await (supabaseAdmin as any)
          .from("dojo_payment_settings")
          .select("owner_id, extras");

        const settingsByOwner = new Map<string, ReminderSettings>();
        for (const row of settingsRows ?? []) {
          settingsByOwner.set(row.owner_id, readReminderSettings(row));
        }

        // Descobre a janela de datas a inspecionar (min/max offsets configurados no sistema).
        // Se nenhum owner tiver regras, usa defaults.
        const universe = Array.from(settingsByOwner.values());
        const allOffsets = new Set<number>();
        (universe.length ? universe : [DEFAULT_REMINDER_SETTINGS]).forEach((s) => {
          if (!s.enabled) return;
          s.rules.filter((r) => r.enabled).forEach((r) => allOffsets.add(r.offset_days));
        });
        // Default para dojos sem settings salvo: usa defaults do sistema.
        DEFAULT_REMINDER_SETTINGS.rules
          .filter((r) => r.enabled)
          .forEach((r) => allOffsets.add(r.offset_days));

        if (allOffsets.size === 0) {
          return Response.json({ ok: true, sent: 0, skipped: 0, reason: "no_rules" });
        }

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const minOffset = Math.min(...allOffsets);
        const maxOffset = Math.max(...allOffsets);
        const from = new Date(today);
        from.setUTCDate(from.getUTCDate() - maxOffset); // vencidos há maxOffset dias
        const to = new Date(today);
        to.setUTCDate(to.getUTCDate() - minOffset); // ainda por vencer em -minOffset dias
        const fromISO = from.toISOString().slice(0, 10);
        const toISO = to.toISOString().slice(0, 10);

        const { data: invoices, error } = await (supabaseAdmin as any)
          .from("dojo_invoices")
          .select(
            "id, owner_id, description, amount, due_date, status, payment_link, asaas_invoice_url, asaas_pix_copypaste, student:dojo_students(full_name, email)",
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

          const settings =
            settingsByOwner.get(inv.owner_id) ?? DEFAULT_REMINDER_SETTINGS;
          if (!settings.enabled || !settings.channels.email) {
            skipped++;
            continue;
          }
          const rule = settings.rules.find(
            (r) => r.enabled && r.offset_days === diff,
          );
          if (!rule) {
            skipped++;
            continue;
          }

          const result = await dispatchInvoiceReminder(supabaseAdmin as any, {
            invoice: inv as any,
            offsetDays: diff,
          });
          if (result.status === "sent") sent++;
          else if (result.status === "failed") failed++;
          else skipped++;
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
