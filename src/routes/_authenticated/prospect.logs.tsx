import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/logs")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/leads/logs" });
  },
});
