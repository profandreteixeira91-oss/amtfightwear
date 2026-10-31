import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/market/crm")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/crm-email" });
  },
});
