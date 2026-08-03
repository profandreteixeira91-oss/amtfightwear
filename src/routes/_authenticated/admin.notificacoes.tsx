import { createFileRoute } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { AdminPushCard } from "@/components/store/AdminPushCard";
import { AdminNotificationPrefsCard } from "@/components/store/AdminNotificationPrefsCard";


export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Admin AMT Fight Wear" },
      {
        name: "description",
        content: "Ative e teste as notificações push do painel administrativo AMT Fight Wear.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StoreNotificationsPage,
});

function StoreNotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instalação & Notificações</h1>
          <p className="text-sm text-muted-foreground">
            Instale o app <strong>Admin AMT Fight Wear</strong> na tela inicial e ative alertas em
            tempo real de novos pedidos, mensagens e movimentações do Dojo Manager.
          </p>
        </div>
      </header>
      <AdminPushCard />
      <AdminNotificationPrefsCard />
    </div>

  );
}
