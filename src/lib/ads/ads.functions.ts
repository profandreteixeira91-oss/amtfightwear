import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Schemas ----------

const BriefingInput = z.object({
  productName: z.string().min(1),
  productId: z.string().uuid().optional().nullable(),
  objective: z.enum([
    "sales",
    "leads",
    "messages",
    "whatsapp",
    "awareness",
    "catalog",
    "traffic",
    "app",
    "conversions",
  ]),
  price: z.number().nullable().optional(),
  margin: z.number().nullable().optional(),
  offer: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  ageRange: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  interests: z.array(z.string()).default([]),
  competitors: z.string().nullable().optional(),
  brandTone: z.string().nullable().optional(),
  revenueGoal: z.number().nullable().optional(),
  budgetDaily: z.number().nullable().optional(),
  budgetTotal: z.number().nullable().optional(),
});

const ObjectiveLabels: Record<string, string> = {
  sales: "Vendas / Conversões",
  leads: "Geração de leads",
  messages: "Mensagens (Messenger/DM)",
  whatsapp: "Conversas no WhatsApp",
  awareness: "Reconhecimento de marca",
  catalog: "Vendas de catálogo",
  traffic: "Tráfego para o site",
  app: "Instalação de aplicativo",
  conversions: "Conversões no site",
};

// ---------- AI helpers ----------

async function loadGateway() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada");
  const { generateText } = await import("ai");
  const { createLovableAiGateway } = await import("../ai-gateway.server");
  return { gateway: createLovableAiGateway(apiKey), generateText };
}


type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
function extractJson(text: string): JsonValue {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta da IA sem JSON");
  return JSON.parse(match[0]) as JsonValue;
}

// ---------- Briefings ----------

export const createBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => BriefingInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ads_briefings")
      .insert({
        user_id: context.userId,
        product_name: data.productName,
        product_id: data.productId ?? null,
        objective: data.objective,
        price: data.price ?? null,
        margin: data.margin ?? null,
        offer: data.offer ?? null,
        deadline: data.deadline ?? null,
        region: data.region ?? null,
        age_range: data.ageRange ?? null,
        gender: data.gender ?? null,
        interests: data.interests ?? [],
        competitors: data.competitors ?? null,
        brand_tone: data.brandTone ?? null,
        revenue_goal: data.revenueGoal ?? null,
        budget_daily: data.budgetDaily ?? null,
        budget_total: data.budgetTotal ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getBriefing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ads_briefings")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- IA Estratégica ----------

export const generateAdsStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ briefingId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase
      .from("ads_briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (error) throw new Error(error.message);

    const { gateway, generateText } = await loadGateway();
    const prompt = `Você é consultor sênior de tráfego pago Meta Ads. Monte a estratégia ideal para a campanha abaixo.

Produto: ${b.product_name}
Objetivo: ${ObjectiveLabels[b.objective] ?? b.objective}
Preço: ${b.price ? `R$ ${b.price}` : "não informado"}
Oferta: ${b.offer ?? "—"}
Região: ${b.region ?? "Brasil"}
Público-alvo idade: ${b.age_range ?? "—"}
Interesses: ${(b.interests ?? []).join(", ") || "—"}
Concorrentes: ${b.competitors ?? "—"}
Tom da marca: ${b.brand_tone ?? "—"}
Meta de faturamento: ${b.revenue_goal ? `R$ ${b.revenue_goal}` : "—"}
Orçamento diário desejado: ${b.budget_daily ? `R$ ${b.budget_daily}` : "sugerir"}

Devolva SOMENTE JSON no formato:
{
  "funnel": ["Topo de funil", "Meio", "Fundo"],
  "campaign_type": "string (tipo recomendado no Meta Ads)",
  "structure": "descrição curta da estrutura ideal",
  "adsets_count": number,
  "ads_per_adset": number,
  "recommended_budget_daily": number,
  "recommended_budget_total": number,
  "estimated_reach": "faixa em texto (ex: 40k-80k pessoas/dia)",
  "estimated_impressions": "faixa",
  "estimated_clicks": "faixa",
  "estimated_conversions": "faixa",
  "estimated_cpa": number,
  "estimated_roas": number,
  "rationale": "3 a 5 frases explicando a escolha",
  "warnings": ["riscos ou pontos de atenção"]
}`;

    const { text } = await generateText({
      model: gateway("gemini-2.5-pro"),
      prompt,
    });
    const strategy = extractJson(text);

    await context.supabase
      .from("ads_briefings")
      .update({ strategy: strategy as never })
      .eq("id", b.id);
    return strategy;
  });

// ---------- IA de Público ----------

export const suggestAudiences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ briefingId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase
      .from("ads_briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (error) throw new Error(error.message);

    const { gateway, generateText } = await loadGateway();
    const prompt = `Você é especialista em segmentação Meta Ads. Sugira públicos para:
Produto: ${b.product_name}
Objetivo: ${ObjectiveLabels[b.objective] ?? b.objective}
Região: ${b.region ?? "Brasil"}
Interesses base: ${(b.interests ?? []).join(", ") || "—"}

Devolva SOMENTE JSON:
{
  "interests": [{"name":"","reason":"","size":"pequeno|médio|grande"}],
  "lookalike": [{"source":"","percent":1}],
  "remarketing": [{"name":"","description":""}],
  "exclusions": ["públicos a excluir para evitar conflito"]
}`;
    const { text } = await generateText({
      model: gateway("gemini-2.5-pro"),
      prompt,
    });
    const audiences = extractJson(text);
    await context.supabase
      .from("ads_briefings")
      .update({ audiences: audiences as never })
      .eq("id", b.id);
    return audiences;
  });

