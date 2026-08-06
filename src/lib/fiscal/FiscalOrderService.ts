import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingOrigin = "store_order" | "quote";

export interface BillingOrder {
  id: string;
  number: string;
  type: BillingOrigin;
  customer_name: string;
  customer_document: string;
  city: string;
  state: string;
  date: string;
  total: number;
  item_count: number;
  payment_method: string | null;
  payment_status: string;
  production_status?: string;
  fiscal_status: "pending" | "validating" | "ready" | "emitting" | "authorized" | "cancelled" | "error" | "rejected";
  responsible?: string;
  sales_channel: string;
}

export const listBillingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;

    const [ordersRes, quotesRes, fiscalRes] = await Promise.all([
      sb.from("store_orders")
        .select("id, order_number, customer_name, customer_document, shipping_address, created_at, total, payment_method, payment_status, status, metadata")
        .order("created_at", { ascending: false })
        .limit(100),
      sb.from("quotes")
        .select("id, quote_number, customer_name, customer_document, city, state, created_at, total_amount, status, created_by")
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(100),
      sb.from("fiscal_invoices").select("order_id, status, type")
    ]);

    const fiscalMap = new Map<string, string>();
    (fiscalRes.data ?? []).forEach((inv: any) => {
      fiscalMap.set(inv.order_id, inv.status);
    });

    const billingOrders: BillingOrder[] = [];

    // Map store orders
    (ordersRes.data ?? []).forEach((o: any) => {
      const addr = o.shipping_address as any;
      billingOrders.push({
        id: o.id,
        number: String(o.order_number),
        type: "store_order",
        customer_name: o.customer_name,
        customer_document: o.customer_document ?? "",
        city: addr?.city ?? "",
        state: addr?.state ?? "",
        date: o.created_at,
        total: o.total,
        item_count: 0, 
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        production_status: o.status,
        fiscal_status: (fiscalMap.get(o.id) as any) ?? "pending",
        sales_channel: (o.metadata as any)?.wholesale ? "Atacado" : "Loja Online"
      });
    });

    // Map quotes
    (quotesRes.data ?? []).forEach((q: any) => {
      billingOrders.push({
        id: q.id,
        number: String(q.quote_number),
        type: "quote",
        customer_name: q.customer_name,
        customer_document: q.customer_document ?? "",
        city: q.city ?? "",
        state: q.state ?? "",
        date: q.created_at,
        total: q.total_amount,
        item_count: 0,
        payment_method: "Orçamento",
        payment_status: q.status,
        fiscal_status: (fiscalMap.get(q.id) as any) ?? "pending",
        sales_channel: "Venda Consultiva"
      });
    });

    return billingOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
