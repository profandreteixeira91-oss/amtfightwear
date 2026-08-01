import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import {
  INSIGHT_FIELDS,
  accumulate,
  adsToken,
  emptyMetrics,
  graphDelete,
  graphGet,
  graphGetAll,
  graphPost,
  money,
  normalizeAccount,
  timeRange,
  type Metrics,
  type RawInsight,
} from "./ads-manager.server";

const rangeSchema = z.object({
  accountId: z.string().optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const idSchema = z.object({ id: z.string().min(3) });

const STATUS = z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]);

// ---------------------------------------------------------------- contas

export const amListAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const data = await graphGetAll<{
      id: string;
      name?: string;
      currency?: string;
      timezone_name?: string;
      account_status?: number;
      amount_spent?: string;
      balance?: string;
    }>("/me/adaccounts", {
      fields: "id,name,currency,timezone_name,account_status,amount_spent,balance",
      limit: "100",
    });
    return data.map((a) => ({
      id: a.id,
      name: a.name ?? a.id,
      currency: a.currency ?? "BRL",
      timezone: a.timezone_name ?? "",
      active: a.account_status === 1,
      spent: Number(a.amount_spent ?? 0) / 100,
      balance: Number(a.balance ?? 0) / 100,
    }));
  });

// ---------------------------------------------------------------- dashboard

export const amGetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; since: string; until: string }) => rangeSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const today = new Date().toISOString().slice(0, 10);

    const [account, daily, todayRows, byCampaign] = await Promise.all([
      graphGet<{ id: string; name: string; currency: string; timezone_name: string; account_status: number }>(
        `/${act}`,
        { fields: "id,name,currency,timezone_name,account_status" },
      ),
      graphGetAll<RawInsight>(`/${act}/insights`, {
        fields: INSIGHT_FIELDS,
        time_range: timeRange(data.since, data.until),
        time_increment: "1",
        limit: "500",
      }),
      graphGetAll<RawInsight>(`/${act}/insights`, {
        fields: "spend",
        time_range: timeRange(today, today),
        limit: "10",
      }).catch(() => [] as RawInsight[]),
      graphGetAll<RawInsight & { campaign_name?: string }>(`/${act}/insights`, {
        fields: `campaign_id,campaign_name,${INSIGHT_FIELDS}`,
        time_range: timeRange(data.since, data.until),
        level: "campaign",
        limit: "300",
      }),
    ]);

    const totals = accumulate(daily);
    const spentToday = todayRows.reduce((a, r) => a + Number(r.spend ?? 0), 0);

    const series = daily
      .map((d) => {
        const m = accumulate([d]);
        return {
          date: d.date_start ?? "",
          spend: Number(m.spend.toFixed(2)),
          clicks: m.clicks,
          impressions: m.impressions,
          conversions: m.conversions,
          revenue: Number(m.revenue.toFixed(2)),
          roas: Number(m.roas.toFixed(2)),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const campaignMap = new Map<string, { name: string; rows: RawInsight[] }>();
    for (const row of byCampaign) {
      const key = row.campaign_id ?? "—";
      const entry = campaignMap.get(key) ?? { name: row.campaign_name ?? key, rows: [] };
      entry.rows.push(row);
      campaignMap.set(key, entry);
    }
    const campaigns = [...campaignMap.entries()]
      .map(([id, v]) => {
        const m = accumulate(v.rows);
        return {
          id,
          name: v.name,
          spend: Number(m.spend.toFixed(2)),
          conversions: m.conversions,
          revenue: Number(m.revenue.toFixed(2)),
          roas: Number(m.roas.toFixed(2)),
          ctr: Number(m.ctr.toFixed(2)),
        };
      })
      .sort((a, b) => b.spend - a.spend);

    return {
      account: {
        id: account.id,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone_name,
        active: account.account_status === 1,
      },
      totals: { ...totals, spentToday },
      series,
      campaigns,
    };
  });

// ---------------------------------------------------------------- campanhas

type CampaignRaw = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  buying_type?: string;
  bid_strategy?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  special_ad_categories?: string[];
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
};

