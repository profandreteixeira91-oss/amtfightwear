import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// OpenRouter — API OpenAI-compatível (usa OPENROUTER_API_KEY).
// Modelo padrão gratuito: DeepSeek Chat v3 (:free).
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TEXT_MODEL = "deepseek/deepseek-chat-v3";
// OpenRouter/DeepSeek free não gera imagens — mantemos Gemini para imagem.
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image-preview";

// Cabeçalhos opcionais recomendados pela OpenRouter (analytics no dashboard deles).
const OPENROUTER_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://amtfightwear.com.br",
  "X-Title": "AMT Fight Wear",
};

// Normaliza ids antigos (Gemini/OpenAI) para modelos válidos do OpenRouter.
function mapModel(id: string): string {
  const clean = id.trim();
  const table: Record<string, string> = {
    // Antigos aliases Gemini → DeepSeek free
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

/**
 * Cria um provider AI SDK apontando para o OpenRouter.
 * Usa OPENROUTER_API_KEY (chave do OpenRouter configurada nos secrets).
 */
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
 * Helper direto para chamadas fetch OpenAI-compat ao OpenRouter.
 * Retorna a resposta textual do 1º choice ou lança erro tratável.
 */
export async function openrouterChat(opts: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY não configurada");

  const model = mapModel(opts.model ?? DEFAULT_TEXT_MODEL);
  // Cascata: modelo pedido → deepseek-chat-v3 (fallback).
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
    throw new Error(
      "OpenRouter atingiu limite de uso do modelo gratuito. Aguarde alguns minutos, ou configure um modelo pago.",
    );
  }
  if (lastStatus === 402) {
    throw new Error("OpenRouter: créditos insuficientes. Adicione créditos em https://openrouter.ai/credits.");
  }
  if ([500, 502, 503, 504].includes(lastStatus)) {
    throw new Error("OpenRouter temporariamente indisponível. Tente novamente em instantes.");
  }
  throw new Error(`OpenRouter ${lastStatus}: ${lastErr.slice(0, 300)}`);
}

export const LOVABLE_GATEWAY_URL = OPENROUTER_BASE_URL;
export const DEFAULT_TEXT_MODEL_ID = DEFAULT_TEXT_MODEL;
export const DEFAULT_IMAGE_MODEL_ID = DEFAULT_IMAGE_MODEL;
