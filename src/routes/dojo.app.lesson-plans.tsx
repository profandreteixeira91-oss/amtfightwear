import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Library, Dumbbell, History } from "lucide-react";

export const Route = createFileRoute("/dojo/app/lesson-plans")({
  head: () => ({
    meta: [{ title: "Planos de Aula — AMT Dojo Manager" }],
  }),
  component: LessonPlansLayout,
});

const NAV = [
  { to: "/dojo/app/lesson-plans", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/dojo/app/lesson-plans/library", label: "Biblioteca de conteúdos", icon: Library },
  { to: "/dojo/app/lesson-plans/techniques", label: "Banco de técnicas", icon: Dumbbell },
  { to: "/dojo/app/lesson-plans/history", label: "Histórico", icon: History },
];

function LessonPlansLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-4">
      <nav className="-mx-1 flex flex-wrap gap-1 border-b pb-2">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-primary font-medium text-primary-foreground"
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
