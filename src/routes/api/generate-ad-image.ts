import { createFileRoute } from "@tanstack/react-router";

// Gemini gera a imagem completa em uma única resposta (sem partial_images).
// Emitimos um único evento SSE `image_generation.completed` para manter
// compatibilidade com o helper streamImage do client.
export const Route = createFileRoute("/api/generate-ad-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { prompt: string };
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: body.prompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          },
        );

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: { data: string };
                inline_data?: { data: string };
              }>;
            };
          }>;
        };
        const parts = json.candidates?.[0]?.content?.parts ?? [];
        const b64 = parts.map((p) => p.inlineData?.data ?? p.inline_data?.data).find(Boolean);
        if (!b64) {
          return new Response("Gemini retornou vazio", { status: 502 });
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
