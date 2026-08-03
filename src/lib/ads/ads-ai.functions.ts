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
      amGetOverview({ data: { accountId: data.accountId, since: data.since, until: data.until } }).catch(err => {
        console.error("Error in amGetOverview:", err);
        throw new Error("Não foi possível carregar o resumo da conta. Verifique sua conexão com o Meta Ads.");
      }),
      amListCampaigns({ data: { accountId: data.accountId, since: data.since, until: data.until } }).catch(err => {
        console.error("Error in amListCampaigns:", err);
        return []; // Fallback para lista vazia se falhar
      }),
    ]);

    const prompt = `
Você é o "AMT Ads Agent", um especialista em tráfego pago da AMT Fight Wear com autonomia para otimizar contas de Meta Ads.
Sua missão é analisar a campanha atual e sugerir ajustes técnicos precisos para maximizar o ROAS e a eficiência.

CONTA: ${overview.account.name} (${overview.account.currency})
PERÍODO: ${data.since} até ${data.until}

MÉTRICAS GERAIS:
- Investimento: ${overview.totals.spend}
- Conversões: ${overview.totals.conversions}
- Faturamento: ${overview.totals.revenue}
- ROAS: ${overview.totals.roas}
- CPA (Custo por Ação): ${overview.totals.cpa}

CAMPANHAS PRINCIPAIS (Top 5 por gasto):
${campaigns
  .slice(0, 5)
  .map(
    (c) =>
      `- ${c.name}: Gasto ${c.metrics.spend}, ROAS ${c.metrics.roas}, CPA ${c.metrics.cpa}, Status: ${c.effectiveStatus}`,
  )
  .join("\n")}

INSTRUÇÕES DE OTIMIZAÇÃO:
1. Analise o que está impedindo um ROAS maior (ex: CPA alto, CTR baixo, ou fadiga de criativo).
2. Proponha ajustes imediatos: quais campanhas escalar, quais pausar e onde reduzir orçamento.
3. Se o ROAS estiver abaixo de 2.0, sugira uma mudança drástica na oferta ou no público.
4. Se o ROAS estiver acima de 4.0, detalhe como duplicar o orçamento sem quebrar o algoritmo.
5. Seja direto, técnico e aja como um estrategista de elite.

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