// ---------- IA de Orçamento ----------

export const estimateBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ briefingId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase
      .from("ads_briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (error) throw new Error(error.message);

    const { gateway, generateText } = await loadGateway();
    const prompt = `Estime o orçamento ideal para essa campanha Meta Ads.
Produto: ${b.product_name} — preço R$ ${b.price ?? "?"}
Objetivo: ${ObjectiveLabels[b.objective] ?? b.objective}
Meta de faturamento mensal: R$ ${b.revenue_goal ?? "?"}
Orçamento diário informado: R$ ${b.budget_daily ?? "sugerir"}

Devolva SOMENTE JSON:
{
  "daily_budget": number,
  "monthly_budget": number,
  "expected_cpa": number,
  "expected_roas": number,
  "expected_sales": number,
  "expected_impressions": number,
  "expected_clicks": number,
  "expected_conversions": number,
  "notes": "explicação curta em português"
}`;
    const { text } = await generateText({
      model: gateway("gemini-2.5-pro"),
      prompt,
    });
    const budget = extractJson(text);
    await context.supabase
      .from("ads_briefings")
      .update({ budget_estimate: budget as never })
      .eq("id", b.id);
    return budget;
  });

// ---------- IA de Copy ----------

const CopyInput = z.object({
  briefingId: z.string().uuid(),
  variants: z.number().min(1).max(5).default(3),
});

export const generateAdCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CopyInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase
      .from("ads_briefings")
      .select("*")
      .eq("id", data.briefingId)
      .single();
    if (error) throw new Error(error.message);

    const { gateway, generateText } = await loadGateway();
    const prompt = `Você é copywriter especialista em Meta Ads (Facebook/Instagram).
Gere ${data.variants} variações de copy para anúncio.

Produto: ${b.product_name}
Preço: R$ ${b.price ?? "?"}
Oferta: ${b.offer ?? "—"}
Objetivo: ${ObjectiveLabels[b.objective] ?? b.objective}
Público: ${b.age_range ?? ""} ${b.gender ?? ""} ${b.region ?? "Brasil"}
Interesses: ${(b.interests ?? []).join(", ") || "—"}
Tom da marca: ${b.brand_tone ?? "próximo e persuasivo"}

Devolva SOMENTE JSON:
{
  "variants": [
    {
      "headline": "máx 40 chars",
      "primary_text": "texto principal 3-5 linhas com gatilhos mentais",
      "description": "descrição curta",
      "cta": "SAIBA MAIS | COMPRAR AGORA | FALE NO WHATSAPP etc",
      "hashtags": ["#tag1","#tag2"],
      "triggers": ["urgência","escassez","autoridade","prova social","benefício"],
      "quality_score": 0,
      "click_potential": "Baixo|Médio|Alto|Muito Alto",
      "conversion_potential": "Regular|Bom|Excelente"
    }
  ]
}
Notas de qualidade sinceras (0-10).`;

    const { text } = await generateText({
      model: gateway("gemini-2.5-pro"),
      prompt,
    });
    const parsed = extractJson(text) as { variants: Array<Record<string, unknown>> };

    const rows = (parsed.variants ?? []).map((v) => ({
      user_id: context.userId,
      briefing_id: b.id,
      headline: String(v.headline ?? ""),
      primary_text: String(v.primary_text ?? ""),
      description: String(v.description ?? "") || null,
      cta: String(v.cta ?? "") || null,
      hashtags: (v.hashtags as string[]) ?? [],
      triggers: (v.triggers as string[]) ?? [],
      quality_score: Number(v.quality_score ?? 0),
      click_potential: String(v.click_potential ?? "") || null,
      conversion_potential: String(v.conversion_potential ?? "") || null,
    }));

    const { data: inserted, error: iErr } = await context.supabase
      .from("ads_copies")
      .insert(rows)
      .select();
    if (iErr) throw new Error(iErr.message);
    return inserted;
  });

// ---------- Campaigns ----------

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        briefingId: z.string().uuid(),
        name: z.string().min(1),
        budgetDaily: z.number().nullable().optional(),
        budgetTotal: z.number().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: b } = await context.supabase
      .from("ads_briefings")
      .select("objective,strategy")
      .eq("id", data.briefingId)
      .single();

    const { data: row, error } = await context.supabase
      .from("ads_campaigns")
      .insert({
        user_id: context.userId,
        briefing_id: data.briefingId,
        name: data.name,
        objective: b?.objective ?? "sales",
        status: "draft",
        budget_daily: data.budgetDaily ?? null,
        budget_total: data.budgetTotal ?? null,
        strategy: b?.strategy ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Library ----------

export const listCopies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads_copies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });

export const toggleCopyFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), value: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ads_copies")
      .update({ is_favorite: data.value })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ads_copies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCreatives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads_creatives")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data;
  });

