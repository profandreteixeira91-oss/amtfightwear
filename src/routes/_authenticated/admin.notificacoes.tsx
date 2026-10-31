import { createFileRoute } from "@tanstack/react-router";
import { AdminPushCard } from "@/components/store/AdminPushCard";
import { PageShell } from "@/components/common/PageShell";
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
    <PageShell
      narrow
      eyebrow="Notificações"
      title="Instalação & Notificações"
      description={
        <>
          Instale o app <strong>Admin AMT Fight Wear</strong> na tela inicial e ative alertas em tempo real de
          novos pedidos, mensagens e movimentações do Dojo Manager.
        </>
      }
    >
      <AdminPushCard />
      <AdminNotificationPrefsCard />
    </PageShell>
  );
}
