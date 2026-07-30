import { createFileRoute } from "@tanstack/react-router";

// Geração de imagem via Lovable AI Gateway (streaming SSE).
// Repassa o corpo SSE upstream diretamente para o helper streamImage.
export const Route = createFileRoute("/api/generate-ad-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Somente usuários autenticados podem consumir a geração de imagens
        // (protege a cota paga do gateway de IA).
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        {
          const { createClient } = await import("@supabase/supabase-js");
          const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const authClient = createClient(process.env.SUPABASE_URL!, pubKey, {
            auth: { persistSession: false },
          });
          const { data: userData, error: userErr } = await authClient.auth.getUser(token);
          if (userErr || !userData?.user) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const body = (await request.json()) as {
          prompt: string;
          size?: string;
          aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
        };
        if (typeof body?.prompt !== "string" || body.prompt.trim().length < 3 || body.prompt.length > 4000) {
          return new Response("Invalid prompt", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });


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

        // Instrução de proporção embutida no prompt (o modelo Gemini image
        // respeita descrições de aspect ratio no texto).
        const ratioHint =
          aspectRatio === "1:1"
            ? "Square 1:1 composition."
            : aspectRatio === "4:3"
            ? "Landscape 4:3 composition."
            : aspectRatio === "16:9"
            ? "Wide 16:9 composition."
            : aspectRatio === "3:4"
            ? "Portrait 3:4 composition."
            : "Vertical 9:16 composition.";

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [
                {
                  role: "user",
                  content: `${body.prompt}\n\n${ratioHint}`,
                },
              ],
              modalities: ["image", "text"],
              stream: true,
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          const parse = (s: string) => {
            try {
              const j = JSON.parse(s);
              return j?.error?.message ?? j?.message ?? s;
            } catch {
              return s;
            }
          };
          return new Response(parse(text) || "Falha no gateway de IA", {
            status: upstream.status,
          });
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
