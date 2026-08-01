import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dayISO } from "@/lib/dates";

const RangeSchema = z.object({
  range: z.enum(["today", "yesterday", "7d", "30d", "90d", "year"]).default("30d"),
});

function rangeToDates(range: string) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "year":
      start.setDate(start.getDate() - 365);
      break;
    case "30d":
    default:
      start.setDate(start.getDate() - 30);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export const adminGetDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RangeSchema.parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertSaasOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const iso = (d: Date) => d.toISOString();
    const { start: rangeStart, end: rangeEnd } = rangeToDates(data.range);

    // Orders in range
    const { data: ordersRange } = await supabaseAdmin
      .from("store_orders")
      .select("id, order_number, customer_name, customer_email, shipping_address, total, subtotal, shipping_cost, discount, status, payment_status, payment_method, created_at")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd)
      .order("created_at", { ascending: false })
      .limit(2000);

    // Today
    const { data: ordersToday } = await supabaseAdmin
      .from("store_orders")
      .select("id, total, payment_status")
      .gte("created_at", iso(startOfToday));

    // Yesterday
    const { data: ordersYesterday } = await supabaseAdmin
      .from("store_orders")
      .select("id, total, payment_status")
      .gte("created_at", iso(startOfYesterday))
      .lt("created_at", iso(startOfToday));

    const paid = <T extends { payment_status?: string | null }>(arr: T[]): T[] =>
      arr.filter((o) => o.payment_status === "paid" || o.payment_status === "approved");

    const sum = <T extends { total: number | string }>(arr: T[]) => arr.reduce((a, b) => a + Number(b.total || 0), 0);

    const revenueToday = sum(paid(ordersToday ?? []));
    const revenueYesterday = sum(paid(ordersYesterday ?? []));
    const growth = revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : revenueToday > 0 ? 100 : 0;

    const ordersTodayCount = (ordersToday ?? []).length;
    const ordersTodayValue = sum(ordersToday ?? []);
    const avgTicket = ordersTodayCount > 0 ? ordersTodayValue / ordersTodayCount : 0;

    // Status breakdown (range)
    const statusMap = new Map<string, { count: number; value: number }>();
    for (const o of ordersRange ?? []) {
      const s = o.status || "pending";
      const cur = statusMap.get(s) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += Number(o.total || 0);
      statusMap.set(s, cur);
    }
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v }));

    // Payment status breakdown
    const payMap = new Map<string, { count: number; value: number }>();
    for (const o of ordersRange ?? []) {
      const s = o.payment_status || "pending";
      const cur = payMap.get(s) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += Number(o.total || 0);
      payMap.set(s, cur);
    }
    const paymentBreakdown = Array.from(payMap.entries()).map(([status, v]) => ({ status, ...v }));

    // Financial summary (range, paid only)
    const paidRange = paid(ordersRange ?? []);
    const grossRevenue = paidRange.reduce((a, b) => a + Number(b.subtotal || 0), 0);
    const shippingTotal = paidRange.reduce((a, b) => a + Number(b.shipping_cost || 0), 0);
    const discountsTotal = paidRange.reduce((a, b) => a + Number(b.discount || 0), 0);
    const netRevenue = paidRange.reduce((a, b) => a + Number(b.total || 0), 0);

    // Daily series (range)
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of ordersRange ?? []) {
      const d = dayISO(o.created_at);
      const cur = dailyMap.get(d) ?? { revenue: 0, orders: 0 };
      cur.orders += 1;
      if (o.payment_status === "paid" || o.payment_status === "approved") cur.revenue += Number(o.total || 0);
      dailyMap.set(d, cur);
    }
    const dailySeries = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }));

    // Top products (from order_items in range)
    const orderIds = (ordersRange ?? []).map((o) => o.id);
    let topProducts: { product_id: string; name: string; sku: string | null; image_url: string | null; qty: number; revenue: number }[] = [];
    let salesByCategory: { category: string; qty: number; revenue: number }[] = [];
    if (orderIds.length > 0) {
      const { data: items } = await supabaseAdmin
        .from("store_order_items")
        .select("product_id, product_name, sku, image_url, quantity, total_price")
        .in("order_id", orderIds);

      const productMap = new Map<string, { name: string; sku: string | null; image_url: string | null; qty: number; revenue: number }>();
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        const cur = productMap.get(it.product_id) ?? { name: it.product_name || "", sku: it.sku, image_url: it.image_url, qty: 0, revenue: 0 };
        cur.qty += it.quantity || 0;
        cur.revenue += Number(it.total_price || 0);
        productMap.set(it.product_id, cur);
      }
      topProducts = Array.from(productMap.entries())
        .map(([product_id, v]) => ({ product_id, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // sales by category — fetch categories for those products
      const pids = Array.from(productMap.keys());
      if (pids.length > 0) {
        const { data: prods } = await supabaseAdmin
          .from("products")
          .select("id, category")
          .in("id", pids);
        const catMap = new Map<string, { qty: number; revenue: number }>();
        const pidToCat = new Map<string, string>((prods ?? []).map((p) => [p.id, p.category || "Outros"]));
        for (const [pid, v] of productMap) {
          const c = pidToCat.get(pid) || "Outros";
          const cur = catMap.get(c) ?? { qty: 0, revenue: 0 };
          cur.qty += v.qty;
          cur.revenue += v.revenue;
          catMap.set(c, cur);
        }
        salesByCategory = Array.from(catMap.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.revenue - a.revenue);
      }
    }

    // Receita de produção finalizada (fila de produção -> financeiro)
    const { data: financeEntries } = await supabaseAdmin
      .from("store_finance_entries")
      .select("id, reference, description, customer_name, quantity, amount, occurred_at, source")
      .gte("occurred_at", rangeStart)
      .lte("occurred_at", rangeEnd)
      .order("occurred_at", { ascending: false })
      .limit(2000);
    const productionRevenue = (financeEntries ?? []).reduce((a, b) => a + Number(b.amount || 0), 0);

    // Low stock
    const { data: lowStock } = await supabaseAdmin
      .from("products")
      .select("id, name, sku, stock, image_url, price")
      .lte("stock", 5)
      .eq("status", "active")
      .order("stock", { ascending: true })
      .limit(10);

    // Recent orders (10)
    const recentOrders = (ordersRange ?? []).slice(0, 10).map((o) => {
      const addr = (o.shipping_address as { city?: string; state?: string } | null) || null;
      return {
        id: o.id,
        order_number: o.order_number,
        customer: o.customer_name || o.customer_email || "—",
        city: addr?.city ? `${addr.city}${addr.state ? "/" + addr.state : ""}` : "—",
        total: Number(o.total || 0),
        status: o.status,
        payment_status: o.payment_status,
        payment_method: o.payment_method,
        created_at: o.created_at,
      };
    });

    // Visitors — active in last 5 minutes
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { data: activeVisits } = await supabaseAdmin
      .from("store_visits")
      .select("session_id, path, created_at")
      .gte("created_at", fiveMinAgo)
      .limit(2000);
    const activeSessions = new Set<string>();
    let checkoutNow = 0;
    let productViewsNow = 0;
    let categoryViewsNow = 0;
    for (const v of activeVisits ?? []) {
      activeSessions.add(v.session_id);
      const p = (v.path || "").toLowerCase();
      if (p.includes("checkout") || p.includes("carrinho")) checkoutNow++;
      else if (p.includes("/produto") || p.includes("/loja/produto")) productViewsNow++;
      else if (p.includes("/categoria")) categoryViewsNow++;
    }

    // Traffic sources (last 30 days)
    const { data: referrers } = await supabaseAdmin
      .from("store_visits")
      .select("referrer")
      .gte("created_at", rangeStart)
      .limit(50000);
    const srcMap = new Map<string, number>();
    for (const r of referrers ?? []) {
      const ref = (r.referrer || "").toLowerCase();
      let src = "Direto";
      if (!ref) src = "Direto";
      else if (ref.includes("google")) src = "Google";
      else if (ref.includes("instagram")) src = "Instagram";
      else if (ref.includes("facebook") || ref.includes("fb.com")) src = "Facebook";
      else if (ref.includes("whatsapp") || ref.includes("wa.me")) src = "WhatsApp";
      else if (ref.includes("mercadolivre") || ref.includes("mercadolibre")) src = "Marketplace";
      else src = "Outros";
      srcMap.set(src, (srcMap.get(src) ?? 0) + 1);
    }
    const trafficSources = Array.from(srcMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // Abandoned carts
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const { data: recentCarts } = await supabaseAdmin
      .from("store_carts")
      .select("id, session_token, user_id, updated_at, created_at")
      .gte("updated_at", dayAgo)
      .order("updated_at", { ascending: false })
      .limit(50);
    let abandonedCarts: { id: string; value: number; updated_at: string; items: number }[] = [];
    if (recentCarts && recentCarts.length > 0) {
      const cartIds = recentCarts.map((c) => c.id);
      const { data: cartItems } = await supabaseAdmin
        .from("store_cart_items")
        .select("cart_id, quantity, unit_price")
        .in("cart_id", cartIds);
      const cartValMap = new Map<string, { value: number; items: number }>();
      for (const ci of cartItems ?? []) {
        const cur = cartValMap.get(ci.cart_id) ?? { value: 0, items: 0 };
        cur.value += Number(ci.unit_price || 0) * (ci.quantity || 0);
        cur.items += ci.quantity || 0;
        cartValMap.set(ci.cart_id, cur);
      }
      abandonedCarts = recentCarts
        .filter((c) => cartValMap.has(c.id))
        .map((c) => {
          const v = cartValMap.get(c.id)!;
          return { id: c.id, value: v.value, items: v.items, updated_at: c.updated_at };
        })
        .filter((c) => c.value > 0)
        .slice(0, 10);
    }
    const abandonedValue = abandonedCarts.reduce((a, b) => a + b.value, 0);

    // Customers
    const { count: totalCustomers } = await supabaseAdmin
      .from("customers")
      .select("id", { count: "exact", head: true });
    const { count: newCustomers } = await supabaseAdmin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", rangeStart);
    const { data: topCustomers } = await supabaseAdmin
      .from("customers")
      .select("id, full_name, email, total_spent, orders_count")
      .order("total_spent", { ascending: false })
      .limit(5);

    // Insights
    const insights: string[] = [];
    if (revenueYesterday > 0) {
      if (growth > 5) insights.push(`Hoje as vendas estão ${growth.toFixed(0)}% acima de ontem.`);
      else if (growth < -5) insights.push(`Hoje as vendas estão ${Math.abs(growth).toFixed(0)}% abaixo de ontem.`);
    }
    if (topProducts[0]) insights.push(`${topProducts[0].name} é o produto mais vendido do período.`);
    if (abandonedCarts.length > 0) {
      insights.push(`Há ${abandonedCarts.length} carrinhos abandonados com potencial de R$ ${abandonedValue.toFixed(2)}.`);
    }
    if (trafficSources[0]) insights.push(`Principal origem de tráfego: ${trafficSources[0].source} (${trafficSources[0].count} visitas).`);
    if ((lowStock ?? []).length > 0) insights.push(`${(lowStock ?? []).length} produtos com estoque baixo precisam de reposição.`);

    return {
      generated_at: now.toISOString(),
      range: data.range,
      today: {
        revenue: revenueToday,
        revenue_yesterday: revenueYesterday,
        growth,
        orders: ordersTodayCount,
        orders_value: ordersTodayValue,
        avg_ticket: avgTicket,
      },
      live: {
        active: activeSessions.size,
        checkout: checkoutNow,
        product_views: productViewsNow,
        category_views: categoryViewsNow,
      },
      finance: {
        gross_revenue: grossRevenue,
        net_revenue: netRevenue,
        discounts: discountsTotal,
        shipping: shippingTotal,
        paid_orders: paidRange.length,
        production_revenue: productionRevenue,
        production_entries: (financeEntries ?? []).length,
      },
      production_finance: (financeEntries ?? []).slice(0, 20).map((e) => ({
        id: e.id,
        reference: e.reference,
        description: e.description,
        customer_name: e.customer_name,
        quantity: Number(e.quantity || 0),
        amount: Number(e.amount || 0),
        occurred_at: e.occurred_at,
        source: e.source,
      })),
      status_breakdown: statusBreakdown,
      payment_breakdown: paymentBreakdown,
      daily_series: dailySeries,
      top_products: topProducts,
      sales_by_category: salesByCategory,
      low_stock: lowStock ?? [],
      recent_orders: recentOrders,
      traffic_sources: trafficSources,
      abandoned: { carts: abandonedCarts, total_value: abandonedValue },
      customers: {
        total: totalCustomers ?? 0,
        new: newCustomers ?? 0,
        top: topCustomers ?? [],
      },
      insights,
    };
  });
