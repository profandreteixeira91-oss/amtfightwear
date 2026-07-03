import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-ad-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          prompt: string;
          size?: string;
        };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-image-2",
              prompt: body.prompt,
              size: body.size ?? "1024x1024",
              quality: "low",
              stream: true,
              partial_images: 1,
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
