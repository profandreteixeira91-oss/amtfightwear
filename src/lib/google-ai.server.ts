import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

/**
 * Google AI Gateway — Usa GEMINI_API_KEY para processamento de texto.
 * Utilizado como fallback para o OpenRouter quando este está sem créditos.
 */

const DEFAULT_TEXT_MODEL = "gemini-1.5-flash";

export function createGoogleAi() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const google = createGoogleGenerativeAI({
    apiKey: key,
  });

  return google;
}

/**
 * Helper direto para chamadas ao Gemini.
 */
export async function googleChat(opts: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");

  const google = createGoogleAi();
  const model = opts.model ?? DEFAULT_TEXT_MODEL;

  const systemMessage = opts.messages.find(m => m.role === "system")?.content;
  const userMessages = opts.messages.filter(m => m.role !== "system").map(m => m.content).join("\n\n");

  const { text } = await generateText({
    model: google(model),
    system: systemMessage,
    prompt: userMessages,
    temperature: opts.temperature ?? 0.7,
  });

  return text;
}
