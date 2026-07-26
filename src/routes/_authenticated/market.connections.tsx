import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/market/connections")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/conexoes" });
  },
});
