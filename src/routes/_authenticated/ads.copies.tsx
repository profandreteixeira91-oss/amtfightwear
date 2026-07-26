import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/copies")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/anuncios/copies" });
  },
});
