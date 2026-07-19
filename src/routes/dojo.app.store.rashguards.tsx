import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/dojo/app/store/rashguards")({
  component: () => <Navigate to="/dojo/app/store/produtos" search={{ cat: "rash-guards" }} replace />,
});
