import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Modelo padrão barato + alta qualidade via Lovable AI Gateway.
const DEFAULT_TEXT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

// Normaliza ids antigos para modelos suportados pelo Lovable AI Gateway.
function mapModel(id: string): string {
  const table: Record<string, string> = {
    // Texto
    "google/gemini-flash-latest": DEFAULT_TEXT_MODEL,
    "google/gemini-3.5-flash": DEFAULT_TEXT_MODEL,
    "google/gemini-3-flash-preview": DEFAULT_TEXT_MODEL,
    "google/gemini-3.1-flash-lite": "google/gemini-2.5-flash-lite",
    "google/gemini-3.1-pro-preview": "google/gemini-2.5-pro",
    // Imagem
    "google/gemini-3.1-flash-image": DEFAULT_IMAGE_MODEL,
    "google/gemini-3-pro-image": DEFAULT_IMAGE_MODEL,
    "google/gemini-3.1-flash-lite-image": DEFAULT_IMAGE_MODEL,
    "google/gemini-2.5-flash-image": DEFAULT_IMAGE_MODEL,
  };
  if (table[id]) return table[id];
  // Se veio sem prefixo google/openai/, assume google.
  if (!id.includes("/")) return `google/${id}`;
  return id;
}

/**
 * Gateway aponta para o Lovable AI Gateway (endpoint OpenAI-compat).
 * Usa LOVABLE_API_KEY (provisionada automaticamente pela plataforma).
 */
export function createLovableAiGateway(_ignored?: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { Authorization: `Bearer ${key}` },
  });

  return (modelId: string) => provider(mapModel(modelId));
}

export const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const DEFAULT_TEXT_MODEL_ID = DEFAULT_TEXT_MODEL;
export const DEFAULT_IMAGE_MODEL_ID = DEFAULT_IMAGE_MODEL;