export const saveCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        briefingId: z.string().uuid().nullable().optional(),
        format: z.string(),
        aspect: z.string().nullable().optional(),
        imageUrl: z.string(),
        prompt: z.string().nullable().optional(),
        palette: z.array(z.string()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ads_creatives")
      .insert({
        user_id: context.userId,
        briefing_id: data.briefingId ?? null,
        format: data.format,
        aspect: data.aspect ?? null,
        image_url: data.imageUrl,
        prompt: data.prompt ?? null,
        palette: data.palette ?? [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ads_creatives")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Dashboard ----------

export const getAdsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = process.env["META_ADS_ACCESS_TOKEN"];
    const accountId = process.env["META_AD_ACCOUNT_ID"];
    const useReal = Boolean(token && accountId);

    if (useReal) {
      try {
        return await getRealMetaDashboard(token!, accountId!);
      } catch {
        // fallback silencioso para dados locais
      }
    }

    const [{ data: campaigns }, { data: insights }, { data: accounts }] = await Promise.all([
      context.supabase.from("ads_campaigns").select("id,status,budget_daily"),
      context.supabase
        .from("ads_insights")
        .select("date,spend,impressions,clicks,ctr,cpm,cpc,cpa,conversions,revenue,roas")
        .order("date", { ascending: false })
        .limit(90),
      context.supabase.from("ads_accounts").select("id,name,status,currency,pixel_status"),
    ]);

    const active = (campaigns ?? []).filter((c) => c.status === "active").length;
    const paused = (campaigns ?? []).filter((c) => c.status === "paused").length;

    const today = todayISO();
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthKey = monthStart.toISOString().slice(0, 10);

    const spendToday = (insights ?? [])
      .filter((i) => i.date === today)
      .reduce((s, i) => s + Number(i.spend ?? 0), 0);
    const spendMonth = (insights ?? [])
      .filter((i) => i.date >= monthKey)
      .reduce((s, i) => s + Number(i.spend ?? 0), 0);
    const revenueMonth = (insights ?? [])
      .filter((i) => i.date >= monthKey)
      .reduce((s, i) => s + Number(i.revenue ?? 0), 0);
    const conversionsMonth = (insights ?? [])
      .filter((i) => i.date >= monthKey)
      .reduce((s, i) => s + Number(i.conversions ?? 0), 0);
    const clicksMonth = (insights ?? [])
      .filter((i) => i.date >= monthKey)
      .reduce((s, i) => s + Number(i.clicks ?? 0), 0);
    const impressionsMonth = (insights ?? [])
      .filter((i) => i.date >= monthKey)
      .reduce((s, i) => s + Number(i.impressions ?? 0), 0);

    const roas = spendMonth > 0 ? revenueMonth / spendMonth : 0;
    const cpa = conversionsMonth > 0 ? spendMonth / conversionsMonth : 0;
    const ctr = impressionsMonth > 0 ? (clicksMonth / impressionsMonth) * 100 : 0;
    const cpm = impressionsMonth > 0 ? (spendMonth / impressionsMonth) * 1000 : 0;
    const cpc = clicksMonth > 0 ? spendMonth / clicksMonth : 0;

    return {
      accounts: accounts ?? [],
      campaigns: { total: campaigns?.length ?? 0, active, paused },
      kpis: {
        spendToday,
        spendMonth,
        revenueMonth,
        conversionsMonth,
        roas,
        cpa,
        ctr,
        cpm,
        cpc,
      },
      series: (insights ?? []).slice(0, 30).reverse(),
      source: "local",
    };
  });

async function graphFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${META_API}${path}${path.includes("?") ? "&" : "?"}access_token=${token}`);
  const json = (await res.json()) as T & { error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json;
}

async function getRealMetaDashboard(token: string, rawAccountId: string) {
  const accountId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;

  const [account, campaignsData, insightsData] = await Promise.all([
    graphFetch<{
      id: string;
      name: string;
      account_status: number;
      currency: string;
      amount_spent?: string;
    }>(`/${accountId}?fields=id,name,account_status,currency,amount_spent`, token),
    graphFetch<{
      data: Array<{
        id: string;
        name: string;
        status: string;
        effective_status: string;
        objective: string;
        daily_budget?: string;
        lifetime_budget?: string;
        budget_remaining?: string;
      }>;
    }>(`/${accountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining&limit=200`, token),
    (async () => {
      const today = new Date();
      const since = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const until = today.toISOString().slice(0, 10);
      return graphFetch<{
        data: Array<{
          date_start: string;
          spend: string;
          impressions: string;
          clicks: string;
          ctr?: string;
          cpm?: string;
          cpc?: string;
          actions?: Array<{ action_type: string; value: string }>;
        }>;
      }>(`/${accountId}/insights?fields=date_start,spend,impressions,clicks,ctr,cpm,cpc,actions&time_range={"since":"${since}","until":"${until}"}&level=account&limit=500`, token);
    })(),
  ]);

  const campaigns = campaignsData.data ?? [];
  const active = campaigns.filter((c) => c.effective_status === "ACTIVE").length;
  const paused = campaigns.filter((c) => c.effective_status === "PAUSED").length;

  const insights = insightsData.data ?? [];
  const todayKey = todayISO();
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthKey = monthStart.toISOString().slice(0, 10);

  const spendToday = insights
    .filter((i) => i.date_start === todayKey)
    .reduce((s, i) => s + Number(i.spend ?? 0), 0);
  const spendMonth = insights
    .filter((i) => i.date_start >= monthKey)
    .reduce((s, i) => s + Number(i.spend ?? 0), 0);
  const clicksMonth = insights
    .filter((i) => i.date_start >= monthKey)
    .reduce((s, i) => s + Number(i.clicks ?? 0), 0);
  const impressionsMonth = insights
    .filter((i) => i.date_start >= monthKey)
    .reduce((s, i) => s + Number(i.impressions ?? 0), 0);
  const conversionsMonth = insights
    .filter((i) => i.date_start >= monthKey)
    .reduce((s, i) => {
      const actions = i.actions ?? [];
      const purchases = Number(actions.find((a) => a.action_type === "purchase")?.value ?? 0);
      const leads = Number(actions.find((a) => a.action_type === "lead")?.value ?? 0);
      return s + purchases + leads;
    }, 0);

  const ctr = impressionsMonth > 0 ? (clicksMonth / impressionsMonth) * 100 : 0;
  const cpm = impressionsMonth > 0 ? (spendMonth / impressionsMonth) * 1000 : 0;
  const cpc = clicksMonth > 0 ? spendMonth / clicksMonth : 0;
  const cpa = conversionsMonth > 0 ? spendMonth / conversionsMonth : 0;

  const series = insights.slice(0, 30).map((i) => ({
    date: i.date_start,
    spend: Number(i.spend ?? 0),
    revenue: 0,
  }));

  return {
    accounts: [
      {
        id: account.id,
        name: account.name,
        status: account.account_status === 1 ? "active" : "inactive",
        currency: account.currency,
        pixel_status: null,
      },
    ],
    campaigns: { total: campaigns.length, active, paused },
    kpis: {
      spendToday,
      spendMonth,
      revenueMonth: 0,
      conversionsMonth,
      roas: 0,
      cpa,
      ctr,
      cpm,
      cpc,
    },
    series: series.reverse(),
    source: "meta",
  };
}

// ---------- Meta ad accounts sync ----------

type MetaAdAccount = {
  id: string;
  name: string;
  currency?: string;
  timezone_name?: string;
  business?: { id: string };
};

export const syncMetaAdAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conn, error } = await context.supabase
      .from("meta_connections")
      .select("id,page_access_token")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conn) throw new Error("Conecte primeiro sua conta Meta em Conexões");

    const token = conn.page_access_token;
    if (!token) throw new Error("Token Meta indisponível");

    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,currency,timezone_name,business&access_token=${token}`,
    );
    const json = (await res.json()) as { data?: MetaAdAccount[]; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    const accounts = json.data ?? [];

    for (const a of accounts) {
      await context.supabase.from("ads_accounts").upsert(
        {
          user_id: context.userId,
          meta_connection_id: conn.id,
          act_id: a.id,
          name: a.name,
          currency: a.currency ?? null,
          timezone: a.timezone_name ?? null,
          business_id: a.business?.id ?? null,
          status: "active",
        },
        { onConflict: "user_id,act_id" },
      );
    }
    return { synced: accounts.length };
  });

export const listAdsAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

// ---------- Meta Graph helpers ----------

const META_API = "https://graph.facebook.com/v21.0";

const OBJECTIVE_MAP: Record<string, string> = {
  sales: "OUTCOME_SALES",
  leads: "OUTCOME_LEADS",
  messages: "OUTCOME_ENGAGEMENT",
  whatsapp: "OUTCOME_ENGAGEMENT",
  awareness: "OUTCOME_AWARENESS",
  traffic: "OUTCOME_TRAFFIC",
  app: "OUTCOME_APP_PROMOTION",
  conversions: "OUTCOME_SALES",
  catalog: "OUTCOME_SALES",
};

async function metaPost(path: string, token: string, body: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    params.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  params.set("access_token", token);
  const res = await fetch(`${META_API}${path}`, { method: "POST", body: params });
  const json = (await res.json()) as { id?: string; error?: { message: string } };
  if (json.error) throw new Error(`Meta: ${json.error.message}`);
  return json;
}

async function metaGet(path: string, token: string, query: Record<string, string> = {}) {
  const params = new URLSearchParams({ ...query, access_token: token });
  const res = await fetch(`${META_API}${path}?${params}`);
  const json = (await res.json()) as { data?: unknown[]; error?: { message: string } };
  if (json.error) throw new Error(`Meta: ${json.error.message}`);
  return json;
}

// ---------- Publish campaign to Meta ----------

const PublishInput = z.object({
  campaignId: z.string().uuid(),
  adsAccountId: z.string().uuid(),
  copyId: z.string().uuid(),
  creativeId: z.string().uuid().nullable().optional(),
  pageId: z.string().nullable().optional(),
  instagramId: z.string().nullable().optional(),
  linkUrl: z.string().url(),
  countries: z.array(z.string()).default(["BR"]),
  ageMin: z.number().min(13).max(65).default(18),
  ageMax: z.number().min(13).max(65).default(65),
  activate: z.boolean().default(false),
});

export const publishCampaignToMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PublishInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: campaign, error: cErr } = await context.supabase
      .from("ads_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .single();
    if (cErr || !campaign) throw new Error("Campanha não encontrada");

    const { data: account, error: aErr } = await context.supabase
      .from("ads_accounts")
      .select("*, meta_connection:meta_connections(page_access_token,page_id,instagram_business_account_id)")
      .eq("id", data.adsAccountId)
      .single();
    if (aErr || !account) throw new Error("Conta de anúncio não encontrada");

    const conn = account.meta_connection as {
      page_access_token: string;
      page_id: string | null;
      instagram_business_account_id: string | null;
    } | null;
    const token = conn?.page_access_token;
    if (!token) throw new Error("Token Meta indisponível — reconecte sua conta");

    const { data: copy } = await context.supabase
      .from("ads_copies")
      .select("*")
      .eq("id", data.copyId)
      .single();
    if (!copy) throw new Error("Copy não encontrado");

    const creative = data.creativeId
      ? (await context.supabase.from("ads_creatives").select("*").eq("id", data.creativeId).single()).data
      : null;

    const act = account.act_id.startsWith("act_") ? account.act_id : `act_${account.act_id}`;
    const objective = OBJECTIVE_MAP[campaign.objective] ?? "OUTCOME_TRAFFIC";

    try {
      // 1) Campaign
      const campaignRes = await metaPost(`/${act}/campaigns`, token, {
        name: campaign.name,
        objective,
        status: data.activate ? "ACTIVE" : "PAUSED",
        special_ad_categories: [],
      });

      // 2) Ad Set
      const dailyCents = Math.max(500, Math.round(Number(campaign.budget_daily ?? 30) * 100));
      const targeting = {
        geo_locations: { countries: data.countries },
        age_min: data.ageMin,
        age_max: data.ageMax,
        publisher_platforms: ["facebook", "instagram"],
        facebook_positions: ["feed", "story"],
        instagram_positions: ["stream", "story", "reels"],
      };
      const adsetRes = await metaPost(`/${act}/adsets`, token, {
        name: `${campaign.name} — Conjunto`,
        campaign_id: campaignRes.id!,
        daily_budget: String(dailyCents),
        billing_event: "IMPRESSIONS",
        optimization_goal: objective === "OUTCOME_LEADS" ? "LEAD_GENERATION" : "OFFSITE_CONVERSIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting,
        status: data.activate ? "ACTIVE" : "PAUSED",
        start_time: new Date(Date.now() + 60_000).toISOString(),
      });

      // 3) Creative
      const pageId = data.pageId ?? conn.page_id;
      if (!pageId) throw new Error("Página do Facebook não encontrada na conexão");
      const creativeBody: Record<string, unknown> = {
        name: `${campaign.name} — Criativo`,
        object_story_spec: {
          page_id: pageId,
          ...(data.instagramId || conn.instagram_business_account_id
            ? { instagram_actor_id: data.instagramId ?? conn.instagram_business_account_id }
            : {}),
          link_data: {
            message: copy.primary_text,
            link: data.linkUrl,
            name: copy.headline,
            description: copy.description ?? undefined,
            call_to_action: { 
              type: copy.cta?.replace(/\s+/g, "_").toUpperCase() ?? "LEARN_MORE",
              value: { link: data.linkUrl }
            },
            ...(creative?.image_url ? { picture: creative.image_url } : {}),
          },
        },
      };
      const creativeRes = await metaPost(`/${act}/adcreatives`, token, creativeBody);

      // 4) Ad
      const adRes = await metaPost(`/${act}/ads`, token, {
        name: `${campaign.name} — Anúncio`,
        adset_id: adsetRes.id!,
        creative: { creative_id: creativeRes.id! },
        status: data.activate ? "ACTIVE" : "PAUSED",
      });

      await context.supabase
        .from("ads_campaigns")
        .update({
          meta_campaign_id: campaignRes.id,
          meta_adset_id: adsetRes.id,
          meta_creative_id: creativeRes.id,
          meta_ad_id: adRes.id,
          ads_account_id: account.id,
          status: data.activate ? "active" : "paused",
          published_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", campaign.id);

      return { ok: true, meta_campaign_id: campaignRes.id };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await context.supabase
        .from("ads_campaigns")
        .update({ last_error: message })
        .eq("id", campaign.id);
      throw new Error(message);
    }
  });

// ---------- Pause / Resume ----------

async function setMetaStatus(
  supabase: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          single: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  },
  campaignId: string,
  status: "ACTIVE" | "PAUSED",
) {
  const { data: campaign } = (await supabase
    .from("ads_campaigns")
    .select("id,meta_campaign_id,meta_adset_id,meta_ad_id,ads_account_id")
    .eq("id", campaignId)
    .single()) as {
    data: {
      id: string;
      meta_campaign_id: string | null;
      meta_adset_id: string | null;
      meta_ad_id: string | null;
      ads_account_id: string | null;
    } | null;
  };
  if (!campaign?.meta_campaign_id || !campaign.ads_account_id) {
    throw new Error("Campanha ainda não publicada no Meta");
  }
  const { data: account } = (await supabase
    .from("ads_accounts")
    .select("meta_connection:meta_connections(page_access_token)")
    .eq("id", campaign.ads_account_id)
    .single()) as {
    data: { meta_connection: { page_access_token: string } | null } | null;
  };
  const token = account?.meta_connection?.page_access_token;
  if (!token) throw new Error("Token Meta indisponível");
  await metaPost(`/${campaign.meta_campaign_id}`, token, { status });
  return campaign;
}

