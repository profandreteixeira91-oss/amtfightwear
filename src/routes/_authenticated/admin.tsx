import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  // PWA: troca o manifest para "Admin AMT" enquanto o usuário está em /admin
  useEffect(() => {
    if (typeof document === "undefined") return;
    const head = document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previous = link?.getAttribute("href") ?? null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      head.appendChild(link);
    }
    link.setAttribute("href", "/admin-manifest.webmanifest");

    let themeMeta = head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevTheme = themeMeta?.getAttribute("content") ?? null;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", "#dc2626");

    return () => {
      if (previous) link!.setAttribute("href", previous);
      if (prevTheme && themeMeta) themeMeta.setAttribute("content", prevTheme);
    };
  }, []);

  return (
    <OwnerOnly description="O painel administrativo da AMT Fight Wear é independente do Portal do Aluno e do Dojo Manager. Sua conta não tem permissão para acessar esta área.">
      <AdminShell>
        <Outlet />
      </AdminShell>
    </OwnerOnly>
  );
}


