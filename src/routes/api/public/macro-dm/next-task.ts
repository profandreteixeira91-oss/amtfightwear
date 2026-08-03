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
            .select('id, name, owner_id, status')
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

          // 2. Verificar se a fila está pausada ou cancelada
          if (queue.status === 'paused' || queue.status === 'canceled') {
            return new Response(JSON.stringify({ 
              status: queue.status, 
              message: `Fila ${queue.status === 'paused' ? 'pausada' : 'cancelada'} pelo administrador` 
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
          }

          // 3. Pegar o próximo item pendente ou em execução (para retry se a extensão reiniciou)
          // Mas prioriza pendentes
          const { data: item, error: iError } = await supabase
            .from('macro_dm_queue_items')
            .select(`
              id, 
              status,
              lead:prospect_companies (
                id,
                name
              )
            `)
            .eq('queue_id', queue.id)
            .in('status', ['pending', 'executing'])
            .order('status', { ascending: false }) // 'pending' (p) vem antes de 'executing' (e) se usarmos descending? Não, 'pending' > 'executing' alfabeticamente? p > e. Sim.
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (iError || !item) {
            // Se não há mais itens e todos estão concluídos ou falharam
            const { count: pendingCount } = await supabase
              .from('macro_dm_queue_items')
              .select('id', { count: 'exact', head: true })
              .eq('queue_id', queue.id)
              .in('status', ['pending', 'executing'])
            
            if (!pendingCount || pendingCount === 0) {
              await supabase.from('macro_dm_queues').update({ status: 'completed' }).eq('id', queue.id)
              return new Response(JSON.stringify({ status: 'completed' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              })
            }

            // Se ainda tem itens mas por algum motivo maybeSingle veio vazio, retorna retry
            return new Response(JSON.stringify({ status: 'waiting', message: 'Aguardando sincronização de tarefas...' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            })
          }

          // Se estava pendente, marca como em execução
          if (item.status === 'pending') {
            await supabase.from('macro_dm_queue_items')
              .update({ status: 'executing' })
              .eq('id', item.id)
          }

          // Marca o item como em execução para não ser pego por outra instância/chamada
          await supabase.from('macro_dm_queue_items')
            .update({ status: 'executing' })
            .eq('id', item.id)

          // 4. Buscar o Instagram separadamente
          const leadId = (item.lead as any).id;
          const { data: contact } = await supabase
            .from('prospect_contacts')
            .select('value')
            .eq('company_id', leadId)
            .eq('channel', 'instagram')
            .maybeSingle();

          const leadData = item.lead as any
          let instagram = contact?.value || '';

          // Limpeza do handle do Instagram para garantir que a extensão consiga abrir o link
          if (instagram) {
            instagram = instagram.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '')
                                .replace(/\/$/, '')
                                .replace(/^@/, '');
          }

          if (!instagram || instagram === 'pendente') {
            // Se não tem Instagram válido, marca como falha e continua
            await supabase.from('macro_dm_queue_items').update({ status: 'failed' }).eq('id', item.id);
            await supabase.from('macro_dm_logs').insert({
              owner_id: queue.owner_id,
              queue_id: queue.id,
              queue_name: queue.name,
              level: 'warning',
              message: `Lead ${leadData.name} pulado: Instagram não encontrado ou inválido.`
            });
            
            // Retorna um status que a extensão pode usar para pedir o próximo imediatamente
            return new Response(JSON.stringify({ 
              error: 'invalid_instagram', 
              lead_name: leadData.name,
              should_continue: true 
            }), {
              status: 200, // Alterado para 200 para não interromper o fluxo da extensão
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }

          return new Response(JSON.stringify({
            task_id: item.id,
            queue_id: queue.id,
            lead_id: leadData.id,
            lead_name: leadData.name,
            instagram: instagram,
            action: 'send_dm',
            instagram_url: `https://www.instagram.com/${instagram}/`
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
