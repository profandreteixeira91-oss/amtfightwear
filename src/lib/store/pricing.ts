/**
 * Regras comerciais de preço da loja AMT Fight Wear — fonte única de verdade
 * para o FRONT-END. As regras aqui são exatamente as mesmas já praticadas:
 *
 *  - Parcelamento sem juros: 10x acima de R$ 1.000 · 5x acima de R$ 600 · 3x acima de R$ 200
 *  - PIX varejo: 5% de desconto exibido na vitrine
 *  - Frete grátis: pedidos a partir de R$ 399, na opção de envio mais barata, com a
 *    loja pagando no máximo R$ 40 (acima disso, ou em outra opção, o cliente paga a diferença)
 *
 * Nenhuma regra foi alterada — apenas centralizada para evitar divergência
 * entre página de produto, carrinho, checkout e cards de vitrine.
 */

export const FREE_SHIPPING_THRESHOLD = 399;
/** O máximo de frete que a loja paga num pedido com frete grátis. */
export const FREE_SHIPPING_CAP = 40;
export const PIX_DISCOUNT_RATE = 0.05;

/** Faixas do parcelamento sem juros, pelo valor total da compra (com frete). */
export const INSTALLMENT_TIERS = [
  { min: 200, installments: 3 },
  { min: 600, installments: 5 },
  { min: 1000, installments: 10 },
] as const;

/** Número máximo de parcelas sem juros para um determinado total. */
export function maxInstallmentsFor(total: number): number {
  let n = 1;
  for (const t of INSTALLMENT_TIERS) if (total >= t.min) n = t.installments;
  return n;
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

/**
 * Quanto do frete a loja paga: nada abaixo de R$ 399; acima, o preço da opção mais
 * barata da cotação, limitado ao teto. Escolher outra opção (SEDEX, aéreo) não aumenta
 * o abatimento: o cliente paga a diferença. É a mesma conta no carrinho e no servidor.
 */
export function freeShippingDiscountFor(subtotal: number, optionPrice: number, cheapestPrice?: number | null): number {
  if (subtotal < FREE_SHIPPING_THRESHOLD || !(optionPrice > 0)) return 0;
  const covered = Math.min(cheapestPrice != null && cheapestPrice > 0 ? cheapestPrice : optionPrice, FREE_SHIPPING_CAP);
  return Math.round(Math.min(optionPrice, covered) * 100) / 100;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Valor redondo sem centavos ("R$ 399"), para textos de regra. */
export function formatMoneyShort(value: number): string {
  return formatMoney(value).replace(/,00$/, "");
}

/** Texto pronto: "10x de R$ 99,90 sem juros" / "à vista". */
export function installmentLabel(total: number): string {
  const n = maxInstallmentsFor(total);
  if (n <= 1) return "à vista";
  return `${n}x de ${formatMoney(total / n)} sem juros`;
}
