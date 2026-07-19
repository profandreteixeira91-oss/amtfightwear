import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/dojo/app/store/kimonos")({
  component: () => <Navigate to="/dojo/app/store/produtos" search={{ cat: "kimonos" }} replace />,
});
