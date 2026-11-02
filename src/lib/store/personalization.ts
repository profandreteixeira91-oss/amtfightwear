// Produtos "Bordada Personalizada": o cliente informa o nome a ser bordado.
// Usado no client (página do produto, carrinho) e no servidor (createStoreOrder).

export const EMBROIDERY_MAX_LENGTH = 30;

const PERSONALIZED_RE = /BORDAD[AO] PERSONALIZAD[AO]/i;

export function requiresEmbroideryName(productName: string | null | undefined): boolean {
  return !!productName && PERSONALIZED_RE.test(productName);
}

/** Normaliza o texto digitado: sem quebras de linha nem espaços duplicados. */
export function normalizeEmbroideryName(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, EMBROIDERY_MAX_LENGTH);
}
