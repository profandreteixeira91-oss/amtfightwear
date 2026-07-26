import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/search")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/leads/busca" });
  },
});
