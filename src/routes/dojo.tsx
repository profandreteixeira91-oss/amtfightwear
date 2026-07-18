import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo")({
  head: () => ({
    meta: [
      { title: "AMT Dojo Manager" },
      { name: "description", content: "Sistema de gestão para academias de artes marciais." },
    ],
  }),
  component: () => <Outlet />,
});
