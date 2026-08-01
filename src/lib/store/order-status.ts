export const orderStatusLabel: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pago",
  preparing: "Em preparação",
  processing: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  completed: "Concluído",
  pending: "Pendente",
};

export const paymentStatusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  approved: "Aprovado",
  failed: "Não pago",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  authorized: "Autorizado",
  in_process: "Em processamento",
  in_mediation: "Em mediação",
  rejected: "Recusado",
};

export const orderStatusBadgeClass = (status: string | null | undefined) => {
  const s = String(status || "").toLowerCase();
  switch (s) {
    case "paid":
    case "completed":
    case "delivered":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "preparing":
    case "processing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300";
    case "shipped":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300";
    case "cancelled":
    case "canceled":
    case "refunded":
      return "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300";
    case "pending_payment":
    default:
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300";
  }
};

export const paymentStatusBadgeClass = (status: string | null | undefined) => {
  const s = String(status || "pending").toLowerCase();
  switch (s) {
    case "paid":
    case "approved":
    case "authorized":
      return "bg-emerald-500/15 text-emerald-700";
    case "failed":
    case "rejected":
      return "bg-red-500/15 text-red-700";
    case "refunded":
    case "cancelled":
    case "canceled":
      return "bg-slate-500/15 text-slate-700";
    case "in_process":
    case "in_mediation":
      return "bg-blue-500/15 text-blue-700";
    case "pending":
    default:
      return "bg-amber-500/15 text-amber-700";
  }
};

export const orderStatusOptions: { value: string; label: string }[] = [
  { value: "pending_payment", label: "Aguardando pagamento" },
  { value: "paid", label: "Pago" },
  { value: "preparing", label: "Em preparação" },
  { value: "processing", label: "Em produção" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

export const paymentStatusOptions: { value: string; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "failed", label: "Não pago" },
  { value: "refunded", label: "Reembolsado" },
];