export const pauseCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ campaignId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await setMetaStatus(
      context.supabase as unknown as Parameters<typeof setMetaStatus>[0],
      data.campaignId,
      "PAUSED",
    );
    await context.supabase.from("ads_campaigns").update({ status: "paused" }).eq("id", data.campaignId);
    return { ok: true };
  });

export const resumeCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ campaignId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await setMetaStatus(
      context.supabase as unknown as Parameters<typeof setMetaStatus>[0],
      data.campaignId,
      "ACTIVE",
    );
    await context.supabase.from("ads_campaigns").update({ status: "active" }).eq("id", data.campaignId);
    return { ok: true };
  });

// ---------- Insights sync ----------

type MetaInsight = {
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
};

function parseInsights(rows: MetaInsight[]) {
  return rows.map((r) => {
    const conv = Number(
      r.actions?.find((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ?? 0,
    );
    const revenue = Number(
      r.action_values?.find((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ?? 0,
    );
    const spend = Number(r.spend ?? 0);
    return {
      date: r.date_start,
      spend,
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      ctr: Number(r.ctr ?? 0),
      cpm: Number(r.cpm ?? 0),
      cpc: Number(r.cpc ?? 0),
      conversions: conv,
      revenue,
      cpa: conv > 0 ? spend / conv : 0,
      roas: spend > 0 ? revenue / spend : 0,
    };
  });
}

export async function syncCampaignInsightsInternal(
  supabase: { from: (t: string) => unknown },
  campaign: {
    id: string;
    user_id: string;
    meta_campaign_id: string | null;
    ads_account_id: string | null;
  },
  token: string,
) {
  if (!campaign.meta_campaign_id) return { synced: 0 };
  const json = (await metaGet(`/${campaign.meta_campaign_id}/insights`, token, {
    fields: "spend,impressions,clicks,ctr,cpm,cpc,actions,action_values",
    time_increment: "1",
    date_preset: "last_30d",
  })) as { data?: MetaInsight[] };
  const rows = parseInsights(json.data ?? []);
  if (rows.length === 0) return { synced: 0 };
  const payload = rows.map((r) => ({ ...r, campaign_id: campaign.id, user_id: campaign.user_id }));
  const sb = supabase as unknown as {
    from: (t: string) => {
      upsert: (v: unknown, o: unknown) => Promise<{ error: { message: string } | null }>;
      update: (v: unknown) => { eq: (c: string, v: string) => Promise<unknown> };
    };
  };
  const { error } = await sb.from("ads_insights").upsert(payload, { onConflict: "campaign_id,date" });
  if (error) throw new Error(error.message);
  await sb
    .from("ads_campaigns")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", campaign.id);
  return { synced: rows.length };
}

export const syncCampaignInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ campaignId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: campaign } = await context.supabase
      .from("ads_campaigns")
      .select("id,user_id,meta_campaign_id,ads_account_id")
      .eq("id", data.campaignId)
      .single();
    if (!campaign?.meta_campaign_id) throw new Error("Campanha ainda não publicada");
    const { data: account } = await context.supabase
      .from("ads_accounts")
      .select("meta_connection:meta_connections(page_access_token)")
      .eq("id", campaign.ads_account_id!)
      .single();
    const token = (account as { meta_connection: { page_access_token: string } | null } | null)
      ?.meta_connection?.page_access_token;
    if (!token) throw new Error("Token Meta indisponível");
    return syncCampaignInsightsInternal(context.supabase, campaign, token);
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: campaign, error } = await context.supabase
      .from("ads_campaigns")
      .select("*, briefing:ads_briefings(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const [{ data: copies }, { data: creatives }, { data: insights }] = await Promise.all([
      context.supabase.from("ads_copies").select("*").eq("briefing_id", campaign.briefing_id!),
      context.supabase.from("ads_creatives").select("*").eq("briefing_id", campaign.briefing_id!),
      context.supabase
        .from("ads_insights")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("date", { ascending: true }),
    ]);
    return { campaign, copies: copies ?? [], creatives: creatives ?? [], insights: insights ?? [] };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ads_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= FASE 3 — OTIMIZAÇÃO, ALERTAS E A/B TESTS =================

import { runOptimizationForCampaigns } from "./ads-optimization";

// ---------- Alerts ----------

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads_alerts")
      .select("*, campaign:ads_campaigns(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data;
  });

