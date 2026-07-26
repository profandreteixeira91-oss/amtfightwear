import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/growth/crm")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/crm" });
  },
});
