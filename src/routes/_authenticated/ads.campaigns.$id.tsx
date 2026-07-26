import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ads/campaigns/$id")({
  beforeLoad: ({ params }) => {
    const p = params as any;
    throw redirect({ to: "/admin/anuncios/campanhas/$id", params: { id: p.id } as any });
  },
});
