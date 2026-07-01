import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  productName: z.string().min(1),
  productCategory: z.string().optional().nullable(),
  productPrice: z.number().optional().nullable(),
  objective: z.enum(["atacado", "varejo"]),
  extraInstructions: z.string().optional().nullable(),
});

export const generateMarketingContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const { generateText } = await import("ai");
    const { createLovableAiGateway } = await import("./ai-gateway.server");
    const gateway = createLovableAiGateway(apiKey);

    const audience =
      data.objective === "atacado"
        ? "professores e donos de academias de Jiu-Jitsu/Judô comprando em atacado (lotes de faixas, kimonos e patches para alunos e graduação)"
        : "alunos e praticantes de artes marciais comprando no varejo (compra individual, cupom, benefícios de qualidade)";

    const prompt = `Você é copywriter da AMT Fight Wear, marca brasileira premium de Jiu-Jitsu e Judô.
Produto em destaque: "${data.productName}"${data.productCategory ? ` (categoria: ${data.productCategory})` : ""}${data.productPrice ? ` — preço unitário R$ ${data.productPrice.toFixed(2)}` : ""}.
Público-alvo: ${audience}.
Instruções extras do time: ${data.extraInstructions?.trim() || "nenhuma"}.

Gere um JSON com EXATAMENTE estas chaves (sem markdown, sem explicações):
{
  "instagram": "legenda de post para Instagram, 3-5 linhas, com hashtags no final e 1-2 emojis relevantes",
  "whatsapp": "mensagem curta de abordagem por WhatsApp, tom próximo, com CTA claro",
  "email_subject": "assunto de e-mail curto e persuasivo (máx 60 caracteres)",
  "email_body": "corpo do e-mail em texto (5-8 linhas), com saudação, gancho, oferta e CTA"
}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });

    // Extract JSON from possibly noisy response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        instagram: text,
        whatsapp: text,
        email_subject: `Novidade AMT: ${data.productName}`,
        email_body: text,
      };
    }
    try {
      return JSON.parse(match[0]) as {
        instagram: string;
        whatsapp: string;
        email_subject: string;
        email_body: string;
      };
    } catch {
      return {
        instagram: text,
        whatsapp: text,
        email_subject: `Novidade AMT: ${data.productName}`,
        email_body: text,
      };
    }
  });
