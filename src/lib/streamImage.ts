import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

export async function streamImage(
  endpoint: string,
  body: Record<string, unknown>,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  // Endpoints de geração de imagem exigem sessão autenticada (evita uso da
  // cota paga por terceiros). Anexa o bearer token da sessão atual.
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    let msg = detail;
    try {
      const j = JSON.parse(detail);
      msg = j?.error?.message ?? j?.message ?? detail;
    } catch { /* keep raw */ }
    throw new Error(`Falha ao gerar imagem (${res.status}): ${msg || "sem detalhes"}`);
  }

  let sawCompleted = false;
  let streamError: string | undefined;

  const parser = createParser({
    onEvent(event) {
      let payload: { type?: string; b64_json?: string; error?: { message?: string } } | undefined;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (event.event === "error" || payload?.type === "error") {
        streamError = payload?.error?.message ?? "Erro na geração";
        return;
      }
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      )
        return;
      if (!payload?.b64_json) return;
      const isFinal = event.event === "image_generation.completed";
      flushSync(() => {
        onFrame(`data:image/png;base64,${payload!.b64_json}`, isFinal);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (streamError) throw new Error(streamError);
  if (!sawCompleted) throw new Error("Stream finalizado sem imagem completa");
}
