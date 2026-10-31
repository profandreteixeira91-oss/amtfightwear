import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/market/content")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/marketing/conteudo" });
  },
});
