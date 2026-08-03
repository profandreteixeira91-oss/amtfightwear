import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { googleChat } from "./google-ai.server";

// OpenRouter — API OpenAI-compatível (usa OPENROUTER_API_KEY).
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TEXT_MODEL = "deepseek/deepseek-chat-v3";
// OpenRouter/DeepSeek free não gera imagens — mantemos Gemini para imagem.
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image-preview";

const OPENROUTER_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://amtfightwear.com.br",
  "X-Title": "AMT Fight Wear",
};

function mapModel(id: string): string {
  const clean = id.trim();
  const table: Record<string, string> = {
    "gemini-flash-latest": DEFAULT_TEXT_MODEL,
    "gemini-flash-lite-latest": DEFAULT_TEXT_MODEL,
    "gemini-2.5-flash": DEFAULT_TEXT_MODEL,
    "gemini-2.5-flash-lite": DEFAULT_TEXT_MODEL,
    "gemini-2.5-pro": DEFAULT_TEXT_MODEL,
    "gemini-3.5-flash": DEFAULT_TEXT_MODEL,
    "gemini-3.1-pro-preview": DEFAULT_TEXT_MODEL,
    "gemini-3.1-flash-lite": DEFAULT_TEXT_MODEL,
    "google/gemini-2.5-flash": DEFAULT_TEXT_MODEL,
    "google/gemini-2.5-pro": DEFAULT_TEXT_MODEL,
    "google/gemini-3.5-flash": DEFAULT_TEXT_MODEL,
    "openai/gpt-4o-mini": DEFAULT_TEXT_MODEL,
    "openai/gpt-4o": DEFAULT_TEXT_MODEL,
  };
  return table[clean] ?? clean;
}

export function createLovableAiGateway(_ignored?: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada");

  const provider = createOpenAICompatible({
    name: "openrouter",
    baseURL: OPENROUTER_BASE_URL,
    headers: { Authorization: `Bearer ${key}`, ...OPENROUTER_HEADERS },
  });

  return (modelId: string) => provider(mapModel(modelId));
}

/**
 * Centralizador de chamadas de Chat.
 * Tenta OpenRouter primeiro, se falhar por créditos ou erro grave, cai para o Google AI (Gemini).
 */
export async function aiChat(opts: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  try {
    return await openrouterChat(opts);
  } catch (error: any) {
    // Se for erro de créditos (402) ou limite (429), ou se a chave não existir, usamos Gemini.
    const errorMsg = error.message?.toLowerCase() || "";
    const isQuotaError = errorMsg.includes("créditos") || 
                        errorMsg.includes("credit") || 
                        errorMsg.includes("402") || 
                        errorMsg.includes("429") ||
                        errorMsg.includes("limite");
    
    if (isQuotaError || !process.env.OPENROUTER_API_KEY) {
      console.warn("OpenRouter sem créditos ou limite atingido, utilizando Google AI como fallback.");
      return await googleChat(opts);
    }
    
    throw error;
  }
}

/**
 * Helper direto para chamadas fetch OpenAI-compat ao OpenRouter.
 */
async function openrouterChat(opts: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada");

  const model = mapModel(opts.model ?? DEFAULT_TEXT_MODEL);
  const models = Array.from(new Set([model, DEFAULT_TEXT_MODEL]));
  const transient = new Set([429, 500, 502, 503, 504]);
  let lastErr = "";
  let lastStatus = 0;

  for (const m of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          ...OPENROUTER_HEADERS,
        },
        body: JSON.stringify({
          model: m,
          messages: opts.messages,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        return json.choices?.[0]?.message?.content ?? "";
      }
      lastStatus = res.status;
      lastErr = await res.text().catch(() => "");
      if (!transient.has(res.status)) break;
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
    }
    if (!transient.has(lastStatus)) break;
  }

  if (lastStatus === 429) {
    throw new Error("OpenRouter: limite de uso atingido.");
  }
  if (lastStatus === 402) {
    throw new Error("OpenRouter: créditos insuficientes.");
  }
  
  throw new Error(`OpenRouter error ${lastStatus}: ${lastErr.slice(0, 100)}`);
}

// Mantendo compatibilidade com nomes antigos para evitar quebras em outros arquivos
export const openrouterChat = aiChat;

export const LOVABLE_GATEWAY_URL = OPENROUTER_BASE_URL;
export const DEFAULT_TEXT_MODEL_ID = DEFAULT_TEXT_MODEL;
export const DEFAULT_IMAGE_MODEL_ID = DEFAULT_IMAGE_MODEL;

