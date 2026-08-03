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

const QueueRequestSchema = z.object({
  queue_id: z.string().uuid().optional(),
})

export const Route = createFileRoute('/api/public/macro-dm/next-task')({
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
          const { queue_id } = QueueRequestSchema.parse(body)

          const supabase = getServiceClient()

          // 1. Encontrar uma fila em execução (ou a específica solicitada)
          let query = supabase
            .from('macro_dm_queues')
            .select('id, name, owner_id')
            .eq('status', 'executing')
          
          if (queue_id) {
            query = query.eq('id', queue_id)
          }

          const { data: queue, error: qError } = await query.maybeSingle()

          if (qError || !queue) {
            return new Response(JSON.stringify({ error: 'no_active_queue' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
          }

          // 2. Pegar o próximo item pendente da fila
          const { data: item, error: iError } = await supabase
            .from('macro_dm_queue_items')
            .select(`
              id, 
              status,
              lead:prospect_companies (
                id,
                name,
                instagram:prospect_contacts!inner(value)
              )
            `)
            .eq('queue_id', queue.id)
            .eq('status', 'pending')
            .eq('prospect_contacts.channel', 'instagram')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (iError || !item) {
            // Se não há mais itens, marca a fila como finalizada
            await supabase.from('macro_dm_queues').update({ status: 'completed' }).eq('id', queue.id)
            return new Response(JSON.stringify({ status: 'completed' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
          }

          // 3. Marcar item como em processamento (ou sucesso logo, a extensão reportará)
          // Para simplificar o fluxo inicial da extensão, vamos retornar o lead
          const leadData = item.lead as any
          const instagram = leadData.instagram?.[0]?.value || leadData.instagram

          return new Response(JSON.stringify({
            task_id: item.id,
            queue_id: queue.id,
            lead_id: leadData.id,
            lead_name: leadData.name,
            instagram: instagram,
            action: 'send_dm'
          }), {
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
