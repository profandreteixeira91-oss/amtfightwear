// Auto-scaling algorithm for winning campaigns + embedding-based learning
// Used by both the user-facing server functions and the cron hook.

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

export type ScaleCampaign = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  budget_daily: number | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  ads_account_id: string | null;
};

export type ScaleDecision = {
  campaign_id: string;
  action: "scale_up" | "scale_down" | "pause" | "hold";
  previous_budget: number;
  new_budget: number;
  scale_pct: number;
  reason: string;
  metrics: { roas: number; ctr: number; cpa: number; spend: number; conversions: number };
};

const num = (v: unknown) => Number(v ?? 0);

// Guardrails
const MAX_SCALE_PCT = 0.2; // +20% per cycle
const MAX_DOWN_PCT = 0.3; // -30% per cycle
const HARD_MIN_DAILY = 5;
const HARD_MAX_DAILY = 5000;
const COOLDOWN_HOURS = 20; // no more than ~1 scale/day per campaign

export function decideScale(
  campaign: ScaleCampaign,
  insights: Insight[],
  lastScaleAt: string | null,
): ScaleDecision | null {
  if (insights.length === 0) return null;

  // Cooldown check
  if (lastScaleAt) {
    const hoursSince = (Date.now() - new Date(lastScaleAt).getTime()) / 3_600_000;
    if (hoursSince < COOLDOWN_HOURS) return null;
  }

  const sorted = [...insights].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = sorted.slice(-7);
  const spend = last7.reduce((s, i) => s + num(i.spend), 0);
  const revenue = last7.reduce((s, i) => s + num(i.revenue), 0);
  const conversions = last7.reduce((s, i) => s + num(i.conversions), 0);
  const clicks = last7.reduce((s, i) => s + num(i.clicks), 0);
  const impressions = last7.reduce((s, i) => s + num(i.impressions), 0);

  const roas = spend > 0 ? revenue / spend : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const metrics = { roas, ctr, cpa, spend, conversions };

  const daily = Math.max(HARD_MIN_DAILY, num(campaign.budget_daily) || 30);

  // Winner → scale up
  if (roas >= 3 && conversions >= 5 && spend >= daily * 5) {
    const newBudget = Math.min(HARD_MAX_DAILY, Math.round(daily * (1 + MAX_SCALE_PCT)));
    if (newBudget > daily) {
      return {
        campaign_id: campaign.id,
        action: "scale_up",
        previous_budget: daily,
        new_budget: newBudget,
        scale_pct: MAX_SCALE_PCT,
        reason: `ROAS ${roas.toFixed(2)}x com ${conversions} conversões — escalando +20%`,
        metrics,
      };
    }
  }

  // Loser → pause
  if (spend > daily * 3 && conversions === 0) {
    return {
      campaign_id: campaign.id,
      action: "pause",
      previous_budget: daily,
      new_budget: 0,
      scale_pct: -1,
      reason: `Gastou R$ ${spend.toFixed(2)} sem conversões — pausando`,
      metrics,
    };
  }

  // Underperformer with some conversions → scale down
  if (roas > 0 && roas < 1 && conversions >= 2 && spend >= daily * 3) {
    const newBudget = Math.max(HARD_MIN_DAILY, Math.round(daily * (1 - MAX_DOWN_PCT)));
    if (newBudget < daily) {
      return {
        campaign_id: campaign.id,
        action: "scale_down",
        previous_budget: daily,
        new_budget: newBudget,
        scale_pct: -MAX_DOWN_PCT,
        reason: `ROAS ${roas.toFixed(2)}x abaixo do break-even — reduzindo 30%`,
        metrics,
      };
    }
  }

  return null;
}

// ---------- Embeddings ----------

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding falhou: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const emb = json.data?.[0]?.embedding;
  if (!emb || emb.length !== EMBED_DIMS) throw new Error("Embedding inválido");
  return emb;
}

export const EMBEDDING_MODEL = EMBED_MODEL;
export const EMBEDDING_DIMS = EMBED_DIMS;
