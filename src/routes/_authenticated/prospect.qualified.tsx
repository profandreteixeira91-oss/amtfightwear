import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/qualified")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/leads/qualificados" });
  },
});
