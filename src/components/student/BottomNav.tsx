import { Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import type { NavItem, Features, FeatureKey } from "@/lib/student-app/schema";

// Mapa de rotas → feature key para gate.
const ROUTE_FEATURE: Record<string, FeatureKey> = {
  "/app/agenda": "agenda",
  "/app/checkin": "checkin",
  "/app/videos": "videos",
  "/app/graduations": "graduations",
  "/app/certificates": "certificates",
  "/app/finance": "finance",
  "/app/competitions": "competitions",
  "/app/profile": "profile",
  "/app/documents": "documents",
  "/app/notifications": "news",
};

function iconFor(name: string) {
  const key = name
    .split(/[-_ ]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[key];
  return Comp ?? Icons.Circle;
}

export function BottomNav({ items, features }: { items: NavItem[]; features: Features }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const filtered = items.filter((it) => {
    if (it.route === "/app/home") return true;
    const f = ROUTE_FEATURE[it.route];
    return f ? features[f] !== false : true;
  });
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md"
      style={{
        background: "color-mix(in oklab, var(--sa-bottom-nav, #ffffff) 95%, transparent)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {filtered.map((it) => {
          const Icon = iconFor(it.icon);
          const active = pathname === it.route || (it.route !== "/app/home" && pathname.startsWith(it.route));
          if (it.primary) {
            return (
              <li key={it.id} className="-mt-6">
                <Link
                  to={it.route}
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition active:scale-95"
                  style={{ background: "var(--sa-button, var(--sa-primary, #dc2626))" }}
                  aria-label={it.label}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.id} className="flex-1">
              <Link
                to={it.route}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-[color:var(--sa-primary,#dc2626)]" : "text-neutral-500"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "text-neutral-500"}`} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
