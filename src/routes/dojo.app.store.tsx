import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingCart, ClipboardList, Heart, Settings, Shirt, Award, Sparkles, Tag, Store as StoreIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dojo/app/store")({
  head: () => ({ meta: [{ title: "AMT Store — Dojo Manager" }] }),
  component: StoreLayout,
});

const nav = [
  { to: "/dojo/app/store", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dojo/app/store/produtos", label: "Produtos", icon: Package },
  { to: "/dojo/app/store/faixas", label: "Faixas", icon: Award },
  { to: "/dojo/app/store/kimonos", label: "Kimonos", icon: Shirt },
  { to: "/dojo/app/store/patches", label: "Patches", icon: Sparkles },
  { to: "/dojo/app/store/rashguards", label: "Rash Guards", icon: Tag },
  { to: "/dojo/app/store/vestuario", label: "Vestuário", icon: StoreIcon },
  { to: "/dojo/app/store/carrinho", label: "Carrinho", icon: ShoppingCart },
  { to: "/dojo/app/store/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/dojo/app/store/favoritos", label: "Favoritos", icon: Heart },
  { to: "/dojo/app/store/configuracoes", label: "Configurações", icon: Settings },
];

function StoreLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname === to || pathname.startsWith(to + "/"));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--dojo-border)] bg-gradient-to-r from-primary/90 to-primary p-5 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <StoreIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80">AMT Fight Wear</div>
            <div className="text-xl font-bold leading-tight">AMT Store</div>
            <div className="text-xs opacity-80">Compre direto pelo Dojo Manager — atacado automático, personalização e entrega para academias.</div>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-20 -mx-4 md:-mx-6 border-y border-[color:var(--dojo-border)] bg-white/95 px-4 md:px-6 py-2 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-[color:var(--dojo-border)] bg-white text-muted-foreground hover:text-foreground hover:border-[color:var(--dojo-border-strong)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
