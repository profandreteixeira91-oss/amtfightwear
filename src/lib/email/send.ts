import { supabase } from '@/integrations/supabase/client'

export interface SendTransactionalArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

export async function sendTransactionalEmail(args: SendTransactionalArgs) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (json as { error?: string })?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json as { success?: boolean; messageId?: string }
}
