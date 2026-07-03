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
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const { generateText } = await import("ai");
  const { createLovableAiGateway } = await import("../ai-gateway.server");
  return { gateway: createLovableAiGateway(apiKey), generateText };
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta da IA sem JSON");
  return JSON.parse(match[0]);
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
      model: gateway("google/gemini-3-flash-preview"),
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
      model: gateway("google/gemini-3-flash-preview"),
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
      model: gateway("google/gemini-3-flash-preview"),
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
      model: gateway("google/gemini-3-flash-preview"),
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

    const today = new Date().toISOString().slice(0, 10);
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
    };
  });

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
      .select("id,user_access_token,page_access_token")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conn) throw new Error("Conecte primeiro sua conta Meta em Conexões");

    const token = conn.user_access_token ?? conn.page_access_token;
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
