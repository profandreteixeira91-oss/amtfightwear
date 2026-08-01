import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";

const GRAPH = "https://graph.facebook.com/v21.0";

function getAccessToken() {
  const token = process.env["META_ADS_ACCESS_TOKEN"];
  if (!token) throw new Error("META_ADS_ACCESS_TOKEN não configurado");
  return token;
}

function getAccountId() {
  const id = process.env["META_AD_ACCOUNT_ID"];
  if (!id) throw new Error("META_AD_ACCOUNT_ID não configurado");
  return id.startsWith("act_") ? id : `act_${id}`;
}

async function graphFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${token}`);
  const json = (await res.json()) as T & { error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json;
}

export const getDirectMetaAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertSaasOwner(context);
  const account = await graphFetch<{
    id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name: string;
    amount_spent?: string;
    balance?: string;
    spend_cap?: string;
  }>(`/${getAccountId()}?fields=id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap`);

  return {
    id: account.id,
    name: account.name,
    status: account.account_status === 1 ? "active" : "inactive",
    currency: account.currency,
    timezone: account.timezone_name,
    spent: Number(account.amount_spent ?? 0) / 100,
    balance: Number(account.balance ?? 0) / 100,
    spendCap: account.spend_cap ? Number(account.spend_cap) / 100 : null,
  };
});

export const getDirectMetaCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await assertSaasOwner(context);
  const data = await graphFetch<{
    data: Array<{
      id: string;
      name: string;
      status: string;
      effective_status: string;
      objective: string;
      daily_budget?: string;
      lifetime_budget?: string;
      budget_remaining?: string;
      start_time?: string;
      stop_time?: string;
      created_time: string;
      updated_time: string;
    }>;
  }>(`/${getAccountId()}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time&limit=200`);

  return data.data.map((c) => ({
    metaCampaignId: c.id,
    name: c.name,
    status: c.status.toLowerCase(),
    effectiveStatus: c.effective_status.toLowerCase(),
    objective: c.objective,
    dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
    lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
    budgetRemaining: c.budget_remaining ? Number(c.budget_remaining) / 100 : null,
    startAt: c.start_time ?? null,
    stopAt: c.stop_time ?? null,
    createdAt: c.created_time,
    updatedAt: c.updated_time,
  }));
});

const dateRangeSchema = z.object({
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getDirectMetaInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { since: string; until: string }) => dateRangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const dataRes = await graphFetch<{
      data: Array<{
        campaign_id: string;
        campaign_name: string;
        date_start: string;
        date_stop: string;
        impressions: string;
        clicks: string;
        spend: string;
        ctr?: string;
        cpc?: string;
        cpm?: string;
        conversions?: Array<{ action_type: string; value: string }>;
        actions?: Array<{ action_type: string; value: string }>;
      }>;
    }>(
      `/${getAccountId()}/insights?fields=campaign_id,campaign_name,date_start,date_stop,impressions,clicks,spend,ctr,cpc,cpm,conversions,actions&time_range={"since":"${data.since}","until":"${data.until}"}&level=campaign&limit=500`,
    );

    return dataRes.data.map((i) => {
      const conversions = i.conversions ?? i.actions ?? [];
      const purchase = conversions.find((a) => a.action_type === "purchase")?.value ?? "0";
      const leads = conversions.find((a) => a.action_type === "lead")?.value ?? "0";

      return {
        campaignId: i.campaign_id,
        campaignName: i.campaign_name,
        date: i.date_start,
        impressions: Number(i.impressions ?? 0),
        clicks: Number(i.clicks ?? 0),
        spend: Number(i.spend ?? 0),
        ctr: i.ctr ? Number(i.ctr) : null,
        cpc: i.cpc ? Number(i.cpc) : null,
        cpm: i.cpm ? Number(i.cpm) : null,
        conversions: Number(purchase) + Number(leads),
      };
    });
  });

export const toggleDirectMetaCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string; active: boolean }) =>
    z.object({ campaignId: z.string(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const token = getAccessToken();
    const status = data.active ? "ACTIVE" : "PAUSED";

    const res = await fetch(`${GRAPH}/${data.campaignId}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ status, access_token: token }),
    });
    const json = (await res.json()) as { success?: boolean; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return { ok: true, status: status.toLowerCase() };
  });

export const updateDirectMetaCampaignBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { campaignId: string; dailyBudget?: number; lifetimeBudget?: number }) =>
    z
      .object({
        campaignId: z.string(),
        dailyBudget: z.number().optional(),
        lifetimeBudget: z.number().optional(),
      })
      .refine((v) => v.dailyBudget !== undefined || v.lifetimeBudget !== undefined, {
        message: "Informe dailyBudget ou lifetimeBudget",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);
    const token = getAccessToken();
    const params = new URLSearchParams({ access_token: token });
    if (data.dailyBudget !== undefined) params.set("daily_budget", String(Math.round(data.dailyBudget * 100)));
    if (data.lifetimeBudget !== undefined) params.set("lifetime_budget", String(Math.round(data.lifetimeBudget * 100)));

    const res = await fetch(`${GRAPH}/${data.campaignId}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const json = (await res.json()) as { success?: boolean; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return { ok: true };
  });

/**
 * Conclui a configuração da conta Ads Manager sem depender do OAuth do
 * Instagram Hub: usa o token de sistema (META_ADS_ACCESS_TOKEN) para listar
 * as contas de anúncio acessíveis e gravá-las em `ads_accounts`.
 */
export const syncDirectMetaAdAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSaasOwner(context);

    const configured = getAccountId();
    let accounts: Array<{
      id: string;
      name?: string;
      currency?: string;
      timezone_name?: string;
      account_status?: number;
      business?: { id?: string };
    }> = [];

    try {
      const res = await graphFetch<{ data?: typeof accounts }>(
        `/me/adaccounts?fields=id,name,currency,timezone_name,account_status,business&limit=200`,
      );
      accounts = res.data ?? [];
    } catch {
      accounts = [];
    }

    if (!accounts.some((a) => a.id === configured)) {
      const one = await graphFetch<(typeof accounts)[number]>(
        `/${configured}?fields=id,name,currency,timezone_name,account_status,business`,
      );
      accounts.push(one);
    }

    for (const a of accounts) {
      await context.supabase.from("ads_accounts").upsert(
        {
          user_id: context.userId,
          act_id: a.id,
          name: a.name ?? a.id,
          currency: a.currency ?? null,
          timezone: a.timezone_name ?? null,
          business_id: a.business?.id ?? null,
          status: a.account_status === 1 ? "active" : "inactive",
        },
        { onConflict: "user_id,act_id" },
      );
    }

    return { synced: accounts.length, configured };
  });