export const markAlertRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ads_alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllAlertsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("ads_alerts")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dismissAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ads_alerts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Optimizations ----------

export const listOptimizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ads_optimizations")
      .select("*, campaign:ads_campaigns(name,status,budget_daily,meta_campaign_id)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data;
  });

export const runOptimizationNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: campaigns } = await context.supabase
      .from("ads_campaigns")
      .select("id,user_id,name,status,budget_daily,meta_campaign_id")
      .not("meta_campaign_id", "is", null);
    const result = await runOptimizationForCampaigns(
      context.supabase as unknown as Parameters<typeof runOptimizationForCampaigns>[0],
      (campaigns ?? []) as Parameters<typeof runOptimizationForCampaigns>[1],
    );
    return result;
  });

export const applyOptimization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: opt, error } = await context.supabase
      .from("ads_optimizations")
      .select("*, campaign:ads_campaigns(id,meta_campaign_id,ads_account_id,budget_daily)")
      .eq("id", data.id)
      .single();
    if (error || !opt) throw new Error("Recomendação não encontrada");

    const suggestion = (opt.suggestion ?? {}) as { action?: string; recommended_daily?: number };
    const campaign = opt.campaign as {
      id: string;
      meta_campaign_id: string | null;
      ads_account_id: string | null;
      budget_daily: number | null;
    } | null;
    if (!campaign?.meta_campaign_id || !campaign.ads_account_id) {
      throw new Error("Campanha ainda não publicada no Meta");
    }

    const { data: account } = await context.supabase
      .from("ads_accounts")
      .select("meta_connection:meta_connections(page_access_token)")
      .eq("id", campaign.ads_account_id)
      .single();
    const token = (account as { meta_connection: { page_access_token: string } | null } | null)
      ?.meta_connection?.page_access_token;
    if (!token) throw new Error("Token Meta indisponível");

    if (suggestion.action === "pause") {
      await metaPost(`/${campaign.meta_campaign_id}`, token, { status: "PAUSED" });
      await context.supabase.from("ads_campaigns").update({ status: "paused" }).eq("id", campaign.id);
    } else if (suggestion.action === "increase_budget" && suggestion.recommended_daily) {
      const newDaily = Number(suggestion.recommended_daily);
      const cents = Math.max(500, Math.round(newDaily * 100));
      const { data: campFull } = await context.supabase
        .from("ads_campaigns")
        .select("meta_adset_id")
        .eq("id", campaign.id)
        .single();
      if (campFull?.meta_adset_id) {
        await metaPost(`/${campFull.meta_adset_id}`, token, { daily_budget: String(cents) });
      }
      await context.supabase
        .from("ads_campaigns")
        .update({ budget_daily: newDaily })
        .eq("id", campaign.id);
    }

    await context.supabase
      .from("ads_optimizations")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", opt.id);
    return { ok: true, action: suggestion.action };
  });

