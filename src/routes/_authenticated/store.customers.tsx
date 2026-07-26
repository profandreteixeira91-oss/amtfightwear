import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/customers")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/clientes" });
  },
});
