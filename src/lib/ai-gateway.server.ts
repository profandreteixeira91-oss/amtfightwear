import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Mapa dos ids "google/gemini-*" (antigo padrão Lovable) para ids reais da
// Google Generative Language API. Também aceita ids OpenAI e faz fallback.
function mapModel(id: string): string {
  let m = id.startsWith("google/") ? id.slice("google/".length) : id;
  if (m.startsWith("openai/")) m = "gemini-2.5-flash"; // fallback: sem OpenAI aqui
  const table: Record<string, string> = {
    "gemini-3.5-flash": "gemini-2.5-flash",
    "gemini-3-flash-preview": "gemini-2.5-flash",
    "gemini-3.1-flash-lite": "gemini-2.5-flash-lite",
    "gemini-3.1-pro-preview": "gemini-2.5-pro",
    "gemini-3.1-flash-image": "gemini-2.5-flash-image-preview",
    "gemini-3-pro-image": "gemini-2.5-flash-image-preview",
    "gemini-3.1-flash-lite-image": "gemini-2.5-flash-image-preview",
    "gemini-2.5-flash-image": "gemini-2.5-flash-image-preview",
  };
  return table[m] ?? m;
}

/**
 * Gateway agora aponta direto para a Google Generative Language API
 * (endpoint OpenAI-compat). Ignora o argumento e usa GEMINI_API_KEY.
 * A assinatura foi mantida para não quebrar os chamadores.
 */
export function createLovableAiGateway(_ignored?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const provider = createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${key}` },
  });

  return (modelId: string) => provider(mapModel(modelId));
}
