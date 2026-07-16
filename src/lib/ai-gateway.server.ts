import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Google Gemini via endpoint OpenAI-compatível (usa GEMINI_API_KEY do Google AI Studio).
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image-preview";

// Normaliza ids: remove prefixo "google/" e mapeia aliases antigos.
function mapModel(id: string): string {
  const clean = id.replace(/^google\//, "").replace(/^openai\//, "");
  const table: Record<string, string> = {
    "gemini-flash-latest": DEFAULT_TEXT_MODEL,
    "gemini-3.5-flash": DEFAULT_TEXT_MODEL,
    "gemini-3-flash-preview": DEFAULT_TEXT_MODEL,
    "gemini-3.1-flash-lite": "gemini-2.5-flash-lite",
    "gemini-3.1-pro-preview": "gemini-2.5-pro",
    "gemini-3.1-flash-image": DEFAULT_IMAGE_MODEL,
    "gemini-3-pro-image": DEFAULT_IMAGE_MODEL,
    "gemini-3.1-flash-lite-image": DEFAULT_IMAGE_MODEL,
    "gemini-2.5-flash-image": DEFAULT_IMAGE_MODEL,
    "text-embedding-3-small": "gemini-embedding-001",
  };
  return table[clean] ?? clean;
}

/**
 * Cria um provider apontando para a API do Google Gemini (OpenAI-compat).
 * Usa GEMINI_API_KEY (chave do Google AI Studio configurada nos secrets).
 */
export function createLovableAiGateway(_ignored?: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const provider = createOpenAICompatible({
    name: "gemini",
    baseURL: GEMINI_BASE_URL,
    headers: { Authorization: `Bearer ${key}` },
  });

  return (modelId: string) => provider(mapModel(modelId));
}

export const LOVABLE_GATEWAY_URL = GEMINI_BASE_URL;
export const DEFAULT_TEXT_MODEL_ID = DEFAULT_TEXT_MODEL;
export const DEFAULT_IMAGE_MODEL_ID = DEFAULT_IMAGE_MODEL;
