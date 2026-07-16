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

async function geminiGenerateText(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Lovable AI ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export const generateMarketingContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
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

    const text = await geminiGenerateText(prompt);


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

// =====================================================================
// Sugestões de tema / mote baseadas em posts mais virais do Instagram
// =====================================================================

const SuggestInput = z.object({
  contentType: z.enum(CONTENT_TYPES).default("motivational"),
  objective: z.enum(["atacado", "varejo"]).default("varejo"),
});

export const suggestViralTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: viral } = await context.supabase
      .from("ig_media_cache")
      .select("caption, like_count, comments_count")
      .not("caption", "is", null)
      .order("like_count", { ascending: false })
      .limit(25);

    const { data: recent } = await context.supabase
      .from("scheduled_posts")
      .select("theme")
      .eq("status", "published")
      .not("theme", "is", null)
      .order("published_at", { ascending: false })
      .limit(15);

    const viralSnippets = (viral ?? [])
      .map((v, i) => {
        const cap = (v.caption ?? "").replace(/\s+/g, " ").slice(0, 220);
        return `#${i + 1} [♥${v.like_count ?? 0} 💬${v.comments_count ?? 0}] ${cap}`;
      })
      .join("\n");

    const recentThemes = (recent ?? [])
      .map((r) => r.theme)
      .filter(Boolean)
      .join(" | ");

    const audience =
      data.objective === "atacado"
        ? "professores e donos de academia (atacado)"
        : "alunos e praticantes (varejo)";

    const typeHint: Record<ContentType, string> = {
      product: "divulgação de produto",
      category: "divulgação de linha/coleção",
      motivational: "motivacional / mentalidade de tatame",
      educational: "educativo / dica técnica / história do BJJ e Judô",
      athlete: "atleta ou membro da comunidade em destaque",
      event: "evento, competição ou lançamento",
      behind: "bastidores da marca e produção",
      brand_story: "história e valores da AMT Fight Wear",
      engagement: "engajamento — pergunta ou enquete",
    };

    const prompt = `Você é estrategista de conteúdo da AMT Fight Wear (BJJ/Judô).
Analise os posts abaixo do Instagram (ordenados por curtidas) para identificar padrões que viralizam com ${audience}.
Retorne 6 sugestões CURTAS de TEMA / MOTE para uma nova postagem do tipo: ${typeHint[data.contentType]}.

POSTS VIRAIS RECENTES:
${viralSnippets || "(sem histórico ainda — use conhecimento do nicho BJJ/Judô premium)"}

TEMAS RECENTES JÁ POSTADOS (evite repetir literalmente): ${recentThemes || "nenhum"}

Regras:
- 3 a 8 palavras cada, português BR, sem hashtags, sem aspas, sem emojis.
- Concreto e acionável (ex: "primeira faixa preta na família", "respeito ao oponente após luta").
- Coerente com o tipo pedido e diverso entre si.

Retorne SOMENTE JSON: {"suggestions":["tema 1","tema 2","tema 3","tema 4","tema 5","tema 6"]}`;

    const text = await geminiGenerateText(prompt);


    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { suggestions: [] as string[] };
    try {
      const parsed = JSON.parse(match[0]) as { suggestions?: unknown };
      const arr = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      return {
        suggestions: arr
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 6),
      };
    } catch {
      return { suggestions: [] as string[] };
    }
  });
