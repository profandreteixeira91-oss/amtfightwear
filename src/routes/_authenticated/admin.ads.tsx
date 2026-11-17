import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdsManagerProvider } from "@/components/ads-manager/AdsManagerContext";
import { AdsManagerShell } from "@/components/ads-manager/AdsManagerShell";
import { PageHeader } from "@/components/common/PageHeader";

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
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          title="Gerenciador Meta"
          description="Campanhas, conjuntos, anúncios, públicos e relatórios da Meta sem sair do painel."
        />
        <AdsManagerShell>
          <Outlet />
        </AdsManagerShell>
      </div>
    </AdsManagerProvider>
  );
}
