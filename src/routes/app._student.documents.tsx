import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/_student/documents")({
  component: () => <Outlet />,
});
