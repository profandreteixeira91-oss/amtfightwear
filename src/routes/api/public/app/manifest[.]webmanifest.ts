import { createFileRoute } from "@tanstack/react-router";

// Manifest do PWA do Portal do Aluno.
// White-label: cores podem ser passadas via query (?name=&primary=), permitindo
// que cada academia gere um link de instalação personalizado.
export const Route = createFileRoute("/api/public/app/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name") ?? "Portal do Aluno - AMT Dojo Manager";
        const short = (url.searchParams.get("short") ?? "Portal Aluno").slice(0, 12);
        const primary = url.searchParams.get("primary") ?? "#dc2626";
        const bg = url.searchParams.get("bg") ?? "#000000";

        const body = {
          id: "/app/",
          name,
          short_name: short,
          description: "Portal do aluno: agenda, check-in, vídeos, graduações e financeiro.",
          start_url: "/app/home",
          scope: "/app/",
          display: "standalone",
          display_override: ["standalone", "minimal-ui", "browser"],
          orientation: "portrait",
          lang: "pt-BR",
          dir: "ltr",
          background_color: bg,
          theme_color: primary,
          categories: ["sports", "education", "lifestyle"],
          prefer_related_applications: false,
          icons: [
            { src: "/student-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/student-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/student-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/student-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            { src: "/student-icon-180.png", sizes: "180x180", type: "image/png", purpose: "any" },
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
