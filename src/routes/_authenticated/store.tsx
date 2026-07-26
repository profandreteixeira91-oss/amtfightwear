import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Layout único da área administrativa da AMT Fight Wear (/store/*).
 *
 * Todas as rotas `store.*.tsx` renderizam dentro da Central AMT
 * (AdminShell), herdando sidebar unificada, guard `OwnerOnly` e chrome.
 */
export const Route = createFileRoute("/_authenticated/store")({
  component: StoreAdminLayout,
});

function StoreAdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
