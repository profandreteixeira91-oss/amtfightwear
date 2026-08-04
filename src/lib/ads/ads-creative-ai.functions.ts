import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { openrouterChat } from "@/lib/ai-gateway.server";

const adSetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  type: z.enum(["bjj_belts", "judo_belts", "custom_belts", "kimonos", "mixed"]),
  style: z.enum(["carousel", "single_image", "video"]),
});

export const generateAdCreativeSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => adSetSchema.parse(v))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);

    // Contexto específico da AMT Fight Wear para a IA
    const PROMPT = `Você é um especialista em tráfego pago para artes marciais. 
    Crie um conjunto de anúncios de alto desempenho para o Instagram no formato ${data.style}.
    O tema é: ${data.type === "bjj_belts" ? "Faixas de Jiu-Jitsu (Padrão e Bordadas)" : 
             data.type === "judo_belts" ? "Faixas de Judô (Padrão e Bordadas)" : 
             data.type === "kimonos" ? "Kimonos de Jiu-Jitsu Premium" : 
             "Mix de produtos (Faixas e Kimonos)"}.
    
    Requisitos:
    1. CTA forte focado em conversão.
    2. Linguagem premium, Ruby Noir (elegante, forte, autoridade).
    3. Descrições para carrossel (mínimo 5 cards).
    4. Cada card deve ter um prompt de imagem específico.
    
    Retorne um JSON puro no seguinte formato:
    {
      "campaign_name": "string",
      "ad_copy": "string (texto principal do anúncio)",
      "cta_label": "string (ex: COMPRAR_AGORA)",
      "cards": [
        {
          "title": "Título curto",
          "body": "Descrição curta",
          "image_prompt": "Prompt visual detalhado em inglês para o DALL-E 3 focando em estética Ruby Noir (iluminação dramática, fundo escuro/texturizado, foco no produto)"
        }
      ]
    }`;

    const resText = await openrouterChat({
      messages: [
        { role: "system", content: "Você responde apenas JSON válido." },
        { role: "user", content: PROMPT }
      ],
      json: true
    });

    const parsed = JSON.parse(resText);
    
    // Aqui no futuro dispararíamos a geração das imagens real via DALL-E 3.
    // Por enquanto, retornamos os prompts estruturados para o usuário revisar.
    
    return {
      ...parsed,
      suggested_ads: parsed.cards.map((card: any, idx: number) => ({
        id: `temp-${Date.now()}-${idx}`,
        name: `Anúncio ${idx + 1}: ${card.title}`,
        title: card.title,
        body: card.body,
        image_prompt: card.image_prompt,
        // Mock de thumbnail para preview
        thumbnail: "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=800"
      }))
    };
  });
