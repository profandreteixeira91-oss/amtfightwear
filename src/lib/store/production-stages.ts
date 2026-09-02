/**
 * Constantes e helpers (client-safe) da Fila de Produção.
 *
 * As etapas representam o fluxo real da confecção AMT. `status` continua
 * existindo para compatibilidade com o restante do sistema, mas quem manda
 * na operação é `stage`.
 */

export const STAGES = [
  "recebido",
  "separacao",
  "corte",
  "costura",
  "bordado",
  "dtf",
  "montagem",
  "revisao",
  "embalagem",
  "expedicao",
  "finalizado",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  recebido: "Recebido",
  separacao: "Separação",
  corte: "Corte",
  costura: "Costura",
  bordado: "Bordado",
  dtf: "DTF",
  montagem: "Montagem",
  revisao: "Revisão",
  embalagem: "Embalagem",
  expedicao: "Expedição",
  finalizado: "Finalizado",
};

/** Cor de acento por etapa (tokens semânticos + escala neutra). */
export const STAGE_ACCENT: Record<Stage, string> = {
  recebido: "bg-muted text-muted-foreground border-border",
  separacao: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  corte: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  costura: "bg-primary/15 text-primary border-primary/30",
  bordado: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  dtf: "bg-fuchsia-500/15 text-fuchsia-500 border-fuchsia-500/30",
  montagem: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  revisao: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  embalagem: "bg-teal-500/15 text-teal-500 border-teal-500/30",
  expedicao: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  finalizado: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

export const isStage = (v: string): v is Stage => (STAGES as readonly string[]).includes(v);

export const nextStage = (s: Stage): Stage =>
  STAGES[Math.min(STAGES.indexOf(s) + 1, STAGES.length - 1)] as Stage;

export const prevStage = (s: Stage): Stage => STAGES[Math.max(STAGES.indexOf(s) - 1, 0)] as Stage;

export const URGENCIES = ["low", "normal", "high", "urgent"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const URGENCY_CLS: Record<Urgency, string> = {
  low: "bg-muted text-muted-foreground border-border",
  normal: "bg-sky-500/10 text-sky-500 border-sky-500/25",
  high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  urgent: "bg-destructive/15 text-destructive border-destructive/35",
};

export const URGENCY_WEIGHT: Record<Urgency, number> = { low: 0, normal: 1, high: 2, urgent: 3 };

export const ORDER_TYPES = ["retail", "wholesale", "custom", "internal", "quote"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  retail: "Loja",
  wholesale: "Atacado",
  custom: "Personalizado",
  internal: "Interno",
  quote: "Orçamento",
};

export const ORDER_TYPE_CLS: Record<OrderType, string> = {
  retail: "bg-primary/10 text-primary border-primary/25",
  wholesale: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  custom: "bg-fuchsia-500/15 text-fuchsia-500 border-fuchsia-500/30",
  internal: "bg-muted text-muted-foreground border-border",
  quote: "bg-violet-500/15 text-violet-500 border-violet-500/30",
};

/** Formata segundos em "2h 35m" / "45m" / "30s". */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(seconds ?? 0)));
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h < 24) return rest ? `${h}h ${rest}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/** Código curto usado em etiquetas, QR e busca rápida. */
export const jobCode = (id: string) => `PJ-${id.slice(0, 8).toUpperCase()}`;

/** Extrai o id/código de um payload de QR escaneado. */
export function parseScannedCode(raw: string): string {
  const value = raw.trim();
  const fromUrl = value.match(/job=([0-9a-fA-F-]{8,36})/);
  if (fromUrl?.[1]) return fromUrl[1];
  const prefixed = value.match(/^PJ[-:]?([0-9a-fA-F-]{6,36})$/);
  if (prefixed?.[1]) return prefixed[1];
  return value;
}

/** Status de pedido que NÃO devem entrar na fila de produção. */
export const CANCELLED_ORDER_STATUS = ["cancelled", "canceled", "refunded"];

/**
 * REGRA ÚNICA DE ENTRADA NA FILA DE PRODUÇÃO:
 * - pedido da loja: somente com pagamento confirmado;
 * - orçamento: somente `paid_50` ou `paid_100`.
 * Rascunho, enviado e aprovado NUNCA produzem.
 */
export const PAID_ORDER_PAYMENT_STATUS = ["paid", "approved", "received", "confirmed"];

/** Status de orçamento liberados para produção. */
export const PRODUCIBLE_QUOTE_STATUS = ["paid_50", "paid_100"];

export function isPaidOrderForProduction(order: {
  status?: string | null;
  payment_status?: string | null;
}): boolean {
  const status = String(order.status ?? "").toLowerCase();
  const pay = String(order.payment_status ?? "").toLowerCase();
  if (CANCELLED_ORDER_STATUS.includes(status) || CANCELLED_ORDER_STATUS.includes(pay)) return false;
  return PAID_ORDER_PAYMENT_STATUS.includes(pay) || PAID_ORDER_PAYMENT_STATUS.includes(status);
}

export function isProducibleQuoteStatus(status?: string | null): boolean {
  return PRODUCIBLE_QUOTE_STATUS.includes(String(status ?? "").toLowerCase());
}

/** Situação de pagamento do pedido de origem, exibida na fila de produção. */
export const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pagamento pendente",
  paid: "Pago",
  approved: "Pago",
  authorized: "Pagamento autorizado",
  in_process: "Pagamento em análise",
  in_mediation: "Pagamento em mediação",
  failed: "Pagamento não efetuado",
  rejected: "Pagamento recusado",
  refunded: "Pagamento reembolsado",
  cancelled: "Pagamento cancelado",
  canceled: "Pagamento cancelado",
};

export const paymentBadgeLabel = (s: string | null | undefined) =>
  PAYMENT_LABEL[String(s ?? "pending").toLowerCase()] ?? "Pagamento pendente";

export const paymentBadgeCls = (s: string | null | undefined) => {
  switch (String(s ?? "pending").toLowerCase()) {
    case "paid":
    case "approved":
    case "authorized":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
    case "failed":
    case "rejected":
    case "cancelled":
    case "canceled":
    case "refunded":
      return "border-destructive/35 bg-destructive/10 text-destructive";
    case "in_process":
    case "in_mediation":
      return "border-sky-500/30 bg-sky-500/10 text-sky-500";
    default:
      return "border-amber-500/35 bg-amber-500/10 text-amber-500";
  }
};

export const isPaymentPending = (s: string | null | undefined) =>
  !["paid", "approved", "authorized"].includes(String(s ?? "pending").toLowerCase());
