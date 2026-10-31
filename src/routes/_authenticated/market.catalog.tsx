import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/market/catalog")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/catalogo" });
  },
});
