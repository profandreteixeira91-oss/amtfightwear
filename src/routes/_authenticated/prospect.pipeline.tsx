import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/pipeline")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/leads/pipeline" });
  },
});
