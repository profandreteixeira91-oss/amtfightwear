import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * O funil de negócios desta página virou o Pipeline comercial (/admin/crm), que usa
 * a mesma tabela (crm_deals) com as etapas do CRM. A rota continua para links antigos.
 */
export const Route = createFileRoute("/_authenticated/admin/marketing/crm-email")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/crm", replace: true });
  },
});
