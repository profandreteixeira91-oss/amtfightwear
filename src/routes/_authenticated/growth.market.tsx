import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/growth/market")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/mercado" });
  },
});
