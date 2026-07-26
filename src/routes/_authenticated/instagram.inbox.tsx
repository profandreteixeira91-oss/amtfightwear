import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/instagram/inbox")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/instagram/inbox" });
  },
});
