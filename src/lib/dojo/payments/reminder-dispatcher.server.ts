// Server-only: dispara um lembrete de fatura via e-mail gerenciado da Lovable.
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const FROM_DOMAIN = "amtfightwear.com.br";
void FROM_DOMAIN;


function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export type ReminderInvoice = {
  id: string;
  owner_id: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: string;
  payment_link: string | null;
  asaas_invoice_url: string | null;
  asaas_pix_copypaste: string | null;
  student: { id?: string; full_name: string | null; email: string | null } | null;
};

export async function dispatchInvoiceReminder(
  supabase: any,
  args: {
    invoice: ReminderInvoice;
    offsetDays: number;
    channel?: "email";
    manual?: boolean;
    dojoName?: string;
  },
): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string }> {
  const { invoice, offsetDays } = args;
  const channel = args.channel ?? "email";

  const recipient = invoice.student?.email?.trim();
  if (!recipient) return { status: "skipped", reason: "no_email" };

  // Idempotência: pula se já enviamos para (invoice, offset, channel).
  const { data: existing } = await supabase
    .from("dojo_invoice_reminders")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("offset_days", offsetDays)
    .eq("channel", channel)
    .maybeSingle();
  if (existing) return { status: "skipped", reason: "already_sent" };

  // Descobre nome do dojo — prioriza a identidade personalizada no AMT Pay.
  let dojoName = args.dojoName ?? "Sua academia";
  if (!args.dojoName) {
    const { loadInvoiceIdentity } = await import("@/lib/dojo/invoice-branding.functions");
    const identity = await loadInvoiceIdentity(supabase, invoice.owner_id);
    if (identity?.name) dojoName = identity.name;
  }

  const templateData = {
    studentName: invoice.student?.full_name ?? "aluno(a)",
    dojoName,
    amount: formatBRL(Number(invoice.amount)),
    dueDate: formatDateBR(invoice.due_date),
    daysOffset: offsetDays,
    paymentLink:
      invoice.payment_link ?? invoice.asaas_invoice_url ?? undefined,
    pixCopyPaste: invoice.asaas_pix_copypaste ?? undefined,
    invoiceDescription: invoice.description ?? "Mensalidade",
  };

  const idempotencyKey = `dojo-reminder-${invoice.id}-${offsetDays}-${channel}`;

  let result: { sent: boolean; reason?: string };
  try {
    result = await sendTemplateEmail("dojo-invoice-reminder", recipient, {
      templateData,
      idempotencyKey,
    });
  } catch (err: any) {
    const message = String(err?.message ?? err);
    await supabase.from("email_send_log").insert({
      template_name: "dojo-invoice-reminder",
      recipient_email: recipient,
      status: "failed",
      error_message: message.slice(0, 1000),
    });
    await supabase.from("dojo_invoice_reminders").insert({
      owner_id: invoice.owner_id,
      invoice_id: invoice.id,
      offset_days: offsetDays,
      channel,
      status: "failed",
      error_message: message,
    });
    return { status: "failed", reason: message };
  }

  if (!result.sent) {
    await supabase.from("email_send_log").insert({
      template_name: "dojo-invoice-reminder",
      recipient_email: recipient,
      status: "suppressed",
    });
    await supabase.from("dojo_invoice_reminders").insert({
      owner_id: invoice.owner_id,
      invoice_id: invoice.id,
      offset_days: offsetDays,
      channel,
      status: "skipped",
      error_message: "recipient_suppressed",
    });
    return { status: "skipped", reason: "recipient_suppressed" };
  }

  await supabase.from("email_send_log").insert({
    template_name: "dojo-invoice-reminder",
    recipient_email: recipient,
    status: "sent",
  });

  // Registra o disparo (idempotência garantida pela unique index).
  const { error: logErr } = await supabase.from("dojo_invoice_reminders").insert({
    owner_id: invoice.owner_id,
    invoice_id: invoice.id,
    offset_days: offsetDays,
    channel,
    status: "sent",
  });
  if (logErr && !logErr.message.includes("duplicate")) {
    console.warn("[reminders] falha ao logar envio", logErr);
  }

  return { status: "sent" };
}


// ---------- Push (Web Push) ----------
export async function dispatchInvoicePushReminder(
  supabase: any,
  args: { invoice: ReminderInvoice; offsetDays: number; manual?: boolean },
): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string }> {
  const { invoice, offsetDays } = args;
  const channel = "push" as const;
  const studentId = invoice.student?.id;
  if (!studentId) return { status: "skipped", reason: "no_student_id" };

  // Idempotência
  const { data: existing } = await supabase
    .from("dojo_invoice_reminders")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("offset_days", offsetDays)
    .eq("channel", channel)
    .maybeSingle();
  if (existing) return { status: "skipped", reason: "already_sent" };

  // Verifica se o aluno tem alguma inscrição push ativa
  const { data: subs } = await supabase
    .from("dojo_push_subscriptions")
    .select("id")
    .eq("student_id", studentId)
    .limit(1);
  if (!subs || subs.length === 0) {
    await supabase.from("dojo_invoice_reminders").insert({
      owner_id: invoice.owner_id,
      invoice_id: invoice.id,
      offset_days: offsetDays,
      channel,
      status: "skipped",
      error_message: "no_push_subscription",
    });
    return { status: "skipped", reason: "no_push_subscription" };
  }

  const amount = formatBRL(Number(invoice.amount));
  const due = formatDateBR(invoice.due_date);
  let title = "Lembrete de mensalidade";
  let body = "";
  if (offsetDays < 0) {
    const d = Math.abs(offsetDays);
    title = `Sua mensalidade vence em ${d} dia${d > 1 ? "s" : ""}`;
    body = `${invoice.description ?? "Mensalidade"} — ${amount} · vencimento ${due}`;
  } else if (offsetDays === 0) {
    title = "Sua mensalidade vence hoje";
    body = `${invoice.description ?? "Mensalidade"} — ${amount}`;
  } else {
    title = `Mensalidade em atraso há ${offsetDays} dia${offsetDays > 1 ? "s" : ""}`;
    body = `${invoice.description ?? "Mensalidade"} — ${amount} · vencia em ${due}`;
  }

  try {
    const { sendPushToStudent } = await import("@/lib/push/push.server");
    await sendPushToStudent(studentId, {
      title,
      body,
      url: `/app/invoice/${invoice.id}`,
      tag: `invoice-${invoice.id}`,
      data: { invoiceId: invoice.id, offsetDays },
    }, offsetDays > 0 ? "invoice_overdue" : "invoice_due_soon");
  } catch (err: any) {
    await supabase.from("dojo_invoice_reminders").insert({
      owner_id: invoice.owner_id,
      invoice_id: invoice.id,
      offset_days: offsetDays,
      channel,
      status: "failed",
      error_message: String(err?.message ?? err),
    });
    return { status: "failed", reason: String(err?.message ?? err) };
  }

  const { error: logErr } = await supabase.from("dojo_invoice_reminders").insert({
    owner_id: invoice.owner_id,
    invoice_id: invoice.id,
    offset_days: offsetDays,
    channel,
    status: "sent",
  });
  if (logErr && !logErr.message.includes("duplicate")) {
    console.warn("[reminders] falha ao logar envio push", logErr);
  }
  return { status: "sent" };
}
