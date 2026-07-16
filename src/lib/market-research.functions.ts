import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Product = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  description: string | null;
};

type Competitor = {
  competitor_name: string | null;
  competitor_url: string;
  competitor_price: number | null;
  currency: string;
  title: string | null;
  description: string | null;
  similarity_score: number | null;
  source_type: string | null;
  raw_snippet: string | null;
};

async function firecrawlSearch(query: string, limit = 10) {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!fcKey) throw new Error("Conecte o Firecrawl em Conexões e APIs para habilitar a pesquisa de mercado.");
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${fcKey}` },
    body: JSON.stringify({
      query,
      limit,
      lang: "pt",
      country: "br",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as {
    data?: { web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }> };
    web?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
  };
  return j.data?.web ?? j.web ?? [];
}

function classifySource(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("mercadolivre") || u.includes("mercadolibre")) return "Mercado Livre";
  if (u.includes("shopee")) return "Shopee";
  if (u.includes("amazon")) return "Amazon";
  if (u.includes("magazineluiza") || u.includes("magalu")) return "Magalu";
  if (u.includes("americanas")) return "Americanas";
  if (u.includes("kingsports") || u.includes("naja") || u.includes("dragao") || u.includes("keiko") || u.includes("koral") || u.includes("shoyoroll") || u.includes("atama") || u.includes("venum") || u.includes("hayabusa"))
    return "Marca concorrente";
  return "Site próprio / outro";
}

async function aiAnalyze(product: Product, results: Array<{ url?: string; title?: string; description?: string; markdown?: string }>) {
  const lovableKey = process.env.GEMINI_API_KEY!;
  const shortResults = results.slice(0, 10).map((r) => ({
    url: r.url,
    title: r.title,
    description: r.description,
    text: (r.markdown ?? "").slice(0, 3500),
  }));

  const prompt = `Você é um analista de precificação para artigos de Jiu-Jitsu / Judô (kimonos, rashguards, faixas, etc).

PRODUTO DA AMT FIGHT WEAR:
- Nome: ${product.name}
- Categoria: ${product.category ?? "N/A"}
- Preço atual (BRL): ${product.price}
- Descrição: ${product.description ?? "(sem descrição)"}

RESULTADOS DE BUSCA (concorrentes):
${JSON.stringify(shortResults, null, 2)}

Tarefa:
1. Para cada resultado que represente um produto REALMENTE COMPARÁVEL (mesma categoria/uso — ex: kimono BJJ vs kimono BJJ), extraia:
   - competitor_name (marca/loja)
   - competitor_url (a url da fonte)
   - competitor_price (número em BRL — SÓ inclua se você tiver evidência clara de preço no texto; senão null)
   - title (título do produto no concorrente)
   - description (resumo objetivo do produto do concorrente, 1-2 frases)
   - similarity_score (0.0 a 1.0, o quão similar ao produto AMT — mesmo tipo de item, gramatura, público etc)
   - raw_snippet (trecho curto que embasou o preço/análise, até 200 chars)
2. Ignore resultados que não sejam produtos (blogs, notícias, reviews genéricos, categorias).
3. Depois, gere um resumo de mercado com min/avg/max de preços dos comparáveis com preço válido.
4. Sugira um preço para o produto da AMT considerando:
   - Posicionamento: se descrição AMT indica premium (tecido reforçado, competição, IBJJF, etc), fique próximo do topo; se básico, fique na média-baixa.
   - Nunca sugerir abaixo do min do mercado (a menos que descrição AMT seja claramente inferior).
   - Diferença máxima de ±25% em relação ao preço atual, exceto se o mercado estiver muito descolado.
5. Analise gaps de descrição: o que os concorrentes destacam que a AMT deveria adicionar na descrição para justificar preço.

Retorne SOMENTE JSON válido:
{
  "competitors": [ { ... } ],
  "market": { "min": number|null, "avg": number|null, "max": number|null, "count": number },
  "suggestion": {
    "suggested_price": number,
    "position": "abaixo do mercado" | "na média" | "acima do mercado" | "premium" | "econômico",
    "reasoning": string,
    "description_gap": string
  }
}`;

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`IA ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = j.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as {

    competitors?: Array<Partial<Competitor>>;
    market?: { min: number | null; avg: number | null; max: number | null; count: number };
    suggestion?: {
      suggested_price: number;
      position: string;
      reasoning: string;
      description_gap: string;
    };
  };
}

export const runPriceResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ productId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: product, error: pErr } = await context.supabase
      .from("products")
      .select("id, name, category, price, description")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!product) throw new Error("Produto não encontrado.");
    const p = product as Product;

    const baseTerms = [
      p.name,
      p.category ? `${p.category} ${p.name}` : p.name,
      `${p.name} preço comprar`,
    ];
    const seen = new Map<string, { url?: string; title?: string; description?: string; markdown?: string }>();
    for (const q of baseTerms) {
      const results = await firecrawlSearch(q, 8);
      for (const r of results) {
        if (r.url && !seen.has(r.url)) seen.set(r.url, r);
      }
      if (seen.size >= 15) break;
    }
    const merged = Array.from(seen.values()).slice(0, 12);
    if (merged.length === 0) throw new Error("Nenhum resultado encontrado no Google para este produto.");

    const ai = await aiAnalyze(p, merged);
    const competitors = (ai.competitors ?? []).filter((c) => c.competitor_url).slice(0, 10);

    // clear previous research + suggestions for this product
    await context.supabase.from("price_research").delete().eq("product_id", p.id);

    if (competitors.length > 0) {
      const rows = competitors.map((c) => ({
        product_id: p.id,
        competitor_name: c.competitor_name ?? null,
        competitor_url: c.competitor_url!,
        competitor_price: c.competitor_price ?? null,
        currency: c.currency ?? "BRL",
        title: c.title ?? null,
        description: c.description ?? null,
        similarity_score: c.similarity_score ?? null,
        source_type: c.source_type ?? classifySource(c.competitor_url!),
        raw_snippet: c.raw_snippet ?? null,
      }));
      const { error: rErr } = await context.supabase.from("price_research").insert(rows);
      if (rErr) throw rErr;
    }

    let suggestion: {
      id: string;
      suggested_price: number;
      min_market: number | null;
      avg_market: number | null;
      max_market: number | null;
      position: string | null;
      reasoning: string | null;
      description_gap: string | null;
      competitors_analyzed: number;
    } | null = null;
    if (ai.suggestion) {
      const { data: sug, error: sErr } = await context.supabase
        .from("price_suggestions")
        .insert({
          product_id: p.id,
          current_price: p.price,
          suggested_price: ai.suggestion.suggested_price,
          min_market: ai.market?.min ?? null,
          avg_market: ai.market?.avg ?? null,
          max_market: ai.market?.max ?? null,
          competitors_analyzed: competitors.length,
          position: ai.suggestion.position,
          reasoning: ai.suggestion.reasoning,
          description_gap: ai.suggestion.description_gap,
        })
        .select("id, suggested_price, min_market, avg_market, max_market, position, reasoning, description_gap, competitors_analyzed")
        .single();
      if (sErr) throw sErr;
      suggestion = sug;
    }

    return { competitorsFound: competitors.length, suggestion };
  });

export const applySuggestedPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ productId: z.string().uuid(), price: z.number().positive() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").update({ price: data.price }).eq("id", data.productId);
    if (error) throw error;
    return { ok: true };
  });
