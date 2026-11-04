export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "approved",
  "paid_50",
  "paid_100",
  "rejected",
  "expired",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Rótulo e cor de cada status (tela de orçamentos, CRM e ficha do cliente). */
export const QUOTE_STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
  sent: { label: "Enviado", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-700" },
  paid_50: { label: "Pago (50%)", cls: "bg-teal-100 text-teal-700" },
  paid_100: { label: "Pago (100%)", cls: "bg-green-600 text-white" },
  rejected: { label: "Recusado", cls: "bg-primary/10 text-primary" },
  expired: { label: "Expirado", cls: "bg-amber-100 text-amber-700" },
};
