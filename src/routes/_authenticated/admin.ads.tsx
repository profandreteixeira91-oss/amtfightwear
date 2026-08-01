import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdsManagerProvider } from "@/components/ads-manager/AdsManagerContext";
import { AdsManagerShell } from "@/components/ads-manager/AdsManagerShell";

export const Route = createFileRoute("/_authenticated/admin/ads")({
  head: () => ({
    meta: [
      { title: "Gerenciador de Anúncios | AMT Fight Wear" },
      {
        name: "description",
        content:
          "Gerencie campanhas, conjuntos, anúncios, públicos e relatórios da Meta Ads dentro do painel AMT.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdsManagerLayout,
});

function AdsManagerLayout() {
  return (
    <AdsManagerProvider>
      <div className="min-w-0 space-y-4 p-4 sm:p-6">
        <header className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
            Gerenciador de Anúncios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle total das suas campanhas da Meta sem sair do painel.
          </p>
        </header>
        <AdsManagerShell>
          <Outlet />
        </AdsManagerShell>
      </div>
    </AdsManagerProvider>
  );
}
