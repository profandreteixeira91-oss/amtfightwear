import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOrdersForFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    
    // Fetch orders that don't have an invoice yet (or let user select any)
    // Fetch orders
    const { data: orders, error: ordersError } = await s
      .from('orders')
      .select('id, total, status, placed_at, order_number, customers(full_name)')
      .order('placed_at', { ascending: false })
      .limit(20);
    
    // Fetch quotes (orçamentos) to include as potential orders for emission
    const { data: quotes, error: quotesError } = await s
      .from('store_quotes')
      .select('id, total, status, created_at, quote_number, customer_name')
      .eq('status', 'accepted') // Only accepted quotes should be invoiced
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (ordersError) throw new Error(ordersError.message);
    
    const formattedOrders = (orders || []).map((o: any) => ({
      id: o.id,
      type: 'order',
      number: o.order_number || o.id.slice(0, 8),
      customer: o.customers?.full_name || 'Consumidor',
      total: Number(o.total),
      date: o.placed_at
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
