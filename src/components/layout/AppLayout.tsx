import { Outlet } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { AppTopNav } from "./AppTopNav";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

export function AppLayout() {
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