export const amListCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; since: string; until: string }) => rangeSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);

    const [campaigns, insights] = await Promise.all([
      graphGetAll<CampaignRaw>(`/${act}/campaigns`, {
        fields:
          "id,name,status,effective_status,objective,buying_type,bid_strategy,daily_budget,lifetime_budget,budget_remaining,special_ad_categories,start_time,stop_time,created_time,updated_time",
        limit: "200",
        effective_status: JSON.stringify([
          "ACTIVE",
          "PAUSED",
          "CAMPAIGN_PAUSED",
          "ARCHIVED",
          "IN_PROCESS",
          "WITH_ISSUES",
        ]),
      }),
      graphGetAll<RawInsight>(`/${act}/insights`, {
        fields: `campaign_id,${INSIGHT_FIELDS}`,
        time_range: timeRange(data.since, data.until),
        level: "campaign",
        limit: "300",
      }).catch(() => [] as RawInsight[]),
    ]);

    const byId = new Map<string, RawInsight[]>();
    for (const row of insights) {
      const key = row.campaign_id ?? "";
      byId.set(key, [...(byId.get(key) ?? []), row]);
    }

    return campaigns.map((c) => {
      const m: Metrics = byId.has(c.id) ? accumulate(byId.get(c.id)!) : emptyMetrics();
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        effectiveStatus: c.effective_status,
        objective: c.objective,
        buyingType: c.buying_type ?? null,
        bidStrategy: c.bid_strategy ?? null,
        dailyBudget: money(c.daily_budget),
        lifetimeBudget: money(c.lifetime_budget),
        budgetRemaining: money(c.budget_remaining),
        specialCategories: c.special_ad_categories ?? [],
        startAt: c.start_time ?? null,
        stopAt: c.stop_time ?? null,
        createdAt: c.created_time ?? null,
        updatedAt: c.updated_time ?? null,
        metrics: m,
      };
    });
  });

// ---------------------------------------------------------------- conjuntos

export const amListAdSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; since: string; until: string; campaignId?: string }) =>
    rangeSchema.extend({ campaignId: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const base = data.campaignId ? `/${data.campaignId}/adsets` : `/${act}/adsets`;

    const [sets, insights] = await Promise.all([
      graphGetAll<{
        id: string;
        name: string;
        status: string;
        effective_status: string;
        campaign_id: string;
        optimization_goal?: string;
        billing_event?: string;
        bid_strategy?: string;
        bid_amount?: string;
        daily_budget?: string;
        lifetime_budget?: string;
        start_time?: string;
        end_time?: string;
        targeting?: { geo_locations?: { countries?: string[] }; age_min?: number; age_max?: number };
        updated_time?: string;
      }>(base, {
        fields:
          "id,name,status,effective_status,campaign_id,optimization_goal,billing_event,bid_strategy,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting,updated_time",
        limit: "200",
      }),
      graphGetAll<RawInsight>(`/${act}/insights`, {
        fields: `adset_id,${INSIGHT_FIELDS}`,
        time_range: timeRange(data.since, data.until),
        level: "adset",
        limit: "300",
      }).catch(() => [] as RawInsight[]),
    ]);

    const byId = new Map<string, RawInsight[]>();
    for (const row of insights) {
      const key = row.adset_id ?? "";
      byId.set(key, [...(byId.get(key) ?? []), row]);
    }

    return sets.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      effectiveStatus: s.effective_status,
      campaignId: s.campaign_id,
      optimizationGoal: s.optimization_goal ?? null,
      billingEvent: s.billing_event ?? null,
      bidStrategy: s.bid_strategy ?? null,
      bidAmount: money(s.bid_amount),
      dailyBudget: money(s.daily_budget),
      lifetimeBudget: money(s.lifetime_budget),
      startAt: s.start_time ?? null,
      endAt: s.end_time ?? null,
      countries: s.targeting?.geo_locations?.countries ?? [],
      ageMin: s.targeting?.age_min ?? null,
      ageMax: s.targeting?.age_max ?? null,
      updatedAt: s.updated_time ?? null,
      metrics: byId.has(s.id) ? accumulate(byId.get(s.id)!) : emptyMetrics(),
    }));
  });

// ---------------------------------------------------------------- anúncios

