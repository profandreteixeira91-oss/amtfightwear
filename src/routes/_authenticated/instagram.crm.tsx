import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/instagram/crm")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/instagram/crm" });
  },
});
