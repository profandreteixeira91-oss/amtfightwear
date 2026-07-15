import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const CONTENT_TYPES = [
  "product",       // divulgação de produto
  "category",      // divulgação de categoria/coleção
  "motivational",  // frase / mentalidade guerreira
  "educational",   // dica técnica, tutorial, história do BJJ/Judô
  "athlete",       // atleta em destaque / cliente / comunidade
  "event",         // competição, seminário, novidade
  "behind",        // bastidores, fábrica, equipe
  "brand_story",   // história e valores da marca
  "engagement",    // enquete, pergunta para engajar
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

const GenerateInput = z.object({
  // Produto opcional (só usado quando contentType = product/category, ou como referência)
  productName: z.string().optional().nullable(),
  productCategory: z.string().optional().nullable(),
  productPrice: z.number().optional().nullable(),
  objective: z.enum(["atacado", "varejo"]).default("varejo"),
  contentType: z.enum(CONTENT_TYPES).default("product"),
  topic: z.string().optional().nullable(),       // tema livre (ex: "disciplina", "primeira faixa preta")
  callToAction: z.string().optional().nullable(),
  extraInstructions: z.string().optional().nullable(),
});

function buildBrief(data: z.infer<typeof GenerateInput>) {
  const audience =
    data.objective === "atacado"
      ? "professores e donos de academias de Jiu-Jitsu/Judô comprando em atacado"
      : "alunos e praticantes de artes marciais (varejo)";

  const productLine = data.productName
    ? `Produto de referência: "${data.productName}"${data.productCategory ? ` (categoria: ${data.productCategory})` : ""}${data.productPrice ? ` — R$ ${data.productPrice.toFixed(2)}` : ""}.`
    : "Sem produto específico — foco em marca, comunidade ou mensagem.";

  const typeBrief: Record<ContentType, string> = {
    product: `Foco: DIVULGAR PRODUTO. Destaque benefício principal, prova social e CTA de compra. ${productLine}`,
    category: `Foco: DIVULGAR CATEGORIA/COLEÇÃO. Fale da linha de produtos, para quem serve, gatilho de escolha. ${productLine}`,
    motivational: `Foco: MOTIVACIONAL. Frase forte de mentalidade guerreira, disciplina, persistência no tatame. Tom inspirador, direto, sem vender produto — apenas assinar como AMT Fight Wear no final. Tema opcional: ${data.topic ?? "livre"}.`,
    educational: `Foco: EDUCATIVO. Dica técnica curta, curiosidade da história do Jiu-Jitsu/Judô, glossário, mito x verdade. Entregue valor real ao praticante. Tema: ${data.topic ?? "livre"}.`,
    athlete: `Foco: ATLETA / COMUNIDADE. Homenageie atleta, faixa preta ou cliente, celebre conquista, incentive comunidade a marcar amigos. Tema: ${data.topic ?? "conquista de faixa / campeonato"}.`,
    event: `Foco: EVENTO / NOVIDADE. Anuncie competição, seminário, lançamento, presença em campeonato. Tema: ${data.topic ?? "próximo evento"}.`,
    behind: `Foco: BASTIDORES. Mostre processo de produção, escolha de tecido, equipe AMT, história por trás do produto. Tema: ${data.topic ?? "processo produtivo"}.`,
    brand_story: `Foco: HISTÓRIA DA MARCA. Valores AMT Fight Wear (qualidade, tradição, respeito ao esporte), por que existimos, para quem fazemos. Tema: ${data.topic ?? "propósito da marca"}.`,
    engagement: `Foco: ENGAJAMENTO. Faça pergunta aberta ou enquete relevante ao público de BJJ/Judô para gerar comentários. Tema: ${data.topic ?? "preferência do praticante"}.`,
  };

  return {
    audience,
    typeBrief: typeBrief[data.contentType],
  };
}

export const generateMarketingContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const { generateText } = await import("ai");
    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway(apiKey);

    const { audience, typeBrief } = buildBrief(data);

    const prompt = `Você é copywriter da AMT Fight Wear, marca brasileira premium de Jiu-Jitsu e Judô.
Público-alvo: ${audience}.
${typeBrief}
${data.callToAction ? `CTA desejado: ${data.callToAction}.` : ""}
Instruções extras do time: ${data.extraInstructions?.trim() || "nenhuma"}.

Regras:
- Português BR, tom AMT (autoridade próxima, respeito ao tatame, sem clichê barato).
- Se o foco NÃO for produto, NÃO force menção a preço/oferta.
- Instagram: 3-6 linhas, 1-2 emojis pertinentes, 5-10 hashtags no final.
- WhatsApp: mensagem curta, tom próximo, com CTA coerente com o foco (comprar, responder, comparecer, marcar amigo etc).
- E-mail: assunto até 60 caracteres, corpo 5-8 linhas.

Retorne SOMENTE um JSON válido, sem markdown, com estas chaves:
{
  "instagram": "...",
  "whatsapp": "...",
  "email_subject": "...",
  "email_body": "..."
}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3.5-flash"),
      prompt,
    });

    const match = text.match(/\{[\s\S]*\}/);
    const fallback = {
      instagram: text,
      whatsapp: text,
      email_subject: data.productName ? `AMT: ${data.productName}` : "Novidade AMT Fight Wear",
      email_body: text,
    };
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]) as typeof fallback;
    } catch {
      return fallback;
    }
  });
