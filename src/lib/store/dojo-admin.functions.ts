import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "amt_admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

// ---------- Admin: list dojo owner accounts + subscription status ----------

export type DojoAccountRow = {
  owner_id: string;
  email: string | null;
  full_name: string | null;
  trade_name: string | null;
  legal_name: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  slug: string | null;
  created_at: string;
  onboarding_completed: boolean;
  // subscription
  sub_status: string | null; // 'trial' | 'pending' | 'authorized' | 'active' | 'paused' | 'cancelled' | null
  sub_plan_amount: number | null;
  sub_trial_ends_at: string | null;
  sub_current_period_end: string | null;
  sub_cancelled_at: string | null;
  // counts
  students_count: number;
  units_count: number;
};

export const adminListDojoAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: academies } = await supabaseAdmin
      .from("dojo_academy_profile")
      .select(
        "owner_id, legal_name, trade_name, phone, whatsapp, city, state, slug, created_at, onboarding_completed",
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    const ownerIds = (academies ?? []).map((a) => a.owner_id);
    if (ownerIds.length === 0) return [] as DojoAccountRow[];

    const [profilesRes, subsRes, studentsRes, unitsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ownerIds),
      supabaseAdmin
        .from("dojo_subscriptions")
        .select(
          "owner_id, status, plan_amount, trial_ends_at, current_period_end, cancelled_at",
        )
        .in("owner_id", ownerIds),
      supabaseAdmin.from("dojo_students").select("owner_id").in("owner_id", ownerIds),
      supabaseAdmin.from("dojo_units").select("owner_id").in("owner_id", ownerIds),
    ]);

    const profileMap = new Map(
      (profilesRes.data ?? []).map((p: any) => [p.id, p]),
    );
    const subMap = new Map((subsRes.data ?? []).map((s: any) => [s.owner_id, s]));
    const studentsCount = new Map<string, number>();
    for (const r of studentsRes.data ?? []) {
      studentsCount.set(r.owner_id, (studentsCount.get(r.owner_id) ?? 0) + 1);
    }
    const unitsCount = new Map<string, number>();
    for (const r of unitsRes.data ?? []) {
      unitsCount.set(r.owner_id, (unitsCount.get(r.owner_id) ?? 0) + 1);
    }

    const now = Date.now();
    return (academies ?? []).map<DojoAccountRow>((a) => {
      const p: any = profileMap.get(a.owner_id) ?? {};
      const s: any = subMap.get(a.owner_id);
      let sub_status: string | null = s?.status ?? null;
      // Derive trial when trial_ends_at is in the future and status not paid.
      if (s?.trial_ends_at && new Date(s.trial_ends_at).getTime() > now && sub_status !== "authorized" && sub_status !== "active") {
        sub_status = "trial";
      }
      // If no subscription row at all, treat as trial when account < 14 days old
      if (!s) {
        const ageDays = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
        sub_status = ageDays <= 14 ? "trial" : "none";
      }
      return {
        owner_id: a.owner_id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
        trade_name: a.trade_name ?? null,
        legal_name: a.legal_name ?? null,
        city: a.city ?? null,
        state: a.state ?? null,
        phone: a.phone ?? null,
        whatsapp: a.whatsapp ?? null,
        slug: a.slug ?? null,
        created_at: a.created_at,
        onboarding_completed: !!a.onboarding_completed,
        sub_status,
        sub_plan_amount: s?.plan_amount ?? null,
        sub_trial_ends_at: s?.trial_ends_at ?? null,
        sub_current_period_end: s?.current_period_end ?? null,
        sub_cancelled_at: s?.cancelled_at ?? null,
        students_count: studentsCount.get(a.owner_id) ?? 0,
        units_count: unitsCount.get(a.owner_id) ?? 0,
      };
    });
  });

// ---------- Admin: dojo landing page visits ----------

export const adminGetDojoLandingStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const day = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const scope = (q: any) => q.or("path.eq./dojo,path.like./dojo/%");

    const pv = async (iso: string) => {
      const { count } = await scope(
        supabaseAdmin
          .from("store_visits")
          .select("id", { count: "exact", head: true })
          .gte("created_at", iso),
      );
      return count ?? 0;
    };
    const uniq = async (iso: string) => {
      const { data } = await scope(
        supabaseAdmin.from("store_visits").select("session_id").gte("created_at", iso).limit(50000),
      );
      return new Set((data ?? []).map((r: any) => r.session_id)).size;
    };

    const [pvDay, pvWeek, pvMonth, uDay, uWeek, uMonth, seriesRes] = await Promise.all([
      pv(day),
      pv(week),
      pv(month),
      uniq(day),
      uniq(week),
      uniq(month),
      scope(
        supabaseAdmin
          .from("store_visits")
          .select("session_id, created_at, path, referrer")
          .gte("created_at", month)
          .order("created_at", { ascending: true })
          .limit(50000),
      ),
    ]);

    const rows = (seriesRes as any).data ?? [];
    const daily = new Map<string, { pv: number; sess: Set<string> }>();
    const referrerMap = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      const cur = daily.get(d) ?? { pv: 0, sess: new Set<string>() };
      cur.pv += 1;
      cur.sess.add(r.session_id);
      daily.set(d, cur);
      if (r.referrer) {
        try {
          const host = new URL(r.referrer).hostname || "direto";
          referrerMap.set(host, (referrerMap.get(host) ?? 0) + 1);
        } catch {
          referrerMap.set("direto", (referrerMap.get("direto") ?? 0) + 1);
        }
      } else {
        referrerMap.set("direto", (referrerMap.get("direto") ?? 0) + 1);
      }
    }
    const series = Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, pv: v.pv, uniq: v.sess.size }));
    const referrers = Array.from(referrerMap.entries())
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      pageviews: { day: pvDay, week: pvWeek, month: pvMonth },
      visitors: { day: uDay, week: uWeek, month: uMonth },
      series,
      referrers,
    };
  });
