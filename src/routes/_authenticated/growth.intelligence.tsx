import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/growth/intelligence")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/inteligencia" });
  },
});
