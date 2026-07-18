import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dojo/app/students")({
  component: () => <Outlet />,
});
