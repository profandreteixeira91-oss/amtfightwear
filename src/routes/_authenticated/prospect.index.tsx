import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/prospect/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/prospect" });
  },
});
