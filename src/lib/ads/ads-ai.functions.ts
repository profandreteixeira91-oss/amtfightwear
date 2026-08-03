import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { openrouterChat } from "@/lib/ai-gateway.server";
import { amGetOverview, amListCampaigns } from "./ads-manager.functions";

export const adsAiAnalyzeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { accountId: string; since: string; until: string }) =>
    z.object({ accountId: z.string(), since: z.string(), until: z.string() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);

    // Busca dados reais para análise. Chamamos diretamente as funções sem passar 'context' no input, 
    // pois o server function context é injetado pelo runtime se necessário ou passado internamente.
    // Como amGetOverview e amListCampaigns esperam o input como primeiro argumento:
    const [overview, campaigns] = await Promise.all([
      amGetOverview({ data: { accountId: data.accountId, since: data.since, until: data.until } }),
      amListCampaigns({ data: { accountId: data.accountId, since: data.since, until: data.until } }),
    ]);

    const prompt = `
Você é o "AMT Ads Agent", um especialista em tráfego pago da AMT Fight Wear.
Analise os dados abaixo da conta de anúncios da Meta e forneça recomendações práticas.

CONTA: ${overview.account.name} (${overview.account.currency})
PERÍODO: ${data.since} até ${data.until}

MÉTRICAS GERAIS:
- Investimento: ${overview.totals.spend}
- Conversões: ${overview.totals.conversions}
- Faturamento: ${overview.totals.revenue}
- ROAS: ${overview.totals.roas}
- Custo por Conversão (CPA): ${overview.totals.cpa}

CAMPANHAS PRINCIPAIS (Top 5 por gasto):
${campaigns
  .slice(0, 5)
  .map(
    (c) =>
      `- ${c.name}: Gasto ${c.metrics.spend}, ROAS ${c.metrics.roas}, Conversões ${c.metrics.conversions}, Status: ${c.effectiveStatus}`,
  )
  .join("\n")}

INSTRUÇÕES:
1. Comece com um resumo executivo rápido.
2. Identifique as 2 melhores e as 2 piores campanhas.
3. Sugira ajustes de orçamento ou escala.
4. Se o ROAS estiver baixo, sugira melhorias no criativo ou segmentação.
5. Seja direto, técnico e use o tom da marca AMT (Premium, Luta, Performance).

Responda em Markdown.
`;

    const response = await openrouterChat({
      messages: [{ role: "system", content: "Você é um analista sênior de Meta Ads." }, { role: "user", content: prompt }],
      temperature: 0.7,
    });

    return {
      analysis: response,
      timestamp: new Date().toISOString(),
    };
  });
