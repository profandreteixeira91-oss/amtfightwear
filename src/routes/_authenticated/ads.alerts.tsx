import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/alerts")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/alertas" });
  },
});
