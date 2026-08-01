/**
 * Camada de consumo da Meta Marketing API para o módulo "Gerenciador de Anúncios".
 *
 * IMPORTANTE: não altera a integração existente. Reutiliza exatamente as mesmas
 * credenciais de sistema já configuradas (META_ADS_ACCESS_TOKEN / META_AD_ACCOUNT_ID)
 * usadas por `meta-ads-direct.functions.ts`.
 */

export const GRAPH = "https://graph.facebook.com/v21.0";

export function adsToken() {
  const token = process.env["META_ADS_ACCESS_TOKEN"];
  if (!token) throw new Error("META_ADS_ACCESS_TOKEN não configurado");
  return token;
}

export function defaultAccountId() {
  const id = process.env["META_AD_ACCOUNT_ID"];
  if (!id) throw new Error("META_AD_ACCOUNT_ID não configurado");
  return id.startsWith("act_") ? id : `act_${id}`;
}

export function normalizeAccount(accountId?: string | null) {
  if (!accountId) return defaultAccountId();
  return accountId.startsWith("act_") ? accountId : `act_${accountId}`;
}

type GraphError = { error?: { message?: string; error_user_msg?: string } };

async function request<T>(url: string, init?: RequestInit, attempt = 0): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as T & GraphError;
  if (json.error) {
    const msg = json.error.error_user_msg || json.error.message || "Erro na Meta API";
    // Retry automático para limites de taxa / falhas transitórias.
    if (attempt < 2 && /rate limit|reduce the amount|try again|temporarily/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      return request<T>(url, init, attempt + 1);
    }
    throw new Error(msg);
  }
  return json;
}

export async function graphGet<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const params = new URLSearchParams({ ...query, access_token: adsToken() });
  return request<T>(`${GRAPH}${path}?${params.toString()}`);
}

export async function graphPost<T>(path: string, body: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ ...body, access_token: adsToken() });
  return request<T>(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
}

export async function graphDelete<T>(path: string): Promise<T> {
  const params = new URLSearchParams({ access_token: adsToken() });
  return request<T>(`${GRAPH}${path}?${params.toString()}`, { method: "DELETE" });
}

/** Lê todas as páginas de um endpoint de lista (com limite de segurança). */
export async function graphGetAll<T>(
  path: string,
  query: Record<string, string> = {},
  maxPages = 5,
): Promise<T[]> {
  let out: T[] = [];
  let next: string | null = `${GRAPH}${path}?${new URLSearchParams({
    ...query,
    access_token: adsToken(),
  }).toString()}`;
  let page = 0;
  while (next && page < maxPages) {
    const json: { data?: T[]; paging?: { next?: string } } = await request(next);
    out = out.concat(json.data ?? []);
    next = json.paging?.next ?? null;
    page += 1;
  }
  return out;
}

// ---------- helpers de métricas ----------

export type RawInsight = {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  date_start?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
};

export type Metrics = {
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  revenue: number;
  cpa: number;
  roas: number;
};

const CONVERSION_TYPES = [
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "lead",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.messaging_conversation_started_7d",
  "complete_registration",
];

export function emptyMetrics(): Metrics {
  return {
    impressions: 0,
    reach: 0,
    frequency: 0,
    clicks: 0,
    spend: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    conversions: 0,
    revenue: 0,
    cpa: 0,
    roas: 0,
  };
}

function sumActions(list: Array<{ action_type: string; value: string }> | undefined) {
  if (!list) return 0;
  return list
    .filter((a) => CONVERSION_TYPES.includes(a.action_type))
    .reduce((acc, a) => acc + Number(a.value || 0), 0);
}

export function accumulate(rows: RawInsight[]): Metrics {
  const m = emptyMetrics();
  let reachMax = 0;
  for (const r of rows) {
    m.impressions += Number(r.impressions ?? 0);
    m.clicks += Number(r.clicks ?? 0);
    m.spend += Number(r.spend ?? 0);
    m.conversions += sumActions(r.actions);
    m.revenue += sumActions(r.action_values);
    reachMax += Number(r.reach ?? 0);
  }
  m.reach = reachMax;
  m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
  m.cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
  m.cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
  m.cpa = m.conversions > 0 ? m.spend / m.conversions : 0;
  m.roas = m.spend > 0 ? m.revenue / m.spend : 0;
  m.frequency = m.reach > 0 ? m.impressions / m.reach : 0;
  return m;
}

export const INSIGHT_FIELDS =
  "impressions,reach,frequency,clicks,spend,ctr,cpc,cpm,actions,action_values";

export function timeRange(since: string, until: string) {
  return JSON.stringify({ since, until });
}

export function money(v?: string | null) {
  return v ? Number(v) / 100 : null;
}
