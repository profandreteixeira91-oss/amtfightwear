export const PAID_SHIPPING_STATUSES = ["paid", "released", "generated", "posted", "delivered"];

export function isShippingPaid(status: string | null | undefined): boolean {
  return PAID_SHIPPING_STATUSES.includes(status || "");
}

export function assertCheckoutPaid(orders: Array<{ id: string; status: string }>, ids: string[]): void {
  if (!ids.every((id) => orders.some((o) => o.id === id && isShippingPaid(o.status)))) {
    throw new Error("O Melhor Envio ainda não confirmou o pagamento. Atualize o envio antes de tentar novamente.");
  }
}

export function labelUrl(value: unknown): string {
  if (typeof value !== "object" || value === null || !("url" in value) || typeof value.url !== "string") {
    throw new Error("A etiqueta ainda está sendo preparada pelo Melhor Envio. Aguarde e tente imprimir novamente.");
  }
  const url = new URL(value.url);
  if (url.protocol !== "https:" || !(url.hostname === "melhorenvio.com.br" || url.hostname.endsWith(".melhorenvio.com.br"))) {
    throw new Error("O Melhor Envio retornou um endereço de impressão inválido.");
  }
  return url.href;
}