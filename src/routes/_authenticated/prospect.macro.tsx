import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/macro")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/leads/macro" });
  },
});
