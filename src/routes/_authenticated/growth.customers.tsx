import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/growth/customers")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/clientes-growth" });
  },
});
