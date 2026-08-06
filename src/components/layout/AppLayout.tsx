import { Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";

import { AppTopNav } from "./AppTopNav";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

/**
 * Troca o manifest do PWA para o do Admin AMT Fight Wear quando o usuário
 * está navegando dentro de /store/*. Restaura o manifest anterior ao sair.
 */
function useStoreManifestSwap() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStore = pathname.startsWith("/store");

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isStore) return;

    const head = document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previous = link?.getAttribute("href") ?? null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      head.appendChild(link);
    }
    link.setAttribute("href", "/store-manifest.webmanifest");

    let themeMeta = head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevTheme = themeMeta?.getAttribute("content") ?? null;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      head.appendChild(themeMeta);
    }
    themeMeta.setAttribute("content", "#dc2626");

    // Registra o SW (compartilhado). Kill-switch/guardas em src/lib/pwa/register.
    void import("@/lib/pwa/register").then((m) => m.registerPwa());

    return () => {
      if (previous && link) link.setAttribute("href", previous);
      if (prevTheme && themeMeta) themeMeta.setAttribute("content", prevTheme);
    };
  }, [isStore]);
}

export function AppLayout() {
  useStoreManifestSwap();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/_authenticated/admin") || pathname.includes("/fiscal");

  // Central AMT (/admin/*) gerencia seu próprio chrome via AdminShell.
  // Não renderizamos AppTopNav/AppHeader/AppFooter para evitar duplicação.
  if (isAdmin) {
    return (
      <div className="min-h-screen w-full bg-neutral-50">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      {/* Ambient background — subtle radial glow, doesn't shift layout */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70 [background:radial-gradient(1000px_500px_at_10%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_60%),radial-gradient(800px_400px_at_100%_0%,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_60%)]"
      />
      <AppTopNav />
      <AppHeader />
      <motion.main
        key="main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex-1 p-4 sm:p-6 lg:p-8"
      >
        <Outlet />
      </motion.main>
      <AppFooter />
    </div>
  );
}
