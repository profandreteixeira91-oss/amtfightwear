import { createServerFn } from "@tanstack/react-start";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dayISO } from "@/lib/dates";
import { z } from "zod";

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

    // Uma conta de dono de dojo é identificada por QUALQUER sinal real do módulo:
    // registro administrativo (dojo_users role=owner), academia, assinatura, alunos
    // ou unidades. Depender apenas de dojo_users congelava a listagem, porque esse
    // registro nem sempre é criado no cadastro (falha silenciosa no signup).
    const [dojoUsersRes, ownerStudentsRes, ownerUnitsRes, studentAccRes, staffAccRes, teamRes] =
      await Promise.all([
        supabaseAdmin.from("dojo_users").select("auth_user_id, role, status").limit(5000),
        supabaseAdmin.from("dojo_students").select("owner_id").limit(50000),
        supabaseAdmin.from("dojo_units").select("owner_id").limit(5000),
        supabaseAdmin.from("student_accounts").select("auth_user_id, email").limit(50000),
        supabaseAdmin.from("dojo_staff_accounts").select("auth_user_id, email").limit(5000),
        supabaseAdmin.from("dojo_team_members").select("user_id, email").limit(20000),
      ]);

    const dojoOwnerIds = new Set<string>();
    for (const u of dojoUsersRes.data ?? []) {
      if ((u as any).status === "active" && (u as any).role === "owner") {
        dojoOwnerIds.add((u as any).auth_user_id);
      }
    }
    for (const a of academiesRes.data ?? []) dojoOwnerIds.add((a as any).owner_id);
    for (const s of subsRes.data ?? []) dojoOwnerIds.add((s as any).owner_id);
    for (const r of ownerStudentsRes.data ?? []) dojoOwnerIds.add((r as any).owner_id);
    for (const r of ownerUnitsRes.data ?? []) dojoOwnerIds.add((r as any).owner_id);

    // Contas criadas DENTRO do sistema de um dono (alunos e equipe/professores)
    // nunca são donos de dojo, mesmo que apareçam nos sinais acima.
    const excludedIds = new Set<string>();
    // Contas internas e a conta demonstrativa comercial não são clientes reais.
    const excludedEmails = new Set<string>([
      "igor.reboredo@gmail.com",
      "profandreteixeira91@gmail.com",
      "admin@dojomanager.com",
    ]);
    const addExcluded = (rows: any[] | null, idKey: string) => {
      for (const r of rows ?? []) {
        if (r?.[idKey]) excludedIds.add(r[idKey]);
        if (r?.email) excludedEmails.add(String(r.email).toLowerCase());
      }
    };
    addExcluded(studentAccRes.data as any[], "auth_user_id");
    addExcluded(staffAccRes.data as any[], "auth_user_id");
    addExcluded(teamRes.data as any[], "user_id");
    for (const u of dojoUsersRes.data ?? []) {
      if ((u as any).role !== "owner" && (u as any).auth_user_id) {
        excludedIds.add((u as any).auth_user_id);
      }
    }

    const authUsers = authPage.users.filter((user) => {
      if (!dojoOwnerIds.has(user.id)) return false;
      if (excludedIds.has(user.id)) return false;
      const email = user.email?.toLowerCase();
      return !(email && excludedEmails.has(email));
    });
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

// ---------- Admin: delete dojo owner account ----------

export const adminDeleteDojoOwnerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ownerId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertSaasOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Chamamos a função SQL SECURITY DEFINER criada via migração
    const { error } = await supabaseAdmin.rpc("admin_delete_dojo_owner", {
      owner_id_to_delete: data.ownerId,
    });

    if (error) {
      console.error("Erro ao deletar conta de dono de dojo:", error);
      throw new Error(`Erro ao deletar conta: ${error.message}`);
    }

    return { success: true };
  });
