import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo/app/videos")({
  head: () => ({
    meta: [
      { title: "Vídeos — AMT Dojo Manager" },
      { name: "description", content: "Biblioteca Ruby Noir de vídeos: organize, publique e acompanhe o conteúdo da sua academia." },
      { property: "og:title", content: "Vídeos — AMT Dojo Manager" },
      { property: "og:description", content: "Publique, categorize e monitore o consumo de vídeos com padrão premium." },
    ],
  }),
  component: () => <Outlet />,
});

