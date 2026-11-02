import { Outlet } from "@tanstack/react-router";

/**
 * Layout das rotas autenticadas. A Central da loja (/admin/*) desenha o próprio
 * chrome via AdminShell; as demais rotas autenticadas são endereços antigos que
 * só redirecionam para o admin.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen w-full bg-neutral-50">
      <Outlet />
    </div>
  );
}
