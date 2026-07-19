import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/dojo/app/store/vestuario")({
  component: () => <Navigate to="/dojo/app/store/produtos" search={{ cat: "vestuario" }} replace />,
});
