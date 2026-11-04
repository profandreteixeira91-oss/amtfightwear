/**
 * Definições do CRM da loja (client-safe): etapas do funil, segmentos e etiquetas.
 * As etapas espelham o CHECK de public.crm_deals.stage (migration 20261104120000).
 */

export const DEAL_STAGES = [
  { id: "novo_contato", label: "Novo contato", tone: "bg-slate-500" },
  { id: "em_atendimento", label: "Em atendimento", tone: "bg-sky-500" },
  { id: "necessidade", label: "Necessidade identificada", tone: "bg-cyan-600" },
  { id: "orcamento_preparacao", label: "Orçamento em preparação", tone: "bg-indigo-500" },
  { id: "orcamento_enviado", label: "Orçamento enviado", tone: "bg-violet-500" },
  { id: "negociacao", label: "Em negociação", tone: "bg-amber-500" },
  { id: "aguardando_pagamento", label: "Aguardando pagamento", tone: "bg-orange-500" },
  { id: "ganho", label: "Venda fechada", tone: "bg-emerald-600" },
  { id: "perdido", label: "Venda perdida", tone: "bg-rose-600" },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]["id"];
export const DEAL_STAGE_IDS = DEAL_STAGES.map((s) => s.id) as [DealStage, ...DealStage[]];
export const DEAL_STAGE_LABEL = Object.fromEntries(DEAL_STAGES.map((s) => [s.id, s.label])) as Record<DealStage, string>;
export const isClosedStage = (s: string) => s === "ganho" || s === "perdido";

export const LOST_REASONS = [
  "Preço",
  "Prazo de entrega",
  "Comprou de outro fornecedor",
  "Sem resposta",
  "Desistiu da compra",
  "Fora do perfil (produto que não fazemos)",
] as const;

export const DEAL_ORIGINS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "site", label: "Site / chat" },
  { id: "loja", label: "Loja online" },
  { id: "orcamento", label: "Orçamento" },
  { id: "prospeccao", label: "Prospecção" },
  { id: "indicacao", label: "Indicação" },
  { id: "outro", label: "Outro" },
] as const;
export const ORIGIN_LABEL: Record<string, string> = {
  ...Object.fromEntries(DEAL_ORIGINS.map((o) => [o.id, o.label])),
  chat_site: "Site / chat",
  manual: "Cadastro manual",
};

/** Etiquetas comerciais escolhidas por você (o segmento por compras é automático). */
export const CUSTOMER_TAGS = [
  { id: "academia", label: "Academia" },
  { id: "revendedor", label: "Revendedor" },
  { id: "atacado", label: "Atacado" },
  { id: "vip", label: "VIP" },
] as const;
export const TAG_LABEL: Record<string, string> = Object.fromEntries(CUSTOMER_TAGS.map((t) => [t.id, t.label]));

export const POTENTIALS = [
  { id: "baixo", label: "Baixo" },
  { id: "medio", label: "Médio" },
  { id: "alto", label: "Alto" },
] as const;

/** Sem compra há mais que isso = cliente inativo. */
export const INACTIVE_DAYS = 180;

export type SegmentKey = "lead" | "novo" | "recorrente" | "inativo";
export const SEGMENT_LABEL: Record<SegmentKey, string> = {
  lead: "Lead",
  novo: "Cliente novo",
  recorrente: "Recorrente",
  inativo: "Inativo",
};
export const SEGMENT_CLS: Record<SegmentKey, string> = {
  lead: "bg-slate-100 text-slate-700",
  novo: "bg-sky-100 text-sky-800",
  recorrente: "bg-emerald-100 text-emerald-800",
  inativo: "bg-amber-100 text-amber-900",
};

/** Segmento exibido: o do banco (por compras) ou "inativo" se a última compra é antiga. */
export function customerSegment(c: { segment: string; last_order_at: string | null }): SegmentKey {
  if (c.last_order_at && Date.now() - new Date(c.last_order_at).getTime() > INACTIVE_DAYS * 86400000) return "inativo";
  return c.segment === "recorrente" || c.segment === "novo" ? c.segment : "lead";
}

/** "A revisar": sem nenhum contato (completar) ou possível duplicado (dois telefones). */
export function reviewReason(c: {
  needs_review: boolean;
  phone_normalized: string | null;
  email_normalized: string | null;
  document: string | null;
}): "sem_contato" | "duplicado" | null {
  if (!c.needs_review) return null;
  return c.phone_normalized || c.email_normalized || c.document ? "duplicado" : "sem_contato";
}
