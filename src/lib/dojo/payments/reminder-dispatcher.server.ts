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

  // Verifica suppression list.
  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("id")
    .eq("email", recipient.toLowerCase())
    .maybeSingle();
  if (suppressed) {
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

  // Renderiza template.
  const element = React.createElement(reminderTemplate.component as any, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof reminderTemplate.subject === "function"
      ? reminderTemplate.subject(templateData)
      : reminderTemplate.subject;

  // Prepara token de unsubscribe (uma vez por email).
  const normalizedEmail = recipient.toLowerCase();
  let unsubscribeToken: string | null = null;
  const { data: existingToken } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token;
  } else if (!existingToken) {
    unsubscribeToken = generateToken();
    await supabase
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: stored } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalizedEmail)
      .maybeSingle();
    unsubscribeToken = stored?.token ?? unsubscribeToken;
  } else {
    await supabase.from("dojo_invoice_reminders").insert({
      owner_id: invoice.owner_id,
      invoice_id: invoice.id,
      offset_days: offsetDays,
      channel,
      status: "skipped",
      error_message: "unsubscribed",
    });
    return { status: "skipped", reason: "unsubscribed" };
  }

  const messageId = crypto.randomUUID();
  const idempotencyKey = `dojo-reminder-${invoice.id}-${offsetDays}-${channel}`;

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "dojo-invoice-reminder",
    recipient_email: recipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${dojoName} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: "dojo-invoice-reminder",
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await supabase.from("dojo_invoice_reminders").insert({
      owner_id: invoice.owner_id,
      invoice_id: invoice.id,
      offset_days: offsetDays,
      channel,
      status: "failed",
      error_message: enqueueError.message,
      message_id: messageId,
    });
    return { status: "failed", reason: enqueueError.message };
  }

  // Registra o disparo (idempotência garantida pela unique index).
  const { error: logErr } = await supabase.from("dojo_invoice_reminders").insert({
    owner_id: invoice.owner_id,
    invoice_id: invoice.id,
    offset_days: offsetDays,
    channel,
    status: "sent",
    message_id: messageId,
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
