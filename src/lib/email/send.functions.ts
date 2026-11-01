import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const sendTransactionalEmailFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      templateName: string
      recipientEmail: string
      idempotencyKey?: string
      templateData?: Record<string, unknown>
    }) => data,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { dispatchTemplateEmail } = await import('./send-dispatch.server')
    return dispatchTemplateEmail(supabaseAdmin, data)
  })
