import { createFileRoute } from "@tanstack/react-router";
import { DojoPushCard } from "@/components/dojo/DojoPushCard";
import { InstallAppCard } from "@/components/dojo/InstallAppCard";

export const Route = createFileRoute("/dojo/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — AMT Dojo Manager" },
      {
        name: "description",
        content:
          "Configure a instalação do Dojo Manager como aplicativo e escolha quais notificações push você quer receber em cada dispositivo.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight">Aplicativo & Notificações</h1>
        <p className="text-sm text-muted-foreground">
          Instale o Dojo Manager como app no celular ou desktop e ligue os alertas que fazem sentido para o seu dia a dia.
        </p>
      </div>
      <InstallAppCard />
      <DojoPushCard />
    </div>
  );
}
