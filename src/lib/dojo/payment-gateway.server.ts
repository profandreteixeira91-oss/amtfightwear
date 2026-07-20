// AMT Pay v2 — Mercado Pago centralizado da AMT Fight Wear.
// Todas as cobranças (mensalidades, matrículas, avulsos) são processadas
// pela conta MP única da AMT. Este helper apenas retorna o token global.
// O split é calculado no webhook conforme dojo_split_config.

export type OwnerGateway = {
  id: string;
  owner_id: string;
  provider: "amt_pay";
  label: string;
  is_default: true;
  active: true;
};

/** Retorna o token da conta MP central da AMT. Aceita ownerId por compat. */
export async function requireOwnerMpToken(_ownerId?: string): Promise<string> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "AMT Pay indisponível: MERCADOPAGO_ACCESS_TOKEN não configurada na conta central da AMT.",
    );
  }
  return token;
}

/** Mantido apenas por compatibilidade; sempre retorna o gateway AMT Pay ativo. */
export async function getOwnerDefaultGateway(ownerId: string): Promise<OwnerGateway | null> {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return null;
  return {
    id: "amt-pay",
    owner_id: ownerId,
    provider: "amt_pay",
    label: "AMT Pay (Mercado Pago)",
    is_default: true,
    active: true,
  };
}

export async function getOwnerGatewayByProvider(
  ownerId: string,
  _provider: string,
): Promise<OwnerGateway | null> {
  return getOwnerDefaultGateway(ownerId);
}
