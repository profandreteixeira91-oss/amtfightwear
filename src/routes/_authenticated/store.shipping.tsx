import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/store/shipping")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/envio" });
  },
});
