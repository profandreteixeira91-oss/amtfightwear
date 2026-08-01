import { createServerFn } from "@tanstack/react-start";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dayISO } from "@/lib/dates";

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
    await assertSaasOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // A conta Dojo existe desde o cadastro no Auth. Academia e assinatura são
    // vínculos opcionais, mas também identificam as contas legadas do módulo.
    const [authResult, academiesRes, subsRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin
        .from("dojo_academy_profile")
        .select(
          "owner_id, legal_name, trade_name, phone, whatsapp, city, state, slug, created_at, onboarding_completed",
        )
        .limit(5000),
      supabaseAdmin
        .from("dojo_subscriptions")
        .select(
          "owner_id, status, plan_amount, trial_ends_at, current_period_end, cancelled_at",
        )
        .limit(5000),
    ]);
    const { data: authPage, error: authError } = authResult;
    if (authError) throw new Error(`Não foi possível listar as contas: ${authError.message}`);

    const knownDojoOwners = new Set<string>([
      ...(academiesRes.data ?? []).map((academy) => academy.owner_id),
      ...(subsRes.data ?? []).map((subscription) => subscription.owner_id),
    ]);
    const authUsers = authPage.users.filter(
      (user) =>
        knownDojoOwners.has(user.id) ||
        user.user_metadata?.account_type === "dojo_manager",
    );
    const ownerIds = authUsers.map((user) => user.id);
    if (ownerIds.length === 0) return [] as DojoAccountRow[];

    const [profilesRes, studentsRes, unitsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, created_at")
        .in("id", ownerIds),
      supabaseAdmin.from("dojo_students").select("owner_id").in("owner_id", ownerIds),
      supabaseAdmin.from("dojo_units").select("owner_id").in("owner_id", ownerIds),
    ]);

    const profileMap = new Map(
      (profilesRes.data ?? []).map((profile: any) => [profile.id, profile]),
    );
    const academyMap = new Map(
      (academiesRes.data ?? []).map((a: any) => [a.owner_id, a]),
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
    return authUsers
      .map<DojoAccountRow>((user) => {
      const p: any = profileMap.get(user.id) ?? {};
      const a: any = academyMap.get(user.id) ?? {};
      const s: any = subMap.get(user.id);
      const createdAt = a.created_at ?? p.created_at ?? user.created_at;
      let sub_status: string | null = s?.status ?? null;
      // Normalize Mercado Pago-style "trialing" to "trial" for the UI.
      if (sub_status === "trialing") sub_status = "trial";
      if (
        s?.trial_ends_at &&
        new Date(s.trial_ends_at).getTime() > now &&
        sub_status !== "authorized" &&
        sub_status !== "active"
      ) {
        sub_status = "trial";
      }
      if (!s) {
        const ageDays = (now - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
        sub_status = ageDays <= 14 ? "trial" : "none";
      }
      return {
        owner_id: user.id,
        email: user.email ?? p.email ?? null,
        full_name:
          p.full_name ??
          (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
          (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null),
        trade_name: a.trade_name ?? null,
        legal_name: a.legal_name ?? null,
        city: a.city ?? null,
        state: a.state ?? null,
        phone: a.phone ?? null,
        whatsapp: a.whatsapp ?? null,
        slug: a.slug ?? null,
        created_at: createdAt,
        onboarding_completed: !!a.onboarding_completed,
        sub_status,
        sub_plan_amount: s?.plan_amount ?? null,
        sub_trial_ends_at: s?.trial_ends_at ?? null,
        sub_current_period_end: s?.current_period_end ?? null,
        sub_cancelled_at: s?.cancelled_at ?? null,
        students_count: studentsCount.get(user.id) ?? 0,
        units_count: unitsCount.get(user.id) ?? 0,
      };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });


// ---------- Admin: dojo landing page visits ----------

export const adminGetDojoLandingStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);

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
      const d = dayISO(r.created_at);
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
