import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

export type StoreCustomer = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  type: "registered" | "lead" | "guest";
  orders_count: number;
  paid_count: number;
  total_spent: number;
  last_order_at: string | null;
  abandoned_carts_count: number;
};

export const adminListStoreCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin.rpc("get_store_customers_unified");

    if (error) throw new Error(error.message);
    return (data || []) as StoreCustomer[];
  });

export const adminGetCustomerDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Dados básicos
    const { data: customers, error: custError } = await supabaseAdmin.rpc("get_store_customers_unified");
    if (custError) throw new Error(custError.message);
    
    const customer = (customers as StoreCustomer[]).find(c => c.id === data.id);
    if (!customer) throw new Error("Cliente não encontrado");

    // 2. Histórico de Pedidos
    const isGuest = data.id.startsWith("guest:");
    const isChat = data.id.startsWith("chat:");
    
    let ordersQuery = supabaseAdmin.from("store_orders").select("*").order("created_at", { ascending: false });
    if (isGuest) {
      ordersQuery = ordersQuery.eq("customer_email", data.id.replace("guest:", ""));
    } else if (isChat) {
      if (customer.email) ordersQuery = ordersQuery.eq("customer_email", customer.email);
      else return { customer, orders: [], carts: [], conversations: [] };
    } else {
      ordersQuery = ordersQuery.eq("user_id", data.id);
    }
    const { data: orders } = await ordersQuery;

    // 3. Carrinhos
    let cartsQuery = supabaseAdmin.from("store_carts").select("*, store_cart_items(*)").order("created_at", { ascending: false });
    if (isChat) {
      const extId = data.id.replace("chat:", "");
      const { data: conv } = await supabaseAdmin.from("sales_conversations").select("id").eq("external_id", extId).maybeSingle();
      if (conv) cartsQuery = cartsQuery.eq("conversation_id", conv.id);
      else cartsQuery = cartsQuery.limit(0);
    } else if (!isGuest) {
      cartsQuery = cartsQuery.eq("user_id", data.id);
    } else {
      cartsQuery = cartsQuery.limit(0);
    }
    const { data: carts } = await cartsQuery;

    // 4. Conversas de Chat
    let convsQuery = supabaseAdmin.from("sales_conversations").select("*").order("last_message_at", { ascending: false });
    if (isChat) {
      convsQuery = convsQuery.eq("external_id", data.id.replace("chat:", ""));
    } else if (customer.email) {
      convsQuery = convsQuery.eq("customer_email", customer.email);
    } else {
      convsQuery = convsQuery.limit(0);
    }
    const { data: conversations } = await convsQuery;

    return {
      customer,
      orders: orders ?? [],
      carts: carts ?? [],
      conversations: conversations ?? [],
    };
  });
