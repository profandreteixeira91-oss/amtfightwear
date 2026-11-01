import * as React from 'react'
import { render } from '@react-email/render'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendEmail } from '@/lib/email/provider.server'
import { TEMPLATES } from './registry'

// Server-only: reads RESEND_API_KEY. Never import from client components.

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; omitted means no dedupe. */
  idempotencyKey?: string
  replyTo?: string
}

/** Destinatários que deram bounce/reclamação (gravados por /api/public/hooks/email-events). */
async function isSuppressed(email: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) console.error('suppressed_emails lookup failed', { code: error.code })
  return !!data
}

/**
 * Renders a registered template and sends it through Resend. A suppressed
 * recipient is an expected outcome ({ sent: false }); any other failure
 * throws — EmailSendError exposes .status and .retryable for branching.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }
  if (await isSuppressed(recipient)) return { sent: false, reason: 'recipient_suppressed' }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  await sendEmail({
    to: recipient,
    subject,
    html,
    text,
    replyTo: options.replyTo,
    idempotencyKey: options.idempotencyKey,
    tag: templateName,
  })

  return { sent: true }
}
