import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  range: z.enum(["today", "7d", "30d", "90d", "year", "custom"]).default("7d"),
  granularity: z.enum(["hour", "day", "week", "month"]).default("day"),
  start: z.string().optional(),
  end: z.string().optional(),
});

function resolveRange(range: string, start?: string, end?: string) {
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);
  switch (range) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "year":
      startDate.setDate(startDate.getDate() - 365);
      break;
    case "custom": {
      if (start) startDate.setTime(new Date(start).getTime());
      if (end) endDate.setTime(new Date(end).getTime());
      break;
    }
  }
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

// Brasil (America/Sao_Paulo) é UTC-3 sem DST atualmente.
const TZ_OFFSET_HOURS = -3;

function toLocal(date: Date): Date {
  return new Date(date.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
}

function bucketKey(date: Date, granularity: string) {
  // Desloca para horário local (BRT) e depois usa métodos UTC para formatar,
  // garantindo que a chave represente o instante local do evento.
  const d = toLocal(date);
  if (granularity === "hour") {
    d.setUTCMinutes(0, 0, 0);
    return d.toISOString().slice(0, 13) + ":00";
  }
  if (granularity === "week") {
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day;
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    return monday.toISOString().slice(0, 10);
  }
  if (granularity === "month") {
    return d.toISOString().slice(0, 7);
  }
  return d.toISOString().slice(0, 10);
}

function normalizePath(path: string | null): string {
  if (!path) return "/";
  try {
    const url = path.startsWith("http") ? new URL(path).pathname : path;
    return url.split("?")[0].split("#")[0] || "/";
  } catch {
    return path;
  }
}

function labelPath(path: string): string {
  const p = path.toLowerCase();
  if (p === "/" || p === "/loja") return "Home";
  if (p.startsWith("/loja/produto") || p.startsWith("/produto")) return `Produto ${p.split("/").pop()}`;
  if (p.startsWith("/loja/categoria") || p.startsWith("/categoria")) return `Categoria ${p.split("/").pop()}`;
  if (p.includes("checkout")) return "Checkout";
  if (p.includes("carrinho") || p.includes("cart")) return "Carrinho";
  if (p.includes("conta")) return "Minha conta";
  if (p.includes("atacado")) return "Atacado";
  return path;
}

export const adminGetVisitors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InputSchema.parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertSaasOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { start, end } = resolveRange(data.range, data.start, data.end);

    // Page-size safe: paginate up to a hard cap
    const pageSize = 1000;
    const cap = 50000;
    const rows: { session_id: string; path: string | null; referrer: string | null; user_id: string | null; created_at: string }[] = [];
    let from = 0;
    while (from < cap) {
      const { data: chunk, error } = await supabaseAdmin
        .from("store_visits")
        .select("session_id, path, referrer, user_id, created_at")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!chunk || chunk.length === 0) break;
      rows.push(...chunk);
      if (chunk.length < pageSize) break;
      from += pageSize;
    }

    // Time series buckets: pageviews + unique sessions
    type Bucket = { key: string; pageviews: number; sessions: Set<string> };
    const bucketMap = new Map<string, Bucket>();
    // Page counters
    const pageMap = new Map<string, { pageviews: number; sessions: Set<string> }>();
    // Global metrics
    const allSessions = new Set<string>();
    const loggedSessions = new Set<string>();

    for (const r of rows) {
      const key = bucketKey(new Date(r.created_at), data.granularity);
      let b = bucketMap.get(key);
      if (!b) {
        b = { key, pageviews: 0, sessions: new Set() };
        bucketMap.set(key, b);
      }
      b.pageviews += 1;
      b.sessions.add(r.session_id);

      const p = normalizePath(r.path);
      let pg = pageMap.get(p);
      if (!pg) {
        pg = { pageviews: 0, sessions: new Set() };
        pageMap.set(p, pg);
      }
      pg.pageviews += 1;
      pg.sessions.add(r.session_id);

      allSessions.add(r.session_id);
      if (r.user_id) loggedSessions.add(r.session_id);
    }

    const series = Array.from(bucketMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((b) => ({ key: b.key, pageviews: b.pageviews, visitors: b.sessions.size }));

    const topPages = Array.from(pageMap.entries())
      .map(([path, v]) => ({
        path,
        label: labelPath(path),
        pageviews: v.pageviews,
        visitors: v.sessions.size,
      }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, 20);

    // Live (last 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: live } = await supabaseAdmin
      .from("store_visits")
      .select("session_id")
      .gte("created_at", fiveMinAgo)
      .limit(2000);
    const liveActive = new Set((live ?? []).map((r) => r.session_id)).size;

    return {
      range: data.range,
      granularity: data.granularity,
      start,
      end,
      totals: {
        pageviews: rows.length,
        visitors: allSessions.size,
        logged_in: loggedSessions.size,
        pages_per_visitor: allSessions.size > 0 ? rows.length / allSessions.size : 0,
        live_active: liveActive,
      },
      series,
      top_pages: topPages,
    };
  });
