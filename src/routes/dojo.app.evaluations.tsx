import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Library, FileText, ListChecks, FolderTree,
  Dumbbell, History, Settings as SettingsIcon,
} from "lucide-react";

export const Route = createFileRoute("/dojo/app/evaluations")({
  head: () => ({ meta: [{ title: "Avaliações — AMT Dojo Manager" }] }),
  component: EvaluationsLayout,
});

const NAV = [
  { to: "/dojo/app/evaluations", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dojo/app/evaluations/library", label: "Biblioteca", icon: Library },
  { to: "/dojo/app/evaluations/templates", label: "Modelos", icon: FileText },
  { to: "/dojo/app/evaluations/sessions", label: "Avaliações", icon: ListChecks },
  { to: "/dojo/app/evaluations/categories", label: "Categorias", icon: FolderTree },
  { to: "/dojo/app/evaluations/techniques", label: "Técnicas", icon: Dumbbell },
  { to: "/dojo/app/evaluations/history", label: "Histórico", icon: History },
  { to: "/dojo/app/evaluations/settings", label: "Configurações", icon: SettingsIcon },
];

function EvaluationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 border-b pb-2 -mx-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
