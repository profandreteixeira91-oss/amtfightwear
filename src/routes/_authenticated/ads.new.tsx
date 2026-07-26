import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/new")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/nova" });
  },
});
