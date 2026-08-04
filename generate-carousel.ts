
import { openrouterChat } from "./src/lib/ai-gateway.server.ts";
import fs from "fs";
import path from "path";

const IMAGE_MODEL = "openai/dall-e-3"; // Modelo que o usuário configurou para imagens via OpenRouter/OpenAI
const OUTPUT_DIR = "public/ads/carousel";

const concepts = [
  {
    id: "jiu-jitsu-belts",
    name: "Faixas de Jiu-Jitsu",
    prompt: "High-end product photography of premium Brazilian Jiu-Jitsu belts (blue, purple, brown, black) arranged elegantly on a dark mahogany surface. 'Ruby Noir' aesthetic: deep reds, shadows, and luxury lighting. Cinematic atmosphere. The belts show high quality weave and thick tips. Text on image: 'AMT PREMIUM BELTS - THE CHOICE OF CHAMPIONS'. Strong call to action feel.",
  },
  {
    id: "judo-belts",
    name: "Faixas de Judô",
    prompt: "Professional shot of traditional Judo belts in vibrant colors, focusing on the texture and the 'Dan' embroidery. Ruby Noir style: dark moody background with subtle red highlights. Luxury martial arts equipment. Elegant and strong. Text: 'TRADIÇÃO E FORÇA - FAIXAS DE JUDÔ AMT'.",
  },
  {
    id: "embroidered-belts",
    name: "Faixas Bordadas",
    prompt: "Close-up macro photography of high-precision custom embroidery on a black martial arts belt. Golden and silver threads catching the light. Dark, sophisticated background (Ruby Noir). Focus on craftsmanship. Text: 'PERSONALIZE SUA JORNADA - BORDADOS EXCLUSIVOS'.",
  },
  {
    id: "premium-kimono",
    name: "Kimono Premium",
    prompt: "A premium white Jiu-Jitsu Gi (kimono) displayed on a minimalist torso stand. The fabric shows heavy grammage and superior stitching. Ruby Noir aesthetic: dramatic shadows, deep red ambient light. Professional and elite look. Text: 'ARMADURA DE GUERREIRO - KIMONOS AMT'.",
  },
  {
    id: "custom-belts-mix",
    name: "Mix de Faixas Personalizadas",
    prompt: "An artistic composition of various martial arts belts (BJJ and Judo) together, showing standard, embroidered and personalized versions. Luxury presentation. Ruby Noir color palette. High contrast, premium feel. Text: 'AMT FIGHT WEAR - EXCELÊNCIA EM CADA DETALHE'.",
  }
];

async function generateAndSave() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Chave do OpenRouter não encontrada no ambiente.");

  console.log("Iniciando geração do carrossel Ruby Noir...");

  for (const concept of concepts) {
    try {
      console.log(`Gerando: ${concept.name}...`);
      
      // OpenRouter para imagens geralmente usa a mesma interface de chat ou endpoints específicos.
      // DALL-E 3 via OpenRouter é chamado como um modelo de chat que retorna a URL da imagem no conteúdo ou metadados.
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": "https://amtfightwear.com.br",
          "X-Title": "AMT Fight Wear",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [
            { role: "user", content: concept.prompt }
          ]
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`Erro ao gerar ${concept.id}:`, err);
        continue;
      }

      const data = await response.json();
      // OpenRouter retorna a URL da imagem no campo de conteúdo para modelos de imagem
      const imageUrl = data.choices?.[0]?.message?.content?.match(/https:\/\/\S+/)?.[0] || data.choices?.[0]?.message?.content;

      if (!imageUrl || !imageUrl.startsWith("http")) {
        console.error(`URL inválida para ${concept.id}:`, imageUrl);
        continue;
      }

      console.log(`Baixando imagem de: ${imageUrl}`);
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      
      const filePath = path.join(OUTPUT_DIR, `${concept.id}.png`);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`Salvo: ${filePath}`);

    } catch (e) {
      console.error(`Falha no conceito ${concept.id}:`, e);
    }
  }
}

generateAndSave();
