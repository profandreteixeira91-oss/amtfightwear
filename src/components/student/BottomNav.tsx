import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, QrCode, Film, User } from "lucide-react";

const items = [
  { to: "/app/home", label: "Início", icon: Home },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/checkin", label: "Check-in", icon: QrCode, primary: true },
  { to: "/app/videos", label: "Vídeos", icon: Film },
  { to: "/app/profile", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname.startsWith(it.to);
          if ("primary" in it && it.primary) {
            return (
              <li key={it.to} className="-mt-6">
                <Link
                  to={it.to}
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition active:scale-95"
                  style={{ background: "var(--sa-primary, #dc2626)" }}
                  aria-label={it.label}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
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
