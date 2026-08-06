import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOrdersForFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    
    // Fetch orders from store_orders
    const { data: orders, error: ordersError } = await s
      .from('store_orders')
      .select('id, total, status, created_at, order_number, customer_name')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Fetch quotes (orçamentos) from store_quotes
    const { data: quotes, error: quotesError } = await s
      .from('store_quotes')
      .select('id, total, status, created_at, quote_number, customer_name')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (ordersError && ordersError.code !== 'PGRST116') console.error('Orders error:', ordersError);
    if (quotesError && quotesError.code !== 'PGRST116') console.error('Quotes error:', quotesError);
    
    const formattedOrders = (orders || []).map((o: any) => ({
      id: o.id,
      type: 'order',
      number: o.order_number || o.id.slice(0, 8),
      customer: o.customer_name || 'Consumidor',
      total: Number(o.total),
      date: o.created_at
    }));

    const formattedQuotes = (quotes || []).map((q: any) => ({
      id: q.id,
      type: 'quote',
      number: `ORC-${q.quote_number || q.id.slice(0, 6)}`,
      customer: q.customer_name || 'Consumidor',
      total: Number(q.total),
      date: q.created_at
    }));
    
    return [...formattedOrders, ...formattedQuotes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });
