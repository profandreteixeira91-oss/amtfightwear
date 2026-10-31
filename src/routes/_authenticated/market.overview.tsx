import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/market/overview")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/painel" });
  },
});
