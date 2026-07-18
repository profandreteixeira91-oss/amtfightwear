import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dojo")({
  component: DojoLayout,
});

const tabs = [
  { to: "/dojo", label: "Painel" },
  { to: "/dojo/students", label: "Alunos" },
  { to: "/dojo/graduations", label: "Graduações" },
  { to: "/dojo/plans", label: "Planos" },
  { to: "/dojo/finance", label: "Financeiro" },
  { to: "/dojo/units", label: "Unidades" },
  { to: "/dojo/certificates", label: "Certificados" },
];

function DojoLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AMT Dojo Manager</h1>
        <p className="text-sm text-muted-foreground">Gestão completa do dojo — alunos, graduações, financeiro e certificados.</p>
      </div>
      <nav className="flex flex-wrap gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(t => {
          const active = t.to === "/dojo" ? pathname === "/dojo" : pathname.startsWith(t.to);
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
  );
}
