import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/test-fiscal-schema')({
  server: {
    handlers: {
      POST: async () => {
        try {
          // Tenta ler a coluna quote_id para ver se ela existe no schema atual do banco
          const { data, error } = await supabaseAdmin
            .from('fiscal_invoices')
            .select('id, quote_id')
            .limit(1);
          
          if (error) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: error.message,
              hint: error.hint,
              details: error.details
            }), { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
})
