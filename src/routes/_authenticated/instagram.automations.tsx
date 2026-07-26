import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/instagram/automations")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/instagram/automacoes" });
  },
});
