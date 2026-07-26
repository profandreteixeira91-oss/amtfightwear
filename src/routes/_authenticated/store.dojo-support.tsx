import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/dojo-support")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/saas/suporte" });
  },
});
