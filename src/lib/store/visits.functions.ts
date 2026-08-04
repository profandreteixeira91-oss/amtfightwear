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

export const adminGetVisitorStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
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
