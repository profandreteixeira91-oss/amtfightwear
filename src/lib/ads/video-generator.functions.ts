import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertSaasOwner } from "@/lib/auth/is-saas-owner";
import { openrouterChat } from "@/lib/ai-gateway.server";

const videoGenSchema = z.object({
  type: z.literal("wholesale_belts"),
  format: z.literal("9:16"),
  duration: z.number().default(20),
});

export const generateMetaAdVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => videoGenSchema.parse(v))
  .handler(async ({ data, context }) => {
    await assertSaasOwner(context);

    const PROMPT = `Você é um diretor de arte e editor de vídeo especialista em Meta Ads.
Crie o roteiro técnico e os comandos de geração para um vídeo vertical 9:16 focado em ATACADO de faixas AMT Fight Wear.

OBJETIVO: Venda B2B para academias e revendedores.
OFERTA: 25% OFF em 10+ unidades do mesmo modelo.
ESTILO: Premium, Ruby Noir, cortes rápidos, visual de alto impacto.

ESTRUTURA DESEJADA:
1. Gancho (0-3s): "SUA ACADEMIA PRECISA DE FAIXAS?". Close-up extremo de bordado real.
2. Personalização (3-7s): Cortes rápidos de logos de academias em faixas pretas, marrons, roxas, azuis e brancas.
3. Oferta (7-12s): "25% OFF". Visual de estoque/pilha de faixas prontas.
4. Benefício (12-16s): "Ideal para Equipes e Revendedores".
5. CTA (16-20s): "SOLICITE SEU ORÇAMENTO" + Logo AMT + WhatsApp (82 92001-6732).

Retorne um JSON puro no formato:
{
  "title": "Campanha Atacado AMT 25% OFF",
  "scenes": [
    {
      "time": "0-3s",
      "overlay": "SUA ACADEMIA PRECISA DE FAIXAS?",
      "visual_description": "Close-up cinematográfico de agulha de bordado dourado em tecido de algodão preto AMT",
      "audio_cue": "Impacto sonoro 'Wooosh'"
    }
  ],
  "video_generation_prompt": "Prompt técnico para IA de vídeo (Sora/Runway/Luma) em inglês para gerar a base visual",
  "status": "draft_ready"
}`;

    const resText = await openrouterChat({
      messages: [
        { role: "system", content: "Você é um gerador de roteiros técnicos para Meta Ads. Responda apenas JSON." },
        { role: "user", content: PROMPT }
      ],
      json: true
    });

    const script = JSON.parse(resText);

    return {
      success: true,
      script,
      preview_url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1080&h=1920&fit=crop", // Placeholder de frame 1
      message: "Roteiro e prompts de geração de vídeo 9:16 criados com sucesso."
    };
  });
