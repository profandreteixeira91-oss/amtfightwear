import { createFileRoute } from "@tanstack/react-router";

// Geração de imagem via Imagen 4 Fast (native Gemini API).
// Qualidade fotográfica muito superior ao gemini-2.5-flash-image para criativos de anúncio.
// Emite um único evento SSE `image_generation.completed` compatível com o helper streamImage.
export const Route = createFileRoute("/api/generate-ad-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          prompt: string;
          size?: string;
          aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
        };
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        // Mapeia size (ex: "1024x1024", "1080x1350") para aspectRatio suportado pelo Imagen.
        let aspectRatio = body.aspectRatio;
        if (!aspectRatio && body.size) {
          const [w, h] = body.size.split("x").map((n) => Number(n));
          if (w && h) {
            const r = w / h;
            if (r > 1.5) aspectRatio = "16:9";
            else if (r > 1.1) aspectRatio = "4:3";
            else if (r > 0.9) aspectRatio = "1:1";
            else if (r > 0.65) aspectRatio = "3:4";
            else aspectRatio = "9:16";
          }
        }
        aspectRatio = aspectRatio ?? "1:1";

        const upstream = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": key,
            },
            body: JSON.stringify({
              instances: [{ prompt: body.prompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio,
                personGeneration: "allow_adult",
              },
            }),
          },
        );

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Imagen upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
        };

        const b64 = json.predictions?.[0]?.bytesBase64Encoded ?? "";
        if (!b64) {
          return new Response("Imagen retornou vazio", { status: 502 });
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
