import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/dojo-manager")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/saas" });
  },
});
