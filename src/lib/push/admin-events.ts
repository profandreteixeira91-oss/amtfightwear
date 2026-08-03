/** Catálogo de notificações do painel administrativo AMT (client-safe). */
export type AdminNotificationEvent =
  | "store_order.new"
  | "store_order.paid"
  | "sales_message.new"
  | "support_message.new"
  | "dojo_support.new"
  | "profile.new"
  | "dojo_sub.new"
  | "dojo_sub.change";

export type AdminNotificationDef = {
  event: AdminNotificationEvent;
  label: string;
  description: string;
  group: "Loja" | "Atendimento" | "Dojo Manager";
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
    description: "Mensagens enviadas por clientes no chat de vendas da loja.",
    group: "Atendimento",
  },
  {
    event: "support_message.new",
    label: "Mensagens em atendimento",
    description: "Novas mensagens recebidas em tickets de suporte e atendimento técnico.",
    group: "Atendimento",
  },
  {
    event: "dojo_support.new",
    label: "Suporte do Dojo Manager",
    description: "Novos tickets e respostas enviados pelos donos de dojo.",
    group: "Atendimento",
  },
  {
    event: "dojo_sub.new",
    label: "Novas academias",
    description: "Quando uma academia inicia o trial de 14 dias no Dojo Manager.",
    group: "Dojo Manager",
  },
  {
    event: "dojo_sub.change",
    label: "Mudanças de assinatura",
    description: "Ativações, pausas, cancelamentos e inadimplência das assinaturas.",
    group: "Dojo Manager",
  },
];

export const ADMIN_NOTIFICATION_EVENTS = ADMIN_NOTIFICATION_CATALOG.map((d) => d.event);

export function isAdminNotificationEvent(value: string): value is AdminNotificationEvent {
  return (ADMIN_NOTIFICATION_EVENTS as string[]).includes(value);
}
