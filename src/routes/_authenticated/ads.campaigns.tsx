import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/campaigns")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/campanhas" });
  },
});
