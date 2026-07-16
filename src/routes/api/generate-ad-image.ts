import { createFileRoute } from "@tanstack/react-router";

// Geração de imagem via Lovable AI Gateway (google/gemini-2.5-flash-image-preview).
// Emite um único evento SSE `image_generation.completed` para manter
// compatibilidade com o helper streamImage do client.
export const Route = createFileRoute("/api/generate-ad-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { prompt: string };
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash-image-preview",
            messages: [{ role: "user", content: body.prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: Array<{
            message?: {
              images?: Array<{ image_url?: { url?: string } }>;
              content?: string;
            };
          }>;
        };

        const imgUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? "";
        // Extrai o b64 do data URL (data:image/png;base64,XXXX)
        const b64 = imgUrl.includes(",") ? imgUrl.split(",")[1] : "";
        if (!b64) {
          return new Response("IA retornou vazio", { status: 502 });
        }

        const sse =
          `event: image_generation.completed\n` +
          `data: ${JSON.stringify({ b64_json: b64 })}\n\n`;

        return new Response(sse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
