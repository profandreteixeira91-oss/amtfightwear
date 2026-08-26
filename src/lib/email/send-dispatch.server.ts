// Server-only: envia um template registrado via infraestrutura de e-mail gerenciada
// da Lovable e registra o resultado em email_send_log.
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

export interface DispatchTemplateEmailArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

export type DispatchTemplateEmailResult =
  | { success: true }
  | { success: false; reason: 'recipient_suppressed' }

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

export async function dispatchTemplateEmail(
  supabase: any,
  args: DispatchTemplateEmailArgs,
): Promise<DispatchTemplateEmailResult> {
  const { templateName, recipientEmail } = args

  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, {
      templateData: (args.templateData ?? {}) as Record<string, any>,
      ...(args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : {}),
    })

    if (!result.sent) {
      const { error } = await supabase.from('email_send_log').insert({
        template_name: templateName,
        recipient_email: recipientEmail,
        status: 'suppressed',
      })
      if (error) console.error('Failed to log suppressed email', { error })
      console.log('Email suppressed', {
        templateName,
        recipient_redacted: redactEmail(recipientEmail),
      })
      return { success: false, reason: 'recipient_suppressed' }
    }

    const { error } = await supabase.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: recipientEmail,
      status: 'sent',
    })
    if (error) console.error('Failed to log sent email', { error })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const { error } = await supabase.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: recipientEmail,
      status: 'failed',
      error_message: message.slice(0, 1000),
    })
    if (error) console.error('Failed to log failed email', { error })
    throw err
  }
}
