import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment, useMemo } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  settings: "Configurações",
  profile: "Perfil",
  users: "Usuários",
  logs: "Logs",
};

function labelFor(segment: string) {
  return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin">Início</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          const href = "/" + segments.slice(0, i + 1).join("/");
          return (
            <Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{labelFor(seg)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={href}>{labelFor(seg)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
