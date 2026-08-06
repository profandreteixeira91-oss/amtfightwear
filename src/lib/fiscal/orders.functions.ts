import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOrdersForFiscal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    
    // Fetch orders that don't have an invoice yet (or let user select any)
    const { data: orders, error } = await s
      .from('orders')
      .select('id, total, status, placed_at, order_number, customers(full_name)')
      .order('placed_at', { ascending: false })
      .limit(20);
    
    if (error) throw new Error(error.message);
    
    return orders.map((o: any) => ({
      id: o.id,
      number: o.order_number || o.id.slice(0, 8),
      customer: o.customers?.full_name || 'Consumidor',
      total: Number(o.total),
      date: o.placed_at
    }));
  });
