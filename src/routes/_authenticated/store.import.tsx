import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/import")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/produtos/importar" });
  },
});