export const amListAds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; since: string; until: string; adsetId?: string }) =>
    rangeSchema.extend({ adsetId: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const base = data.adsetId ? `/${data.adsetId}/ads` : `/${act}/ads`;

    const [ads, insights] = await Promise.all([
      graphGetAll<{
        id: string;
        name: string;
        status: string;
        effective_status: string;
        adset_id: string;
        campaign_id: string;
        created_time?: string;
        updated_time?: string;
        creative?: {
          id: string;
          name?: string;
          thumbnail_url?: string;
          title?: string;
          body?: string;
          object_story_spec?: unknown;
        };
      }>(base, {
        fields:
          "id,name,status,effective_status,adset_id,campaign_id,created_time,updated_time,creative{id,name,thumbnail_url,title,body}",
        limit: "200",
      }),
      graphGetAll<RawInsight>(`/${act}/insights`, {
        fields: `ad_id,${INSIGHT_FIELDS}`,
        time_range: timeRange(data.since, data.until),
        level: "ad",
        limit: "300",
      }).catch(() => [] as RawInsight[]),
    ]);

    const byId = new Map<string, RawInsight[]>();
    for (const row of insights) {
      const key = row.ad_id ?? "";
      byId.set(key, [...(byId.get(key) ?? []), row]);
    }

    return ads.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      effectiveStatus: a.effective_status,
      adsetId: a.adset_id,
      campaignId: a.campaign_id,
      createdAt: a.created_time ?? null,
      updatedAt: a.updated_time ?? null,
      creative: a.creative
        ? {
            id: a.creative.id,
            name: a.creative.name ?? null,
            thumbnail: a.creative.thumbnail_url ?? null,
            title: a.creative.title ?? null,
            body: a.creative.body ?? null,
          }
        : null,
      metrics: byId.has(a.id) ? accumulate(byId.get(a.id)!) : emptyMetrics(),
    }));
  });

// ---------------------------------------------------------------- públicos

export const amListAudiences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string }) => z.object({ accountId: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const [custom, saved] = await Promise.all([
      graphGetAll<{
        id: string;
        name: string;
        subtype?: string;
        approximate_count_lower_bound?: number;
        delivery_status?: { description?: string };
        operation_status?: { description?: string };
        time_updated?: number;
        description?: string;
      }>(`/${act}/customaudiences`, {
        fields:
          "id,name,subtype,description,approximate_count_lower_bound,delivery_status,operation_status,time_updated",
        limit: "200",
      }).catch(() => []),
      graphGetAll<{ id: string; name: string; approximate_count?: number; time_updated?: number }>(
        `/${act}/saved_audiences`,
        { fields: "id,name,approximate_count,time_updated", limit: "200" },
      ).catch(() => []),
    ]);

    return {
      custom: custom.map((a) => ({
        id: a.id,
        name: a.name,
        subtype: a.subtype ?? "CUSTOM",
        description: a.description ?? null,
        size: a.approximate_count_lower_bound ?? null,
        status: a.delivery_status?.description ?? a.operation_status?.description ?? null,
        updatedAt: a.time_updated ? new Date(a.time_updated * 1000).toISOString() : null,
      })),
      saved: saved.map((a) => ({
        id: a.id,
        name: a.name,
        size: a.approximate_count ?? null,
        updatedAt: a.time_updated ? new Date(a.time_updated * 1000).toISOString() : null,
      })),
    };
  });

export const amCreateLookalike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; name: string; sourceId: string; ratio: number; country: string }) =>
    z
      .object({
        accountId: z.string().optional(),
        name: z.string().min(2).max(120),
        sourceId: z.string().min(3),
        ratio: z.number().min(1).max(10),
        country: z.string().length(2),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const res = await graphPost<{ id: string }>(`/${act}/customaudiences`, {
      name: data.name,
      subtype: "LOOKALIKE",
      origin_audience_id: data.sourceId,
      lookalike_spec: JSON.stringify({
        ratio: data.ratio / 100,
        country: data.country.toUpperCase(),
        type: "similarity",
      }),
    });
    await context.supabase.from("activity_logs").insert({
      user_id: context.userId,
      action: "ads.audience.lookalike_create",
      entity: "meta_custom_audience",
      entity_id: res.id,
      metadata: { name: data.name, sourceId: data.sourceId, ratio: data.ratio },
    });
    return res;
  });

// ---------------------------------------------------------------- criativos e mídia