export const dismissOptimization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ads_optimizations")
      .update({ status: "dismissed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- A/B Tests ----------

const ABTestInput = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1),
  hypothesis: z.string().nullable().optional(),
  metric: z.enum(["roas", "ctr", "cpa", "conversions"]).default("roas"),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        isControl: z.boolean().default(false),
        copyId: z.string().uuid().nullable().optional(),
        creativeId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(2)
    .max(5),
});

export const createABTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ABTestInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: test, error } = await context.supabase
      .from("ads_ab_tests")
      .insert({
        user_id: context.userId,
        campaign_id: data.campaignId,
        name: data.name,
        hypothesis: data.hypothesis ?? null,
        metric: data.metric,
        status: "running",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const rows = data.variants.map((v) => ({
      user_id: context.userId,
      test_id: test.id,
      name: v.name,
      is_control: v.isControl,
      copy_id: v.copyId ?? null,
      creative_id: v.creativeId ?? null,
    }));
    const { error: vErr } = await context.supabase.from("ads_ab_variants").insert(rows);
    if (vErr) throw new Error(vErr.message);
    return test;
  });

export const listABTests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ campaignId: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const query = context.supabase
      .from("ads_ab_tests")
      .select("*, variants:ads_ab_variants(*), campaign:ads_campaigns(name)")
      .order("created_at", { ascending: false });
    if (data.campaignId) query.eq("campaign_id", data.campaignId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows;
  });

