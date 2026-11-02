import { createFileRoute } from "@tanstack/react-router";
import { AdminPushCard } from "@/components/store/AdminPushCard";
import { PageShell } from "@/components/common/PageShell";
import { AdminNotificationPrefsCard } from "@/components/store/AdminNotificationPrefsCard";
import { OwnerWhatsAppCard } from "@/components/store/OwnerWhatsAppCard";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Central da loja AMT" },
      {
        name: "description",
        content: "Avisos de novos pedidos no celular: push do app e WhatsApp.",
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
      title="Notificações"
      description="Receba no celular os avisos de novos pedidos, pagamentos e mensagens de clientes."
    >
      <OwnerWhatsAppCard />
      <AdminPushCard />
      <AdminNotificationPrefsCard />
    </PageShell>
  );
}