export const amListCreatives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string }) => z.object({ accountId: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const creatives = await graphGetAll<{
      id: string;
      name?: string;
      title?: string;
      body?: string;
      thumbnail_url?: string;
      image_url?: string;
      object_type?: string;
      status?: string;
      call_to_action_type?: string;
    }>(`/${act}/adcreatives`, {
      fields:
        "id,name,title,body,thumbnail_url,image_url,object_type,status,call_to_action_type",
      limit: "200",
    });
    return creatives.map((c) => ({
      id: c.id,
      name: c.name ?? c.title ?? c.id,
      title: c.title ?? null,
      body: c.body ?? null,
      thumbnail: c.thumbnail_url ?? c.image_url ?? null,
      type: c.object_type ?? "UNKNOWN",
      status: c.status ?? null,
      cta: c.call_to_action_type ?? null,
    }));
  });

export const amListMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string }) => z.object({ accountId: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const [images, videos] = await Promise.all([
      graphGetAll<{
        hash: string;
        name?: string;
        url_128?: string;
        permalink_url?: string;
        width?: number;
        height?: number;
        created_time?: string;
      }>(`/${act}/adimages`, {
        fields: "hash,name,url_128,permalink_url,width,height,created_time",
        limit: "200",
      }).catch(() => []),
      graphGetAll<{ id: string; title?: string; picture?: string; created_time?: string; length?: number }>(
        `/${act}/advideos`,
        { fields: "id,title,picture,created_time,length", limit: "200" },
      ).catch(() => []),
    ]);

    return {
      images: images.map((i) => ({
        id: i.hash,
        name: i.name ?? i.hash,
        thumbnail: i.url_128 ?? null,
        link: i.permalink_url ?? null,
        size: i.width && i.height ? `${i.width}x${i.height}` : null,
        createdAt: i.created_time ?? null,
      })),
      videos: videos.map((v) => ({
        id: v.id,
        name: v.title ?? v.id,
        thumbnail: v.picture ?? null,
        duration: v.length ?? null,
        createdAt: v.created_time ?? null,
      })),
    };
  });

