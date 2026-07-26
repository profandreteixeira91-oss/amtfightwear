import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Layout unificado das rotas de Growth dentro da Central AMT.
 * Herda sidebar, guard `OwnerOnly` e chrome da AdminShell.
 */
export const Route = createFileRoute("/_authenticated/growth")({
  component: GrowthLayout,
});

function GrowthLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
