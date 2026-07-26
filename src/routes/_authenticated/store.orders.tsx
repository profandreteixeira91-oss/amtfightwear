import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/orders")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/pedidos" });
  },
});
