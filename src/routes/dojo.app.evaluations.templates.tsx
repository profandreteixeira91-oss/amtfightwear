import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo/app/evaluations/templates")({
  component: () => <Outlet />,
});