export const endABTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), winnerVariantId: z.string().uuid().nullable().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ads_ab_tests")
      .update({
        status: "ended",
        winner_variant_id: data.winnerVariantId ?? null,
        ended_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteABTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ads_ab_tests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// PHASE 4 — Auto-scale + Embeddings-based creative learning
// ============================================================
import { decideScale, embedText, type ScaleCampaign } from "./ads-scale";
import { todayISO } from "@/lib/dates";

export const listScaleHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ campaignId: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("ads_scale_history")
      .select("*, ads_campaigns(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.campaignId) q = q.eq("campaign_id", data.campaignId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listWinners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [creatives, copies, embeddings] = await Promise.all([
      context.supabase
        .from("ads_creatives")
        .select("id,campaign_id,image_url,prompt,winner_score,created_at")
        .eq("user_id", context.userId)
        .eq("is_winner", true)
        .order("winner_score", { ascending: false })
        .limit(50),
      context.supabase
        .from("ads_copies")
        .select("id,campaign_id,headline,primary_text,description,cta,winner_score,created_at")
        .eq("user_id", context.userId)
        .eq("is_winner", true)
        .order("winner_score", { ascending: false })
        .limit(50),
      context.supabase
        .from("ads_creative_embeddings")
        .select("id,campaign_id,content,performance_score,roas,ctr,cpa,spend,created_at")
        .eq("user_id", context.userId)
        .order("performance_score", { ascending: false })
        .limit(50),
    ]);
    return {
      creatives: creatives.data ?? [],
      copies: copies.data ?? [],
      embeddings: embeddings.data ?? [],
    };
  });

export const runScaleNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: campaigns, error } = await context.supabase
      .from("ads_campaigns")
      .select("id,user_id,name,status,budget_daily,meta_campaign_id,meta_adset_id,ads_account_id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .not("meta_campaign_id", "is", null);
    if (error) throw new Error(error.message);

    const decisions: Array<ReturnType<typeof decideScale>> = [];
    for (const c of (campaigns ?? []) as ScaleCampaign[]) {
      const { data: insights } = await context.supabase
        .from("ads_insights")
        .select("date,spend,impressions,clicks,conversions,revenue,ctr,cpa,roas")
        .eq("campaign_id", c.id);
      const { data: last } = await context.supabase
        .from("ads_scale_history")
        .select("created_at")
        .eq("campaign_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const decision = decideScale(
        c,
        (insights ?? []) as Parameters<typeof decideScale>[1],
        last?.created_at ?? null,
      );
      if (decision) decisions.push(decision);
    }
    return { decisions, evaluated: campaigns?.length ?? 0 };
  });

