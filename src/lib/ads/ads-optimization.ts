// Shared optimization/alerting logic used by both user-facing server fn and cron endpoint.
// Analyzes recent insights per campaign and produces alerts + recommendations.

type Insight = {
  date: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  revenue: number | null;
  ctr: number | null;
  cpa: number | null;
  roas: number | null;
};

type Campaign = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  budget_daily: number | null;
  meta_campaign_id: string | null;
};

type OptRow = {
  user_id: string;
  campaign_id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  reason: string;
  suggestion: Record<string, unknown>;
};

type AlertRow = {
  user_id: string;
  campaign_id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  metric: Record<string, unknown>;
};

const num = (v: unknown) => Number(v ?? 0);

export function analyzeCampaign(campaign: Campaign, insights: Insight[]) {
  const opts: OptRow[] = [];
  const alerts: AlertRow[] = [];

  if (insights.length === 0) return { opts, alerts };

  // Sort ascending by date
  const sorted = [...insights].sort((a, b) => a.date.localeCompare(b.date));

  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);

  const agg = (arr: Insight[]) => {
    const spend = arr.reduce((s, i) => s + num(i.spend), 0);
    const rev = arr.reduce((s, i) => s + num(i.revenue), 0);
    const conv = arr.reduce((s, i) => s + num(i.conversions), 0);
    const clicks = arr.reduce((s, i) => s + num(i.clicks), 0);
    const impr = arr.reduce((s, i) => s + num(i.impressions), 0);
    return {
      spend,
      revenue: rev,
      conversions: conv,
      clicks,
      impressions: impr,
      roas: spend > 0 ? rev / spend : 0,
      cpa: conv > 0 ? spend / conv : 0,
      ctr: impr > 0 ? (clicks / impr) * 100 : 0,
    };
  };

  const cur = agg(last7);
  const prev = agg(prev7);

  const daily = num(campaign.budget_daily) || 30;

  // 1) High spend, zero conversions
  if (cur.spend > daily * 3 && cur.conversions === 0) {
    opts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "pause_underperformer",
      severity: "critical",
      title: "Campanha sem conversões",
      reason: `Gastou R$ ${cur.spend.toFixed(2)} nos últimos 7 dias sem nenhuma conversão.`,
      suggestion: { action: "pause", metric: cur },
    });
    alerts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "no_conversions",
      severity: "critical",
      title: `${campaign.name}: sem conversões há 7 dias`,
      message: `Gasto de R$ ${cur.spend.toFixed(2)} sem retorno. Recomendamos pausar.`,
      metric: cur,
    });
  }

  // 2) ROAS drop >30%
  if (prev.roas > 0.5 && cur.roas > 0 && cur.roas < prev.roas * 0.7) {
    opts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "roas_drop",
      severity: "warning",
      title: "Queda de ROAS",
      reason: `ROAS caiu de ${prev.roas.toFixed(2)}x para ${cur.roas.toFixed(2)}x na última semana.`,
      suggestion: { action: "review_creatives", metric: { current: cur, previous: prev } },
    });
    alerts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "roas_drop",
      severity: "warning",
      title: `${campaign.name}: ROAS em queda`,
      message: `De ${prev.roas.toFixed(2)}x → ${cur.roas.toFixed(2)}x. Revise criativos e público.`,
      metric: { current: cur, previous: prev },
    });
  }

  // 3) ROAS excelente → escalar
  if (cur.roas >= 3 && cur.spend >= daily * 5 && cur.conversions >= 5) {
    opts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "scale_winner",
      severity: "info",
      title: "Escalar campanha vencedora",
      reason: `ROAS ${cur.roas.toFixed(2)}x com ${cur.conversions} conversões nos últimos 7 dias.`,
      suggestion: {
        action: "increase_budget",
        current_daily: daily,
        recommended_daily: Math.round(daily * 1.2),
      },
    });
    alerts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "scale_opportunity",
      severity: "info",
      title: `${campaign.name}: pronta para escalar`,
      message: `ROAS ${cur.roas.toFixed(2)}x. Sugestão: aumentar orçamento em 20%.`,
      metric: cur,
    });
  }

  // 4) CTR baixo (<0.5%) com volume
  if (cur.impressions > 5000 && cur.ctr < 0.5) {
    opts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "low_ctr",
      severity: "warning",
      title: "CTR abaixo do esperado",
      reason: `CTR de ${cur.ctr.toFixed(2)}% em ${cur.impressions.toLocaleString("pt-BR")} impressões.`,
      suggestion: { action: "refresh_creative", metric: cur },
    });
  }

  // 5) CPA alto (>2x preço do produto — sem preço disponível aqui, usamos vs prev)
  if (prev.cpa > 0 && cur.cpa > prev.cpa * 1.5 && cur.conversions > 0) {
    alerts.push({
      user_id: campaign.user_id,
      campaign_id: campaign.id,
      type: "cpa_spike",
      severity: "warning",
      title: `${campaign.name}: CPA subiu`,
      message: `CPA de R$ ${prev.cpa.toFixed(2)} → R$ ${cur.cpa.toFixed(2)}.`,
      metric: { current: cur, previous: prev },
    });
  }

  return { opts, alerts };
}

export async function runOptimizationForCampaigns(
  supabase: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          gte?: (a: string, b: string) => unknown;
        } & Promise<{ data: Insight[] | null; error: unknown }>;
      };
      upsert: (v: unknown, o: unknown) => Promise<{ error: { message: string } | null }>;
      insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
    };
  },
  campaigns: Campaign[],
) {
  let optsCreated = 0;
  let alertsCreated = 0;

  for (const c of campaigns) {
    const insightsRes = (await (supabase.from("ads_insights").select("*").eq(
      "campaign_id",
      c.id,
    ) as unknown as Promise<{ data: Insight[] | null }>));
    const { opts, alerts } = analyzeCampaign(c, insightsRes.data ?? []);

    if (opts.length > 0) {
      const rows = opts.map((o) => ({ ...o, status: "pending" }));
      const { error } = await supabase
        .from("ads_optimizations")
        .upsert(rows, { onConflict: "user_id,campaign_id,type", ignoreDuplicates: true });
      if (!error) optsCreated += opts.length;
    }
    if (alerts.length > 0) {
      const { error } = await supabase.from("ads_alerts").insert(alerts);
      if (!error) alertsCreated += alerts.length;
    }
  }

  return { optsCreated, alertsCreated, campaigns: campaigns.length };
}
