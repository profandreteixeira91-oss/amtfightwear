import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/scale")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/escala" });
  },
});
