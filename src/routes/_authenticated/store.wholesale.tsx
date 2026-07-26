import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/wholesale")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/atacado" });
  },
});
