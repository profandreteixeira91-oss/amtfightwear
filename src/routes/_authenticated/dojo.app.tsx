import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dojo/app")({
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
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AMT Dojo Manager</h1>
        <p className="text-sm text-muted-foreground">Gestão completa do dojo — alunos, graduações, financeiro e certificados.</p>
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
  );
}
