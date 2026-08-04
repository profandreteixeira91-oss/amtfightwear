import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import type { Database } from "@/integrations/supabase/types";
import { dayISO } from "@/lib/dates";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// ---------- Public: record a visit (anon or authed) ----------

export const recordStoreVisit = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      session_id: z.string().min(4).max(80),
      path: z.string().max(500).optional().nullable(),
      referrer: z.string().max(500).optional().nullable(),
      user_agent: z.string().max(500).optional().nullable(),
      user_id: z.string().uuid().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    await sb.from("store_visits").insert({
      session_id: data.session_id,
      path: data.path ?? null,
      referrer: data.referrer ?? null,
      user_agent: data.user_agent ?? null,
      user_id: data.user_id ?? null,
    });
    return { ok: true };
  });

// ---------- Admin: visitor stats ----------

export const adminGetVisitorStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // has_role check via authenticated client
    await assertSaasOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const countSince = async (iso: string) => {
      const { count } = await supabaseAdmin
        .from("store_visits")
        .select("id", { count: "exact", head: true })
        .gte("created_at", iso);
      return count ?? 0;
    };

    // Unique sessions per period
    const uniqueSince = async (iso: string) => {
      const { data } = await supabaseAdmin
        .from("store_visits")
        .select("session_id")
        .gte("created_at", iso)
        .limit(50000);
      const set = new Set((data ?? []).map((r: { session_id: string }) => r.session_id));
      return set.size;
    };

    const [pvDay, pvWeek, pvMonth, uDay, uWeek, uMonth] = await Promise.all([
      countSince(day),
      countSince(week),
      countSince(month),
      uniqueSince(day),
      uniqueSince(week),
      uniqueSince(month),
    ]);

    // Daily series (last 30 days)
    const { data: seriesRows } = await supabaseAdmin
      .from("store_visits")
      .select("session_id, created_at")
      .gte("created_at", month)
      .order("created_at", { ascending: true })
      .limit(50000);
    const daily = new Map<string, { pv: number; sess: Set<string> }>();
    for (const r of seriesRows ?? []) {
      const d = dayISO(r.created_at);
      const cur = daily.get(d) ?? { pv: 0, sess: new Set<string>() };
      cur.pv += 1;
      cur.sess.add(r.session_id);
      daily.set(d, cur);
    }
    const series = Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, pv: v.pv, uniq: v.sess.size }));

    return {
      pageviews: { day: pvDay, week: pvWeek, month: pvMonth },
      visitors: { day: uDay, week: uWeek, month: uMonth },
      series,
    };
  });

// ---------- Admin: list customers ----------

export const adminListStoreCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscamos da view consolidada que criamos
    const { data, error } = await supabaseAdmin
      .from("store_customers_unified")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  });

export const adminGetCustomerDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Dados básicos
    const { data: customer } = await supabaseAdmin
      .from("store_customers_unified")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (!customer) throw new Error("Cliente não encontrado");

    // 2. Histórico de Pedidos
    const isGuest = data.id.startsWith("guest:");
    const isChat = data.id.startsWith("chat:");
    
    let ordersQuery = supabaseAdmin.from("store_orders").select("*").order("created_at", { ascending: false });
    if (isGuest) {
      ordersQuery = ordersQuery.eq("customer_email", data.id.replace("guest:", ""));
    } else if (isChat) {
      // Leads de chat podem não ter pedidos ainda, ou ter via email
      if (customer.email) ordersQuery = ordersQuery.eq("customer_email", customer.email);
      else return { customer, orders: [], carts: [], conversations: [] };
    } else {
      ordersQuery = ordersQuery.eq("user_id", data.id);
    }
    const { data: orders } = await ordersQuery;

    // 3. Carrinhos (incluindo abandonados)
    let cartsQuery = supabaseAdmin.from("store_carts").select("*, store_cart_items(*)").order("created_at", { ascending: false });
    if (isChat) {
      // Busca via conversation_id se for lead de chat
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

