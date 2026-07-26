import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/chat")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/atendimento" });
  },
});
