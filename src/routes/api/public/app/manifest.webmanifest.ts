import { createFileRoute } from "@tanstack/react-router";

// Manifest do PWA do Portal do Aluno.
// White-label: cores podem ser passadas via query (?name=&primary=), permitindo
// que cada academia gere um link de instalação personalizado.
export const Route = createFileRoute("/api/public/app/manifest/webmanifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name") ?? "Portal do Aluno";
        const short = (url.searchParams.get("short") ?? name).slice(0, 12);
        const primary = url.searchParams.get("primary") ?? "#dc2626";
        const bg = url.searchParams.get("bg") ?? "#ffffff";
        const icon = url.searchParams.get("icon") ?? "/favicon.ico";

        const body = {
          name,
          short_name: short,
          description: "Portal do aluno: agenda, check-in, vídeos, graduações e financeiro.",
          start_url: "/app/home",
          scope: "/app/",
          display: "standalone",
          orientation: "portrait",
          background_color: bg,
          theme_color: primary,
          icons: [
            { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
