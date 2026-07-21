/**
 * Helpers para status da subconta Asaas do dojo (AMT Pay).
 * Client-safe — pode ser importado em componentes.
 */

export type AsaasReadinessLevel =
  | "not_started"   // dojo nunca criou subconta nem vinculou wallet
  | "pending"       // subconta criada, aguardando processamento inicial no Asaas
  | "awaiting_docs" // subconta criada, precisa enviar KYC
  | "approved"      // subconta APROVADA e pronta para emitir
  | "linked"        // wallet externa vinculada (dono já tinha conta Asaas)
  | "rejected";     // Asaas rejeitou KYC ou encerrou a conta

export function classifyAsaasStatus(status: string | null | undefined): AsaasReadinessLevel {
  const s = String(status ?? "").toUpperCase();
  if (!s || s === "NOT_STARTED") return "not_started";
  if (s === "LINKED_EXTERNAL") return "linked";
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED" || s === "DENIED") return "rejected";
  if (s === "AWAITING_DOCUMENTS" || s === "AWAITING_DOCS" || s === "PENDING_DOCUMENTS") return "awaiting_docs";
  // PENDING, AWAITING_APPROVAL, etc.
  return "pending";
}

/**
 * O dojo pode emitir cobrança em nome próprio?
 * Só quando a subconta está APROVADA ou uma wallet externa está vinculada.
 */
export function isAsaasReady(status: string | null | undefined): boolean {
  const level = classifyAsaasStatus(status);
  return level === "approved" || level === "linked";
}

export function getAsaasStatusMeta(level: AsaasReadinessLevel): {
  label: string;
  description: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
} {
  switch (level) {
    case "approved":
      return {
        label: "Ativo",
        description: "Sua conta AMT Pay está aprovada. Cobranças emitidas em nome do seu dojo.",
        tone: "success",
      };
    case "linked":
      return {
        label: "Conta Asaas vinculada",
        description: "Você conectou uma conta Asaas própria. O split AMT (2%) é aplicado em cada cobrança.",
        tone: "success",
      };
    case "pending":
      return {
        label: "Em análise",
        description: "O Asaas está processando sua subconta. Isso geralmente leva alguns minutos.",
        tone: "info",
      };
    case "awaiting_docs":
      return {
        label: "Documentos pendentes",
        description: "Envie os documentos de KYC para liberar a emissão de cobranças em nome do dojo.",
        tone: "warning",
      };
    case "rejected":
      return {
        label: "Reprovada",
        description: "A conta foi recusada pelo Asaas. Refaça a ativação com dados corretos.",
        tone: "danger",
      };
    case "not_started":
    default:
      return {
        label: "Não ativada",
        description: "Ative o AMT Pay para receber cobranças de PIX, boleto e cartão em nome do seu dojo.",
        tone: "warning",
      };
  }
}
