import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo")({
  head: () => ({
    meta: [
      { title: "AMT Dojo Manager" },
      { name: "description", content: "Sistema de gestão para academias de artes marciais." },
      { name: "theme-color", content: "#dc2626" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "manifest", href: "/api/public/dojo-manifest.webmanifest?v=3" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/dojo-icon-180.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/dojo-icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/dojo-icon-512.png" },
    ],
  }),
  component: () => <Outlet />,
});
