import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/imagens")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/produtos/imagens" });
  },
});