export const suggestFromWinners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        productName: z.string().min(1),
        objective: z.string().min(1),
        angle: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const query = `${data.productName} — ${data.objective}${data.angle ? " — " + data.angle : ""}`;
    let inspirations: Array<{ content: string; roas: number | null; performance_score: number | null }> = [];
    try {
      const vec = await embedText(query);
      // RPC-style similarity search via raw filter — use in-memory ranking if no RPC
      const { data: rows } = await context.supabase
        .from("ads_creative_embeddings")
        .select("content,roas,performance_score,embedding")
        .eq("user_id", context.userId)
        .limit(200);
      if (rows && rows.length > 0) {
        const parsed = rows
          .map((r) => {
            const emb =
              typeof r.embedding === "string"
                ? (JSON.parse(r.embedding as unknown as string) as number[])
                : (r.embedding as unknown as number[]);
            let dot = 0,
              na = 0,
              nb = 0;
            for (let i = 0; i < emb.length; i++) {
              dot += vec[i] * emb[i];
              na += vec[i] * vec[i];
              nb += emb[i] * emb[i];
            }
            const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
            return { content: r.content as string, roas: r.roas, performance_score: r.performance_score, sim };
          })
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 5);
        inspirations = parsed;
      }
    } catch (e) {
      // embeddings unavailable — fall back to top winners
      const { data: rows } = await context.supabase
        .from("ads_creative_embeddings")
        .select("content,roas,performance_score")
        .eq("user_id", context.userId)
        .order("performance_score", { ascending: false })
        .limit(5);
      inspirations = (rows ?? []) as typeof inspirations;
    }

    if (inspirations.length === 0) {
      return { inspirations, suggestionJson: null as string | null, note: "Ainda não há criativos vencedores para aprender." };
    }

    // Ask AI to draft inspired copy
    const { gateway, generateText } = await loadGateway();
    const context_ = inspirations
      .map((x, i) => `#${i + 1} (ROAS ${x.roas ?? "?"}x)\n${x.content}`)
      .join("\n\n---\n\n");
    const prompt = `Você é um copywriter sênior de Meta Ads. Baseado nestes criativos VENCEDORES anteriores, produza uma NOVA sugestão de anúncio para "${data.productName}" (objetivo: ${data.objective}${data.angle ? ", ângulo: " + data.angle : ""}).

CRIATIVOS VENCEDORES:
${context_}

Retorne APENAS JSON: {"headline":"...","primary_text":"...","description":"...","cta":"...","visual_prompt":"...","rationale":"por que deve funcionar"}`;

    const { text } = await generateText({
      model: gateway("gemini-2.5-pro"),
      prompt,
    });
    let suggestionJson: string | null = null;
    try {
      suggestionJson = JSON.stringify(extractJson(text));
    } catch {
      suggestionJson = JSON.stringify({ raw: text });
    }
    return { inspirations, suggestionJson, note: null as string | null };
  });

export const backfillWinnerEmbeddings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Find campaigns with ROAS >= 2 that don't have an embedding yet
    const { data: campaigns } = await context.supabase
      .from("ads_campaigns")
      .select("id")
      .eq("user_id", context.userId);
    if (!campaigns || campaigns.length === 0) return { created: 0 };

    let created = 0;
    for (const c of campaigns) {
      const { data: insights } = await context.supabase
        .from("ads_insights")
        .select("spend,revenue,conversions,clicks,impressions")
        .eq("campaign_id", c.id);
      if (!insights || insights.length === 0) continue;
      const spend = insights.reduce((s, i) => s + Number(i.spend ?? 0), 0);
      const revenue = insights.reduce((s, i) => s + Number(i.revenue ?? 0), 0);
      const roas = spend > 0 ? revenue / spend : 0;
      if (roas < 2) continue;

      const { data: exists } = await context.supabase
        .from("ads_creative_embeddings")
        .select("id")
        .eq("campaign_id", c.id)
        .limit(1)
        .maybeSingle();
      if (exists) continue;

      const { data: copy } = await context.supabase
        .from("ads_copies")
        .select("id,headline,primary_text,description")
        .eq("campaign_id", c.id)
        .limit(1)
        .maybeSingle();
      const { data: creative } = await context.supabase
        .from("ads_creatives")
        .select("id,prompt")
        .eq("campaign_id", c.id)
        .limit(1)
        .maybeSingle();
      const content = [copy?.headline, copy?.primary_text, copy?.description, creative?.prompt]
        .filter(Boolean)
        .join(" \n ");
      if (content.trim().length < 10) continue;

      try {
        const vec = await embedText(content);
        await context.supabase.from("ads_creative_embeddings").insert({
          user_id: context.userId,
          campaign_id: c.id,
          creative_id: creative?.id ?? null,
          copy_id: copy?.id ?? null,
          content,
          embedding: vec as unknown as string,
          performance_score: roas,
          roas,
          spend,
          metadata: { source: "backfill" },
        });
        if (copy?.id) {
          await context.supabase
            .from("ads_copies")
            .update({ is_winner: true, winner_score: roas })
            .eq("id", copy.id);
        }
        if (creative?.id) {
          await context.supabase
            .from("ads_creatives")
            .update({ is_winner: true, winner_score: roas })
            .eq("id", creative.id);
        }
        created += 1;
      } catch (e) {
        console.error("embed backfill failed:", e);
      }
    }
    return { created };
  });
