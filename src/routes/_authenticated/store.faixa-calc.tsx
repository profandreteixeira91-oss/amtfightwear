import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/faixa-calc")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/produtos/faixa-calc" });
  },
});
