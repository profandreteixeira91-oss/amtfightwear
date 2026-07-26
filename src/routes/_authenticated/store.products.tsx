import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/products")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admin/produtos" });
  },
});
