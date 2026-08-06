import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/debug-products')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // 1. Check table existence and columns
          const { data: cols, error: colError } = await supabaseAdmin.rpc('get_table_columns' as any, { table_name: 'products' });
          
          // 2. Count products with different status
          const { count: totalCount } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true });
          const { count: activeCount } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active');
          
          // 3. Test the exact query used in adminListStoreProducts
          // First, check which columns actually exist to avoid "column does not exist" errors
          const { data: sampleRow } = await supabaseAdmin.from('products').select('*').limit(1).maybeSingle();
          
          return new Response(JSON.stringify({ 
            success: true, 
            totalCount, 
            activeCount,
            sampleRow,
            columns: sampleRow ? Object.keys(sampleRow) : [],
            colError
          }), { 
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
