import { createFileRoute, redirect } from "@tanstack/react-router";

// A visão do SaaS foi unificada em /admin/dojo (mesmos dados + aba de faturas).
// O cartão de push que existia aqui continua em /admin/notificacoes.
export const Route = createFileRoute("/_authenticated/admin/saas/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dojo" });
  },
});
