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

    // 1) Only real e-commerce activity counts as "cliente da loja":
    //    - fez pedido na loja (store_orders: user_id OU customer_email)
    //    - tem carrinho identificado na loja (store_carts.user_id)
    const [ordersRes, cartsRes] = await Promise.all([
      supabaseAdmin
        .from("store_orders")
        .select("user_id, customer_email, total, created_at, payment_status")
        .order("created_at", { ascending: false })
        .limit(20000),
      supabaseAdmin
        .from("store_carts")
        .select("user_id")
        .not("user_id", "is", null)
        .limit(20000),
    ]);

    type Agg = { orders: number; paid: number; total: number; last: string | null };
    const byUser = new Map<string, Agg>();
    const byEmail = new Map<string, Agg>();
    const bump = (m: Map<string, Agg>, key: string, o: { total: number | null; created_at: string; payment_status: string | null }) => {
      const cur = m.get(key) ?? { orders: 0, paid: 0, total: 0, last: null };
      cur.orders += 1;
      if (o.payment_status === "paid") {
        cur.paid += 1;
        cur.total += Number(o.total ?? 0);
      }
      if (!cur.last || o.created_at > cur.last) cur.last = o.created_at;
      m.set(key, cur);
    };

    const eligibleUserIds = new Set<string>();
    const eligibleEmails = new Set<string>();

    for (const o of ordersRes.data ?? []) {
      if (o.user_id) {
        eligibleUserIds.add(o.user_id);
        bump(byUser, o.user_id, o);
      }
      if (o.customer_email) {
        const email = o.customer_email.toLowerCase();
        eligibleEmails.add(email);
        bump(byEmail, email, o);
      }
    }
    for (const c of cartsRes.data ?? []) {
      if (c.user_id) eligibleUserIds.add(c.user_id);
    }

    // 2) Excluir usuários que só existem via Dojo Manager (donos, alunos, colaboradores).
    //    Um usuário só é considerado cliente da loja se apareceu em pedido/carrinho da loja.
    //    Como a Set eligibleUserIds já é construída SOMENTE a partir de atividade na loja,
    //    perfis de dojo sem atividade na loja jamais entram.

    // 3) Buscar os profiles apenas dos usuários/emails elegíveis.
    const idsArr = Array.from(eligibleUserIds);
    const emailsArr = Array.from(eligibleEmails);

    const profilesMap = new Map<string, {
      id: string;
      email: string | null;
      full_name: string | null;
      phone: string | null;
      document: string | null;
      city: string | null;
      state: string | null;
      created_at: string;
    }>();

    if (idsArr.length) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, phone, document, city, state, created_at")
        .in("id", idsArr);
      for (const p of data ?? []) profilesMap.set(p.id, p);
    }
    if (emailsArr.length) {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, phone, document, city, state, created_at")
        .in("email", emailsArr);
      for (const p of data ?? []) if (!profilesMap.has(p.id)) profilesMap.set(p.id, p);
    }

    // 4) Também incluir compradores "guest" (pedido só com email, sem profile).
    const guests: Array<{
      id: string;
      email: string | null;
      full_name: string | null;
      phone: string | null;
      document: string | null;
      city: string | null;
      state: string | null;
      created_at: string;
    }> = [];
    const knownEmails = new Set(
      Array.from(profilesMap.values())
        .map((p) => (p.email ?? "").toLowerCase())
        .filter(Boolean),
    );
    for (const o of ordersRes.data ?? []) {
      if (!o.customer_email) continue;
      const email = o.customer_email.toLowerCase();
      if (knownEmails.has(email)) continue;
      if (guests.some((g) => g.email === email)) continue;
      guests.push({
        id: `guest:${email}`,
        email,
        full_name: null,
        phone: null,
        document: null,
        city: null,
        state: null,
        created_at: o.created_at,
      });
    }

    const rows = [...profilesMap.values(), ...guests].map((p) => {
      const a = byUser.get(p.id);
      const b = p.email ? byEmail.get(p.email.toLowerCase()) : undefined;
      const orders = (a?.orders ?? 0) + (b?.orders ?? 0);
      const paid = (a?.paid ?? 0) + (b?.paid ?? 0);
      const total = (a?.total ?? 0) + (b?.total ?? 0);
      const last = [a?.last, b?.last].filter(Boolean).sort().slice(-1)[0] ?? null;
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        document: p.document,
        city: p.city,
        state: p.state,
        created_at: p.created_at,
        orders_count: orders,
        paid_count: paid,
        total_spent: total,
        last_order_at: last,
      };
    });

    rows.sort((a, b) => (b.last_order_at ?? b.created_at).localeCompare(a.last_order_at ?? a.created_at));
    return rows;
  });

