import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dojo/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/dojo/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: DojoLayout,
});

const tabs = [
  { to: "/dojo/app", label: "Painel" },
  { to: "/dojo/app/students", label: "Alunos" },
  { to: "/dojo/app/graduations", label: "Graduações" },
  { to: "/dojo/app/plans", label: "Planos" },
  { to: "/dojo/app/finance", label: "Financeiro" },
  { to: "/dojo/app/units", label: "Unidades" },
  { to: "/dojo/app/certificates", label: "Certificados" },
];

function DojoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/dojo";
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AMT Dojo Manager</h1>
            <p className="text-sm text-muted-foreground">Gestão completa do dojo — alunos, graduações, financeiro e certificados.</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground shrink-0">
            Sair
          </button>
        </div>
        <nav className="flex flex-wrap gap-2 mb-6 border-b pb-2 overflow-x-auto">
          {tabs.map(t => {
            const active = t.to === "/dojo/app" ? pathname === "/dojo/app" : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
