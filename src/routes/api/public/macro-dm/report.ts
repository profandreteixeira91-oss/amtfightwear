import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const getServiceClient = () => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

const LogSchema = z.object({
  queue_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  level: z.enum(['info', 'success', 'warning', 'error']),
  message: z.string(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const Route = createFileRoute('/api/public/macro-dm/report')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }

        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: corsHeaders })
        }

        try {
          const body = await request.json()
          const data = LogSchema.parse(body)
          const supabase = getServiceClient()

          // 1. Buscar a fila para pegar o owner_id e nome
          const { data: queue } = await supabase
            .from('macro_dm_queues')
            .select('owner_id, name')
            .eq('id', data.queue_id)
            .single()

          if (!queue) throw new Error('Queue not found')

          // 2. Inserir log
          await supabase.from('macro_dm_logs').insert({
            owner_id: queue.owner_id,
            queue_id: data.queue_id,
            queue_name: queue.name,
            level: data.level,
            message: data.message,
            metadata: data.metadata
          })

          // 3. Se for sucesso, atualizar contador na fila e status do item
          if (data.level === 'success' && data.task_id) {
            await supabase.from('macro_dm_queue_items')
              .update({ status: 'completed', processed_at: new Date().toISOString() })
              .eq('id', data.task_id)

            // Incrementa processed_leads na fila
            const { data: qNow } = await supabase
              .from('macro_dm_queues')
              .select('processed_leads')
              .eq('id', data.queue_id)
              .single()
            
            await supabase.from('macro_dm_queues')
              .update({ processed_leads: (qNow?.processed_leads || 0) + 1 })
              .eq('id', data.queue_id)
          } else if (data.level === 'error' && data.task_id) {
            await supabase.from('macro_dm_queue_items')
              .update({ status: 'failed' })
              .eq('id', data.task_id)
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
      }
    }
  }
})
