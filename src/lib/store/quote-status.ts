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
