import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Rota canônica da Central AMT. Redireciona para a implementação atual
 * do módulo (que já renderiza dentro do `AdminShell`).
 */
export const Route = createFileRoute("/_authenticated/admin/atacado")({
  beforeLoad: () => {
    throw redirect({ to: "/store/wholesale" });
  },
});
