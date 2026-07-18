import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dojo")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: DojoShell,
});

function DojoShell() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70 [background:radial-gradient(1000px_500px_at_10%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_60%),radial-gradient(800px_400px_at_100%_0%,color-mix(in_oklab,var(--primary)_6%,transparent),transparent_60%)]"
      />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
