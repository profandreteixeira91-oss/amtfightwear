import { createFileRoute } from "@tanstack/react-router";

// Geração de imagem via OpenAI gpt-image-1.
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
        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("Missing OPENAI_API_KEY", { status: 500 });

        // Deriva aspect ratio a partir de size, se necessário.
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

        // gpt-image-1 aceita apenas: 1024x1024, 1024x1536, 1536x1024, auto.
        const size =
          aspectRatio === "1:1"
            ? "1024x1024"
            : aspectRatio === "3:4" || aspectRatio === "9:16"
            ? "1024x1536"
            : "1536x1024";

        const upstream = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: body.prompt,
            size,
            n: 1,
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "OpenAI upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          data?: Array<{ b64_json?: string }>;
        };

        const b64 = json.data?.[0]?.b64_json ?? "";
        if (!b64) {
          return new Response("OpenAI retornou vazio", { status: 502 });
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
