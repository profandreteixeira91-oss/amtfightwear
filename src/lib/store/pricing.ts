/**
 * Regras comerciais de preço da loja AMT Fight Wear — fonte única de verdade
 * para o FRONT-END. As regras aqui são exatamente as mesmas já praticadas:
 *
 *  - Parcelamento sem juros: 10x acima de R$ 1.000 · 5x acima de R$ 600 · 3x acima de R$ 200
 *  - PIX varejo: 5% de desconto exibido na vitrine
 *  - Frete grátis: pedidos a partir de R$ 399
 *
 * Nenhuma regra foi alterada — apenas centralizada para evitar divergência
 * entre página de produto, carrinho, checkout e cards de vitrine.
 */

export const FREE_SHIPPING_THRESHOLD = 399;
export const PIX_DISCOUNT_RATE = 0.05;

/** Número máximo de parcelas sem juros para um determinado total. */
export function maxInstallmentsFor(total: number): number {
  if (total >= 1000) return 10;
  if (total >= 600) return 5;
  if (total >= 200) return 3;
  return 1;
}

/** Uma parcela do total, no número máximo de parcelas permitido. */
export function installmentValueFor(total: number, installments?: number): number {
  const n = installments ?? maxInstallmentsFor(total);
  return n > 0 ? total / n : total;
}

/** Preço à vista no PIX (5% off varejo). */
export function pixPriceFor(total: number): number {
  return total * (1 - PIX_DISCOUNT_RATE);
}

/** Economia em reais ao pagar no PIX. */
export function pixSavingsFor(total: number): number {
  return total * PIX_DISCOUNT_RATE;
}

/** Quanto falta para o frete grátis (0 quando já atingiu). */
export function missingForFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Texto pronto: "10x de R$ 99,90 sem juros" / "à vista". */
export function installmentLabel(total: number): string {
  const n = maxInstallmentsFor(total);
  if (n <= 1) return "à vista";
  return `${n}x de ${formatMoney(total / n)} sem juros`;
}
