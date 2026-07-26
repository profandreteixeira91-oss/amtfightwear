import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/creatives")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/criativos" });
  },
});
