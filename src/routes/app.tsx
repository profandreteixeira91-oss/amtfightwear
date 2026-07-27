import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Portal do Aluno" },
      { name: "description", content: "Portal do aluno — agenda, check-in, vídeos, graduações e financeiro." },
      { name: "theme-color", content: "#dc2626" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "manifest", href: "/api/public/app/manifest.webmanifest" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/student-icon-180.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/student-icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/student-icon-512.png" },
    ],
  }),
  ssr: false,
  component: () => (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      <Outlet />
    </div>
  ),
});
