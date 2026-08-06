import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/leads")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/leads", search: {} });
  },
});
