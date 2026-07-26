import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/optimization")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/anuncios/otimizacao" });
  },
});
