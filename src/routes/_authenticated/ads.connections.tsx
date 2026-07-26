import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/connections")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/conexoes" });
  },
});
