import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

type Outcome = {
  reason: 'bounce' | 'complaint' | 'unsubscribe'
  status: 'bounced' | 'complained' | 'suppressed'
  message: string
}

const OUTCOMES: Record<'bounced' | 'complaint' | 'unsubscribed', Outcome> = {
  bounced: {
    reason: 'bounce',
    status: 'bounced',
    message: 'Permanent bounce — email address is invalid or rejected',
  },
  complaint: {
    reason: 'complaint',
    status: 'complained',
    message: 'Spam complaint — recipient marked email as spam',
  },
  unsubscribed: {
    reason: 'unsubscribe',
    status: 'suppressed',
    message: 'Recipient unsubscribed',
  },
}

function serviceClient() {
  const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase server credentials')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

async function recordOutcome(
  kind: 'bounced' | 'complaint' | 'unsubscribed',
  event: { event_id: string; data: { recipient?: string } },
) {
  const recipient = event.data?.recipient
  if (!recipient) {
    console.warn('Email event without recipient', { event_id: event.event_id })
    return
  }

  const outcome = OUTCOMES[kind]
  const supabase = serviceClient()
  const normalizedEmail = recipient.toLowerCase()

  const { error: suppressError } = await supabase.from('suppressed_emails').upsert(
    { email: normalizedEmail, reason: outcome.reason, metadata: null },
    { onConflict: 'email' },
  )
  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      event_id: event.event_id,
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('Failed to write suppression')
  }

  const { error: insertError } = await supabase.from('email_send_log').insert({
    template_name: 'system',
    recipient_email: normalizedEmail,
    status: outcome.status,
    error_message: outcome.message,
    metadata: null,
  })
  if (insertError) {
    console.error('Failed to insert email_send_log', {
      event_id: event.event_id,
      code: insertError.code,
      message: insertError.message,
    })
    throw new Error('Failed to write send log')
  }
}

export const Route = createFileRoute('/lovable/email/events')({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await recordOutcome('bounced', event as any)
            },
            'email.complaint': async (event) => {
              await recordOutcome('complaint', event as any)
            },
            'email.unsubscribed': async (event) => {
              await recordOutcome('unsubscribed', event as any)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
