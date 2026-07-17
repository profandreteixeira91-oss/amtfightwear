import { Outlet } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { AppTopNav } from "./AppTopNav";
import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

export function AppLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
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
