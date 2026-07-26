import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/notificacoes" });
  },
});
