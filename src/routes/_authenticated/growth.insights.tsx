import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/growth/insights")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing" });
  },
});
