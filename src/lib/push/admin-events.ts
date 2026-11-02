/** Catálogo de notificações da Central da loja (client-safe). */
export type AdminNotificationEvent =
  | "store_order.new"
  | "store_order.paid"
  | "sales_message.new"
  | "profile.new";

export type AdminNotificationDef = {
  event: AdminNotificationEvent;
  label: string;
  description: string;
  group: "Loja" | "Atendimento";
};

export const ADMIN_NOTIFICATION_CATALOG: AdminNotificationDef[] = [
  {
    event: "store_order.new",
    label: "Novos pedidos",
    description: "Sempre que um pedido é criado na loja (varejo, atacado ou personalizado).",
    group: "Loja",
  },
  {
    event: "store_order.paid",
    label: "Pagamentos aprovados",
    description: "Quando o Pix, cartão ou boleto de um pedido é confirmado.",
    group: "Loja",
  },
  {
    event: "profile.new",
    label: "Novos cadastros",
    description: "Quando um novo cliente cria conta na loja.",
    group: "Loja",
  },
  {
    event: "sales_message.new",
    label: "Mensagens do chat",
    description: "Novas mensagens recebidas de clientes no chat (Web, WhatsApp, Instagram).",
    group: "Atendimento",
  },
];

export const ADMIN_NOTIFICATION_EVENTS = ADMIN_NOTIFICATION_CATALOG.map((d) => d.event);

export function isAdminNotificationEvent(value: string): value is AdminNotificationEvent {
  return (ADMIN_NOTIFICATION_EVENTS as string[]).includes(value);
}
