import { createFileRoute, Outlet } from "@tanstack/react-router";
import { OwnerOnly } from "@/lib/auth/owner-only";

/**
 * Layout único da área administrativa da AMT Fight Wear (/store/*).
 *
 * Ponto central para:
 *  - Guard de acesso (OwnerOnly)
 *  - Chrome/tema compartilhado (futuro: sidebar, breadcrumb, filtros globais)
 *  - Loaders/contexto compartilhado entre todas as telas de admin da loja
 *
 * Todas as rotas `store.*.tsx` deste diretório são filhas deste layout e
 * herdam automaticamente o guard e o chrome definidos aqui.
 */
export const Route = createFileRoute("/_authenticated/store")({
  component: StoreAdminLayout,
});

function StoreAdminLayout() {
  return (
    <OwnerOnly>
      <Outlet />
    </OwnerOnly>
  );
}
