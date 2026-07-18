import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo/app/videos")({
  head: () => ({ meta: [{ title: "Vídeos — AMT Dojo Manager" }] }),
  component: () => <Outlet />,
});