export const amUploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; name: string; base64: string }) =>
    z
      .object({
        accountId: z.string().optional(),
        name: z.string().min(1).max(160),
        base64: z.string().min(32).max(14_000_000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const clean = data.base64.includes(",") ? data.base64.split(",")[1]! : data.base64;
    const res = await graphPost<{ images?: Record<string, { hash: string }> }>(`/${act}/adimages`, {
      bytes: clean,
      name: data.name,
    });
    const hash = res.images ? Object.values(res.images)[0]?.hash ?? null : null;
    await context.supabase.from("activity_logs").insert({
      user_id: context.userId,
      action: "ads.media.upload",
      entity: "meta_adimage",
      entity_id: hash,
      metadata: { name: data.name, account: act },
    });
    return { hash };
  });

export const amDeleteImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; hash: string }) =>
    z.object({ accountId: z.string().optional(), hash: z.string().min(4) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const params = new URLSearchParams({ hash: data.hash, access_token: adsToken() });
    const res = await fetch(`https://graph.facebook.com/v21.0/${act}/adimages?${params}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    await context.supabase.from("activity_logs").insert({
      user_id: context.userId,
      action: "ads.media.delete",
      entity: "meta_adimage",
      entity_id: data.hash,
      metadata: { account: act },
    });
    return { ok: true };
  });

// ---------------------------------------------------------------- pixel

export const amListPixels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string }) => z.object({ accountId: z.string().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const pixels = await graphGetAll<{
      id: string;
      name?: string;
      last_fired_time?: string;
      creation_time?: string;
      is_unavailable?: boolean;
    }>(`/${act}/adspixels`, {
      fields: "id,name,last_fired_time,creation_time,is_unavailable",
      limit: "50",
    }).catch(() => []);

    const detailed = await Promise.all(
      pixels.map(async (p) => {
        const stats = await graphGet<{
          data?: Array<{ data?: Array<{ value?: string; event?: string; count?: number }> }>;
        }>(`/${p.id}/stats`, { aggregation: "event", start_time: "" }).catch(() => ({ data: [] }));
        const events = (stats.data?.[0]?.data ?? []).map((e) => ({
          event: e.event ?? e.value ?? "—",
          count: e.count ?? 0,
        }));
        return {
          id: p.id,
          name: p.name ?? p.id,
          lastFired: p.last_fired_time ?? null,
          createdAt: p.creation_time ?? null,
          available: !p.is_unavailable,
          events,
        };
      }),
    );
    return detailed;
  });

// ---------------------------------------------------------------- ações

async function logAudit(
  supabase: { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } },
  userId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    entity: "meta_ads",
    entity_id: entityId,
    metadata,
    level: "info",
  });
}

export const amSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: string; level?: string }) =>
    idSchema.extend({ status: STATUS, level: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    await graphPost(`/${data.id}`, { status: data.status });
    await logAudit(context.supabase as never, context.userId, "ads.status", data.id, {
      status: data.status,
      level: data.level ?? null,
    });
    return { ok: true, status: data.status };
  });

export const amUpdateBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; dailyBudget?: number; lifetimeBudget?: number }) =>
    idSchema
      .extend({ dailyBudget: z.number().min(1).optional(), lifetimeBudget: z.number().min(1).optional() })
      .refine((v) => v.dailyBudget !== undefined || v.lifetimeBudget !== undefined, {
        message: "Informe um orçamento",
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const body: Record<string, string> = {};
    if (data.dailyBudget !== undefined) body["daily_budget"] = String(Math.round(data.dailyBudget * 100));
    if (data.lifetimeBudget !== undefined)
      body["lifetime_budget"] = String(Math.round(data.lifetimeBudget * 100));
    await graphPost(`/${data.id}`, body);
    await logAudit(context.supabase as never, context.userId, "ads.budget", data.id, body);
    return { ok: true };
  });

export const amUpdateSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; startAt?: string; endAt?: string }) =>
    idSchema.extend({ startAt: z.string().optional(), endAt: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const body: Record<string, string> = {};
    if (data.startAt) body["start_time"] = new Date(data.startAt).toISOString();
    if (data.endAt) body["stop_time"] = new Date(data.endAt).toISOString();
    if (Object.keys(body).length === 0) throw new Error("Informe pelo menos uma data");
    await graphPost(`/${data.id}`, body);
    await logAudit(context.supabase as never, context.userId, "ads.schedule", data.id, body);
    return { ok: true };
  });

export const amUpdateBidStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; bidStrategy: string }) =>
    idSchema
      .extend({
        bidStrategy: z.enum([
          "LOWEST_COST_WITHOUT_CAP",
          "LOWEST_COST_WITH_BID_CAP",
          "COST_CAP",
          "LOWEST_COST_WITH_MIN_ROAS",
        ]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    await graphPost(`/${data.id}`, { bid_strategy: data.bidStrategy });
    await logAudit(context.supabase as never, context.userId, "ads.bid_strategy", data.id, {
      bidStrategy: data.bidStrategy,
    });
    return { ok: true };
  });

export const amRename = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; name: string }) =>
    idSchema.extend({ name: z.string().min(2).max(180) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    await graphPost(`/${data.id}`, { name: data.name });
    await logAudit(context.supabase as never, context.userId, "ads.rename", data.id, { name: data.name });
    return { ok: true };
  });

export const amDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; kind: string }) =>
    idSchema.extend({ kind: z.enum(["campaign", "adset", "ad"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const body: Record<string, string> = { status_option: "PAUSED" };
    if (data.kind === "campaign") body["deep_copy"] = "true";
    const res = await graphPost<{ copied_campaign_id?: string; ad_object_ids?: unknown }>(
      `/${data.id}/copies`,
      body,
    );
    await logAudit(context.supabase as never, context.userId, "ads.duplicate", data.id, {
      kind: data.kind,
      result: res,
    });
    return { ok: true };
  });

export const amDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; kind?: string }) =>
    idSchema.extend({ kind: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    await graphDelete(`/${data.id}`);
    await logAudit(context.supabase as never, context.userId, "ads.delete", data.id, {
      kind: data.kind ?? null,
    });
    return { ok: true };
  });

export const amBulkAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      ids: string[];
      action: string;
      dailyBudget?: number;
      percent?: number;
      startAt?: string;
      endAt?: string;
    }) =>
      z
        .object({
          ids: z.array(z.string().min(3)).min(1).max(100),
          action: z.enum([
            "activate",
            "pause",
            "archive",
            "delete",
            "duplicate",
            "budget",
            "budget_percent",
            "schedule",
          ]),
          dailyBudget: z.number().min(1).optional(),
          percent: z.number().min(-90).max(500).optional(),
          startAt: z.string().optional(),
          endAt: z.string().optional(),
        })
        .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const id of data.ids) {
      try {
        if (data.action === "activate") await graphPost(`/${id}`, { status: "ACTIVE" });
        else if (data.action === "pause") await graphPost(`/${id}`, { status: "PAUSED" });
        else if (data.action === "archive") await graphPost(`/${id}`, { status: "ARCHIVED" });
        else if (data.action === "delete") await graphDelete(`/${id}`);
        else if (data.action === "duplicate")
          await graphPost(`/${id}/copies`, { status_option: "PAUSED", deep_copy: "true" });
        else if (data.action === "budget") {
          if (data.dailyBudget === undefined) throw new Error("Orçamento não informado");
          await graphPost(`/${id}`, { daily_budget: String(Math.round(data.dailyBudget * 100)) });
        } else if (data.action === "budget_percent") {
          if (data.percent === undefined) throw new Error("Percentual não informado");
          const cur = await graphGet<{ daily_budget?: string }>(`/${id}`, { fields: "daily_budget" });
          const base = Number(cur.daily_budget ?? 0);
          if (!base) throw new Error("Campanha sem orçamento diário (CBO ausente)");
          const next = Math.max(100, Math.round(base * (1 + data.percent / 100)));
          await graphPost(`/${id}`, { daily_budget: String(next) });
        } else if (data.action === "schedule") {
          const body: Record<string, string> = {};
          if (data.startAt) body["start_time"] = new Date(data.startAt).toISOString();
          if (data.endAt) body["stop_time"] = new Date(data.endAt).toISOString();
          if (!Object.keys(body).length) throw new Error("Datas não informadas");
          await graphPost(`/${id}`, body);
        }
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: (err as Error).message });
      }
    }

    await logAudit(context.supabase as never, context.userId, `ads.bulk.${data.action}`, data.ids.join(","), {
      action: data.action,
      count: data.ids.length,
      failed: results.filter((r) => !r.ok).length,
    });

    return { results, ok: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
  });

// ---------------------------------------------------------------- criação

export const amCreateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      accountId?: string;
      name: string;
      objective: string;
      dailyBudget?: number;
      lifetimeBudget?: number;
      cbo: boolean;
      bidStrategy?: string;
      specialCategories?: string[];
      startAt?: string;
      endAt?: string;
    }) =>
      z
        .object({
          accountId: z.string().optional(),
          name: z.string().min(2).max(180),
          objective: z.enum([
            "OUTCOME_SALES",
            "OUTCOME_LEADS",
            "OUTCOME_TRAFFIC",
            "OUTCOME_ENGAGEMENT",
            "OUTCOME_AWARENESS",
            "OUTCOME_APP_PROMOTION",
          ]),
          dailyBudget: z.number().min(5).optional(),
          lifetimeBudget: z.number().min(20).optional(),
          cbo: z.boolean().default(true),
          bidStrategy: z
            .enum(["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP"])
            .optional(),
          specialCategories: z.array(z.string()).optional(),
          startAt: z.string().optional(),
          endAt: z.string().optional(),
        })
        .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const body: Record<string, string> = {
      name: data.name,
      objective: data.objective,
      status: "PAUSED",
      special_ad_categories: JSON.stringify(data.specialCategories ?? []),
    };
    if (data.cbo && data.dailyBudget) body["daily_budget"] = String(Math.round(data.dailyBudget * 100));
    if (data.cbo && data.lifetimeBudget)
      body["lifetime_budget"] = String(Math.round(data.lifetimeBudget * 100));
    if (data.bidStrategy) body["bid_strategy"] = data.bidStrategy;
    if (data.startAt) body["start_time"] = new Date(data.startAt).toISOString();
    if (data.endAt) body["stop_time"] = new Date(data.endAt).toISOString();

    const res = await graphPost<{ id: string }>(`/${act}/campaigns`, body);
    await logAudit(context.supabase as never, context.userId, "ads.campaign.create", res.id, {
      name: data.name,
      objective: data.objective,
      account: act,
    });
    return { id: res.id };
  });

// ---------------------------------------------------------------- histórico

export const amListAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);
    const { data, error } = await context.supabase
      .from("activity_logs")
      .select("id,action,entity,entity_id,metadata,level,created_at")
      .like("action", "ads.%")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------------------------------------------------------------- relatórios

export const amBuildReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId?: string; since: string; until: string; level: string }) =>
    rangeSchema.extend({ level: z.enum(["campaign", "adset", "ad"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);
    const nameField =
      data.level === "campaign" ? "campaign_name" : data.level === "adset" ? "adset_name" : "ad_name";
    const rows = await graphGetAll<RawInsight & Record<string, string>>(`/${act}/insights`, {
      fields: `${nameField},${INSIGHT_FIELDS}`,
      time_range: timeRange(data.since, data.until),
      level: data.level,
      limit: "400",
    });

    return rows.map((r) => {
      const m = accumulate([r]);
      return {
        name: (r[nameField] as string) ?? "—",
        spend: Number(m.spend.toFixed(2)),
        impressions: m.impressions,
        reach: m.reach,
        clicks: m.clicks,
        ctr: Number(m.ctr.toFixed(2)),
        cpc: Number(m.cpc.toFixed(2)),
        cpm: Number(m.cpm.toFixed(2)),
        conversions: m.conversions,
        cpa: Number(m.cpa.toFixed(2)),
        revenue: Number(m.revenue.toFixed(2)),
        roas: Number(m.roas.toFixed(2)),
      };
    });
  });

// ---------------------------------------------------------------- editor de criativo

/**
 * Atualiza o texto/criativo de um anúncio. A Meta não permite editar um
 * adcreative em veiculação, então criamos uma nova versão a partir da atual
 * (preservando página, Instagram e mídia) e a associamos ao mesmo anúncio.
 */
export const amUpdateAdCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      accountId?: string;
      adId: string;
      creativeId: string;
      name?: string;
      message?: string;
      title?: string;
      description?: string;
      cta?: string;
      link?: string;
      utm?: string;
    }) =>
      z
        .object({
          accountId: z.string().optional(),
          adId: z.string().min(3),
          creativeId: z.string().min(3),
          name: z.string().min(2).max(180).optional(),
          message: z.string().max(3000).optional(),
          title: z.string().max(300).optional(),
          description: z.string().max(600).optional(),
          cta: z.string().max(60).optional(),
          link: z.string().url().optional(),
          utm: z.string().max(500).optional(),
        })
        .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const act = normalizeAccount(data.accountId);

    type LinkData = {
      message?: string;
      name?: string;
      description?: string;
      link?: string;
      image_hash?: string;
      video_id?: string;
      call_to_action?: { type?: string; value?: { link?: string } };
    };
    type StorySpec = {
      page_id?: string;
      instagram_actor_id?: string;
      instagram_user_id?: string;
      link_data?: LinkData;
      video_data?: LinkData;
    };

    const current = await graphGet<{
      id: string;
      name?: string;
      object_story_spec?: StorySpec;
      url_tags?: string;
      asset_feed_spec?: unknown;
    }>(`/${data.creativeId}`, {
      fields: "id,name,object_story_spec,url_tags",
    });

    const spec: StorySpec = { ...(current.object_story_spec ?? {}) };
    const key: "link_data" | "video_data" = spec.video_data ? "video_data" : "link_data";
    const block: LinkData = { ...(spec[key] ?? {}) };

    if (data.message !== undefined) block.message = data.message;
    if (data.title !== undefined) block.name = data.title;
    if (data.description !== undefined) block.description = data.description;
    if (data.link !== undefined) {
      block.link = data.link;
      if (block.call_to_action?.value) block.call_to_action.value.link = data.link;
    }
    if (data.cta !== undefined && data.cta) {
      block.call_to_action = {
        type: data.cta,
        value: { link: data.link ?? block.link ?? block.call_to_action?.value?.link ?? "" },
      };
    }
    spec[key] = block;

    if (!spec.page_id) {
      throw new Error(
        "Este criativo não expõe a página de origem pela API. Edite o texto criando um novo anúncio.",
      );
    }

    const body: Record<string, string> = {
      name: data.name ?? `${current.name ?? "Criativo"} · v${Date.now().toString().slice(-5)}`,
      object_story_spec: JSON.stringify(spec),
    };
    const urlTags = data.utm ?? current.url_tags;
    if (urlTags) body["url_tags"] = urlTags;

    const created = await graphPost<{ id: string }>(`/${act}/adcreatives`, body);
    await graphPost(`/${data.adId}`, { creative: JSON.stringify({ creative_id: created.id }) });

    await logAudit(context.supabase as never, context.userId, "ads.creative.update", data.adId, {
      previousCreative: data.creativeId,
      newCreative: created.id,
    });

    return { creativeId: created.id };
  });
