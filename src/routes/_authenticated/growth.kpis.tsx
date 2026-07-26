import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/growth/kpis")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/kpis" });
  },
});
