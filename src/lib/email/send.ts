import { sendTransactionalEmailFn } from './send.functions'

export interface SendTransactionalArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

export async function sendTransactionalEmail(args: SendTransactionalArgs) {
  return sendTransactionalEmailFn({ data: args }) as Promise<{
    success: boolean
    reason?: string
  }>
}
