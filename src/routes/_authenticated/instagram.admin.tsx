import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/instagram/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/instagram/admin" });
  },
});
