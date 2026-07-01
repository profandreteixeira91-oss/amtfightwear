import { createFileRoute } from '@tanstack/react-router'
import products from '@/data/amt-products.json'

export const Route = createFileRoute('/api/public/seed-products')({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const chunkSize = 100
        let inserted = 0
        for (let i = 0; i < products.length; i += chunkSize) {
          const chunk = products.slice(i, i + chunkSize)
          const { error, count } = await supabaseAdmin
            .from('products')
            .upsert(chunk, { onConflict: 'source_url', count: 'exact' })
          if (error) {
            return new Response(JSON.stringify({ ok: false, at: i, error: error.message }), { status: 500 })
          }
          inserted += count ?? chunk.length
        }
        return new Response(JSON.stringify({ ok: true, total: products.length, upserted: inserted }))
      },
    },
  },
})
