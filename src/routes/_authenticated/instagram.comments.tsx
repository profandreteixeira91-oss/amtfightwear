import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/instagram/comments")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/instagram/comentarios" });
  },
});
